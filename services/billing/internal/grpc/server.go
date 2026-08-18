// Package grpcserver adapts billing's quote, credit, and subscription
// application services to the generated BillingServiceServer contract:
// request/response mapping and domain-error-to-gRPC-status translation.
// Only GetQuote and GetBillingSummary are exposed here; credit reservation
// and settlement are workflow mutations that enter through Kafka commands,
// per docs/services/billing.md.
package grpcserver

import (
	"context"
	"errors"
	"sort"

	"github.com/google/uuid"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
	"google.golang.org/protobuf/types/known/timestamppb"

	billingv1 "github.com/nolannguyen1212/media-notes/contracts/gen/go/media_notes/billing/v1"
	"github.com/nolannguyen1212/media-notes/services/billing/internal/credit"
	"github.com/nolannguyen1212/media-notes/services/billing/internal/provider"
	"github.com/nolannguyen1212/media-notes/services/billing/internal/quote"
	"github.com/nolannguyen1212/media-notes/services/billing/internal/subscription"
)

// QuoteService is the quote application-service boundary the server
// depends on. *quote.Service implements it.
type QuoteService interface {
	GetQuote(ctx context.Context, userID uuid.UUID, options []string) (quote.Quote, error)
	ActiveCatalog(ctx context.Context) (quote.Catalog, error)
}

// BalanceReader is the credit application-service boundary the server
// depends on. *credit.Service implements it.
type BalanceReader interface {
	GetBalance(ctx context.Context, userID uuid.UUID) (credit.Balance, error)
	ListLedgerEntries(ctx context.Context, userID uuid.UUID, cursor string, pageSize int) (credit.LedgerPage, error)
}

// SubscriptionReader is the subscription application-service boundary the
// server depends on. *subscription.Service implements it.
type SubscriptionReader interface {
	Active(ctx context.Context, userID uuid.UUID) (subscription.Subscription, bool, error)
}

// PlanCatalog is the outbound Polar API boundary the server depends on for
// checkout, plan listing, and cancellation. *provider.PolarClient
// implements it.
type PlanCatalog interface {
	ListPlans(ctx context.Context) ([]provider.Plan, error)
	ListCreditPacks(ctx context.Context) ([]provider.CreditPack, error)
	CreateCheckout(ctx context.Context, productID, successURL, customerEmail string, metadata map[string]string) (string, error)
	CancelAtPeriodEnd(ctx context.Context, subscriptionID string) error
}

// Server implements billingv1.BillingServiceServer.
type Server struct {
	billingv1.UnimplementedBillingServiceServer
	quotes        QuoteService
	balances      BalanceReader
	subscriptions SubscriptionReader
	plans         PlanCatalog
	successURL    string
}

// NewServer returns a Server. successURL is where Polar redirects the
// user after a successful checkout.
func NewServer(quotes QuoteService, balances BalanceReader, subscriptions SubscriptionReader, plans PlanCatalog, successURL string) *Server {
	return &Server{quotes: quotes, balances: balances, subscriptions: subscriptions, plans: plans, successURL: successURL}
}

func (s *Server) GetQuote(ctx context.Context, req *billingv1.GetQuoteRequest) (*billingv1.GetQuoteResponse, error) {
	userID, err := uuid.Parse(req.GetUserId())
	if err != nil {
		return nil, status.Error(codes.InvalidArgument, "user_id must be a UUID")
	}
	if len(req.GetOptions()) == 0 {
		return nil, status.Error(codes.InvalidArgument, "options must not be empty")
	}

	q, err := s.quotes.GetQuote(ctx, userID, req.GetOptions())
	if err != nil {
		return nil, mapError(err)
	}
	return &billingv1.GetQuoteResponse{Quote: toProtoQuote(q)}, nil
}

func (s *Server) GetPriceCatalog(ctx context.Context, req *billingv1.GetPriceCatalogRequest) (*billingv1.GetPriceCatalogResponse, error) {
	catalog, err := s.quotes.ActiveCatalog(ctx)
	if err != nil {
		return nil, mapError(err)
	}

	itemIDs := make([]string, 0, len(catalog.Prices))
	for itemID := range catalog.Prices {
		itemIDs = append(itemIDs, itemID)
	}
	sort.Strings(itemIDs)

	items := make([]*billingv1.QuoteItem, 0, len(itemIDs))
	for _, itemID := range itemIDs {
		// Priced the same way GetQuote prices a lone selection of itemID
		// (via quote.Price), not read straight off catalog.Prices: some
		// items have a forced dependency (generate_audio_summary implies
		// summarize) that must be reflected here too, or the catalog would
		// advertise a price GetQuote never actually charges.
		_, total, err := quote.Price(catalog, []string{itemID})
		if err != nil {
			return nil, mapError(err)
		}
		items = append(items, &billingv1.QuoteItem{ItemId: itemID, Credits: total})
	}
	return &billingv1.GetPriceCatalogResponse{CatalogVersion: catalog.Version, Items: items}, nil
}

