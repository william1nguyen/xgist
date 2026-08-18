package clients

import (
	"context"
	"fmt"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"

	"github.com/google/uuid"

	billingv1 "github.com/nolannguyen1212/media-notes/contracts/gen/go/media_notes/billing/v1"
)

// BillingClient calls billing's gRPC API: quotes and billing summaries.
// Credit reservation and settlement are Kafka-only workflow mutations
// (ADR 0008); hermes never calls them directly.
type BillingClient struct {
	client billingv1.BillingServiceClient
	conn   *grpc.ClientConn
}

// NewBillingClient dials addr (billing's gRPC listener) and returns a
// BillingClient.
func NewBillingClient(addr string) (*BillingClient, error) {
	conn, err := grpc.NewClient(addr, grpc.WithTransportCredentials(insecure.NewCredentials()))
	if err != nil {
		return nil, fmt.Errorf("dial billing at %s: %w", addr, err)
	}
	return &BillingClient{client: billingv1.NewBillingServiceClient(conn), conn: conn}, nil
}

// Close closes the underlying gRPC connection.
func (c *BillingClient) Close() error {
	return c.conn.Close()
}

// GetQuote prices a set of processing options against the active catalog.
func (c *BillingClient) GetQuote(ctx context.Context, idempotencyKey string, userID uuid.UUID, options []string) (Quote, error) {
	resp, err := c.client.GetQuote(ctx, &billingv1.GetQuoteRequest{
		IdempotencyKey: idempotencyKey,
		UserId:         userID.String(),
		Options:        options,
	})
	if err != nil {
		return Quote{}, fmt.Errorf("billing.GetQuote: %w", err)
	}
	return toQuote(resp.GetQuote())
}

// GetPriceCatalog returns every priced item in the active catalog
// version — the single source of truth a client renders a price list
// from; hermes and its callers must never hardcode a price locally.
func (c *BillingClient) GetPriceCatalog(ctx context.Context) (Catalog, error) {
	resp, err := c.client.GetPriceCatalog(ctx, &billingv1.GetPriceCatalogRequest{})
	if err != nil {
		return Catalog{}, fmt.Errorf("billing.GetPriceCatalog: %w", err)
	}
	items := make([]QuoteItem, 0, len(resp.GetItems()))
	for _, item := range resp.GetItems() {
		items = append(items, QuoteItem{ItemID: item.GetItemId(), Credits: item.GetCredits()})
	}
	return Catalog{Version: resp.GetCatalogVersion(), Items: items}, nil
}

// GetBillingSummary returns current credit balance and subscription state
// for one user.
func (c *BillingClient) GetBillingSummary(ctx context.Context, userID uuid.UUID) (BillingSummary, error) {
	resp, err := c.client.GetBillingSummary(ctx, &billingv1.GetBillingSummaryRequest{UserId: userID.String()})
	if err != nil {
		return BillingSummary{}, fmt.Errorf("billing.GetBillingSummary: %w", err)
	}
	return toBillingSummary(resp.GetSummary()), nil
}

// ListCreditLedger returns a cursor-paginated page of one user's credit
// ledger entries, newest first.
func (c *BillingClient) ListCreditLedger(ctx context.Context, userID uuid.UUID, cursor string, pageSize int32) (LedgerPage, error) {
	resp, err := c.client.ListCreditLedger(ctx, &billingv1.ListCreditLedgerRequest{
		UserId:   userID.String(),
		Cursor:   cursor,
		PageSize: pageSize,
	})
	if err != nil {
		return LedgerPage{}, fmt.Errorf("billing.ListCreditLedger: %w", err)
	}
	entries := make([]LedgerEntry, 0, len(resp.GetEntries()))
	for _, e := range resp.GetEntries() {
		entries = append(entries, LedgerEntry{
			ID:        e.GetId(),
			Delta:     e.GetDelta(),
			EntryType: e.GetEntryType(),
			ItemID:    e.GetItemId(),
			CreatedAt: e.GetCreatedAt().AsTime(),
		})
	}
	return LedgerPage{Entries: entries, NextCursor: resp.GetNextCursor()}, nil
}

// ListPlans returns every subscribable plan, read live from Polar's
// product catalog by billing — hermes never hardcodes a plan list.
func (c *BillingClient) ListPlans(ctx context.Context) ([]Plan, error) {
	resp, err := c.client.ListPlans(ctx, &billingv1.ListPlansRequest{})
	if err != nil {
		return nil, fmt.Errorf("billing.ListPlans: %w", err)
	}
	plans := make([]Plan, 0, len(resp.GetPlans()))
	for _, p := range resp.GetPlans() {
		plans = append(plans, Plan{
			ID:                p.GetId(),
			Name:              p.GetName(),
			Description:       p.GetDescription(),
			PriceAmount:       p.GetPriceAmount(),
			PriceCurrency:     p.GetPriceCurrency(),
			RecurringInterval: p.GetRecurringInterval(),
			Benefits:          p.GetBenefits(),
		})
	}
	return plans, nil
}

// ListCreditPacks returns every one-time credit top-up, read live from
// Polar's product catalog by billing.
func (c *BillingClient) ListCreditPacks(ctx context.Context) ([]CreditPack, error) {
	resp, err := c.client.ListCreditPacks(ctx, &billingv1.ListCreditPacksRequest{})
	if err != nil {
		return nil, fmt.Errorf("billing.ListCreditPacks: %w", err)
	}
	packs := make([]CreditPack, 0, len(resp.GetPacks()))
	for _, p := range resp.GetPacks() {
		packs = append(packs, CreditPack{
			ID:            p.GetId(),
			Name:          p.GetName(),
			Description:   p.GetDescription(),
			Credits:       p.GetCredits(),
			PriceAmount:   p.GetPriceAmount(),
			PriceCurrency: p.GetPriceCurrency(),
		})
	}
	return packs, nil
}

// CreateCheckoutSession starts a Polar-hosted checkout for planID and
// returns the URL to redirect the caller to.
func (c *BillingClient) CreateCheckoutSession(ctx context.Context, userID uuid.UUID, userEmail, planID string) (string, error) {
	resp, err := c.client.CreateCheckoutSession(ctx, &billingv1.CreateCheckoutSessionRequest{
		UserId:    userID.String(),
		UserEmail: userEmail,
		PlanId:    planID,
	})
	if err != nil {
		return "", fmt.Errorf("billing.CreateCheckoutSession: %w", err)
	}
	return resp.GetCheckoutUrl(), nil
}

// CancelSubscription schedules the user's active subscription to end at
// the current billing period's close.
func (c *BillingClient) CancelSubscription(ctx context.Context, userID uuid.UUID) (Subscription, error) {
	resp, err := c.client.CancelSubscription(ctx, &billingv1.CancelSubscriptionRequest{UserId: userID.String()})
	if err != nil {
		return Subscription{}, fmt.Errorf("billing.CancelSubscription: %w", err)
	}
	sub := resp.GetSubscription()
	return Subscription{
		ID:          sub.GetId(),
		Plan:        sub.GetPlan(),
		Status:      billingSubscriptionStatusToString(sub.GetStatus()),
		PeriodStart: sub.GetPeriodStart().AsTime(),
		PeriodEnd:   sub.GetPeriodEnd().AsTime(),
	}, nil
}

func toQuote(q *billingv1.Quote) (Quote, error) {
	id, err := uuid.Parse(q.GetId())
	if err != nil {
		return Quote{}, fmt.Errorf("billing returned an invalid quote id: %w", err)
	}
	items := make([]QuoteItem, 0, len(q.GetItems()))
	for _, item := range q.GetItems() {
		items = append(items, QuoteItem{ItemID: item.GetItemId(), Credits: item.GetCredits()})
	}
	return Quote{
		ID:             id,
		CatalogVersion: q.GetCatalogVersion(),
		Items:          items,
		TotalCredits:   q.GetTotalCredits(),
		ExpiresAt:      q.GetExpiresAt().AsTime(),
	}, nil
}

func toBillingSummary(s *billingv1.BillingSummary) BillingSummary {
	out := BillingSummary{
		AvailableCredits: s.GetAvailableCredits(),
		ReservedCredits:  s.GetReservedCredits(),
	}
	if sub := s.GetSubscription(); sub != nil {
		out.Subscription = &Subscription{
			ID:          sub.GetId(),
			Plan:        sub.GetPlan(),
			Status:      billingSubscriptionStatusToString(sub.GetStatus()),
			PeriodStart: sub.GetPeriodStart().AsTime(),
			PeriodEnd:   sub.GetPeriodEnd().AsTime(),
		}
	}
	return out
}

func billingSubscriptionStatusToString(s billingv1.SubscriptionStatus) string {
	switch s {
	case billingv1.SubscriptionStatus_SUBSCRIPTION_STATUS_NONE:
		return "none"
	case billingv1.SubscriptionStatus_SUBSCRIPTION_STATUS_ACTIVE:
		return "active"
	case billingv1.SubscriptionStatus_SUBSCRIPTION_STATUS_CANCELED:
		return "canceled"
	case billingv1.SubscriptionStatus_SUBSCRIPTION_STATUS_PAST_DUE:
		return "past_due"
	default:
		return "unspecified"
	}
}