func (s *Server) GetBillingSummary(ctx context.Context, req *billingv1.GetBillingSummaryRequest) (*billingv1.GetBillingSummaryResponse, error) {
	userID, err := uuid.Parse(req.GetUserId())
	if err != nil {
		return nil, status.Error(codes.InvalidArgument, "user_id must be a UUID")
	}

	balance, err := s.balances.GetBalance(ctx, userID)
	if err != nil {
		return nil, mapError(err)
	}

	summary := &billingv1.BillingSummary{
		UserId:           userID.String(),
		AvailableCredits: balance.Available,
		ReservedCredits:  balance.Reserved,
	}

	sub, ok, err := s.subscriptions.Active(ctx, userID)
	if err != nil {
		return nil, mapError(err)
	}
	if ok {
		summary.Subscription = toProtoSubscription(sub)
	}

	return &billingv1.GetBillingSummaryResponse{Summary: summary}, nil
}

func (s *Server) ListCreditLedger(ctx context.Context, req *billingv1.ListCreditLedgerRequest) (*billingv1.ListCreditLedgerResponse, error) {
	userID, err := uuid.Parse(req.GetUserId())
	if err != nil {
		return nil, status.Error(codes.InvalidArgument, "user_id must be a UUID")
	}

	page, err := s.balances.ListLedgerEntries(ctx, userID, req.GetCursor(), int(req.GetPageSize()))
	if err != nil {
		return nil, mapError(err)
	}

	entries := make([]*billingv1.LedgerEntry, 0, len(page.Entries))
	for _, e := range page.Entries {
		entries = append(entries, &billingv1.LedgerEntry{
			Id:        e.ID.String(),
			Delta:     e.Delta,
			EntryType: e.EntryType,
			ItemId:    e.ItemID,
			CreatedAt: timestamppb.New(e.CreatedAt),
		})
	}
	return &billingv1.ListCreditLedgerResponse{Entries: entries, NextCursor: page.NextCursor}, nil
}

func (s *Server) ListPlans(ctx context.Context, req *billingv1.ListPlansRequest) (*billingv1.ListPlansResponse, error) {
	plans, err := s.plans.ListPlans(ctx)
	if err != nil {
		return nil, status.Error(codes.Unavailable, "could not reach the plan catalog")
	}

	out := make([]*billingv1.Plan, 0, len(plans))
	for _, p := range plans {
		out = append(out, &billingv1.Plan{
			Id:                p.ID,
			Name:              p.Name,
			Description:       p.Description,
			PriceAmount:       p.PriceAmount,
			PriceCurrency:     p.PriceCurrency,
			RecurringInterval: p.RecurringInterval,
			Benefits:          p.Benefits,
		})
	}
	return &billingv1.ListPlansResponse{Plans: out}, nil
}

func (s *Server) ListCreditPacks(ctx context.Context, req *billingv1.ListCreditPacksRequest) (*billingv1.ListCreditPacksResponse, error) {
	packs, err := s.plans.ListCreditPacks(ctx)
	if err != nil {
		return nil, status.Error(codes.Unavailable, "could not reach the credit pack catalog")
	}

	out := make([]*billingv1.CreditPack, 0, len(packs))
	for _, p := range packs {
		out = append(out, &billingv1.CreditPack{
			Id:            p.ID,
			Name:          p.Name,
			Description:   p.Description,
			Credits:       p.Credits,
			PriceAmount:   p.PriceAmount,
			PriceCurrency: p.PriceCurrency,
		})
	}
	return &billingv1.ListCreditPacksResponse{Packs: out}, nil
}

func (s *Server) CreateCheckoutSession(ctx context.Context, req *billingv1.CreateCheckoutSessionRequest) (*billingv1.CreateCheckoutSessionResponse, error) {
	userID, err := uuid.Parse(req.GetUserId())
	if err != nil {
		return nil, status.Error(codes.InvalidArgument, "user_id must be a UUID")
	}
	if req.GetPlanId() == "" {
		return nil, status.Error(codes.InvalidArgument, "plan_id is required")
	}
	if req.GetUserEmail() == "" {
		return nil, status.Error(codes.InvalidArgument, "user_email is required")
	}

	checkoutURL, err := s.plans.CreateCheckout(ctx, req.GetPlanId(), s.successURL, req.GetUserEmail(), map[string]string{
		"userId": userID.String(),
	})
	if err != nil {
		return nil, status.Error(codes.Unavailable, "could not start checkout")
	}
	return &billingv1.CreateCheckoutSessionResponse{CheckoutUrl: checkoutURL}, nil
}

func (s *Server) CancelSubscription(ctx context.Context, req *billingv1.CancelSubscriptionRequest) (*billingv1.CancelSubscriptionResponse, error) {
	userID, err := uuid.Parse(req.GetUserId())
	if err != nil {
		return nil, status.Error(codes.InvalidArgument, "user_id must be a UUID")
	}

	sub, ok, err := s.subscriptions.Active(ctx, userID)
	if err != nil {
		return nil, mapError(err)
	}
	if !ok || sub.Status != subscription.StatusActive {
		return nil, status.Error(codes.FailedPrecondition, "no active subscription to cancel")
	}

	if err := s.plans.CancelAtPeriodEnd(ctx, sub.ProviderID); err != nil {
		return nil, status.Error(codes.Unavailable, "could not cancel subscription")
	}
	// The local row still reads "active" until Polar's subsequent webhook
	// reports the cancellation — see PolarClient.CancelAtPeriodEnd.
	return &billingv1.CancelSubscriptionResponse{Subscription: toProtoSubscription(sub)}, nil
}

func mapError(err error) error {
	switch {
	case errors.Is(err, quote.ErrEmptyOptions),
		errors.Is(err, quote.ErrUnknownItem),
		errors.Is(err, quote.ErrDuplicateItem):
		return status.Error(codes.InvalidArgument, err.Error())
	case errors.Is(err, quote.ErrNotFound):
		return status.Error(codes.NotFound, err.Error())
	case errors.Is(err, quote.ErrExpired):
		return status.Error(codes.FailedPrecondition, err.Error())
	default:
		// Do not leak internal error detail across the gRPC boundary;
		// the logging interceptor records the real error server-side.
		return status.Error(codes.Internal, "internal error")
	}
}

func toProtoQuote(q quote.Quote) *billingv1.Quote {
	items := make([]*billingv1.QuoteItem, 0, len(q.Items))
	for _, item := range q.Items {
		items = append(items, &billingv1.QuoteItem{ItemId: item.ItemID, Credits: item.Credits})
	}
	return &billingv1.Quote{
		Id:             q.ID.String(),
		UserId:         q.UserID.String(),
		CatalogVersion: q.CatalogVersion,
		Items:          items,
		TotalCredits:   q.TotalCredits,
		ExpiresAt:      timestamppb.New(q.ExpiresAt),
		CreatedAt:      timestamppb.New(q.CreatedAt),
	}
}

func toProtoSubscription(sub subscription.Subscription) *billingv1.Subscription {
	out := &billingv1.Subscription{
		Id:     sub.ID.String(),
		Plan:   sub.Plan,
		Status: toProtoSubscriptionStatus(sub.Status),
	}
	if sub.PeriodStart != nil {
		out.PeriodStart = timestamppb.New(*sub.PeriodStart)
	}
	if sub.PeriodEnd != nil {
		out.PeriodEnd = timestamppb.New(*sub.PeriodEnd)
	}
	return out
}

func toProtoSubscriptionStatus(s subscription.Status) billingv1.SubscriptionStatus {
	switch s {
	case subscription.StatusNone:
		return billingv1.SubscriptionStatus_SUBSCRIPTION_STATUS_NONE
	case subscription.StatusActive:
		return billingv1.SubscriptionStatus_SUBSCRIPTION_STATUS_ACTIVE
	case subscription.StatusCanceled:
		return billingv1.SubscriptionStatus_SUBSCRIPTION_STATUS_CANCELED
	case subscription.StatusPastDue:
		return billingv1.SubscriptionStatus_SUBSCRIPTION_STATUS_PAST_DUE
	default:
		return billingv1.SubscriptionStatus_SUBSCRIPTION_STATUS_UNSPECIFIED
	}
}
