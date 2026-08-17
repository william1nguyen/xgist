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

// GetBillingSummary returns current credit balance and subscription state
// for one user.
func (c *BillingClient) GetBillingSummary(ctx context.Context, userID uuid.UUID) (BillingSummary, error) {
	resp, err := c.client.GetBillingSummary(ctx, &billingv1.GetBillingSummaryRequest{UserId: userID.String()})
	if err != nil {
		return BillingSummary{}, fmt.Errorf("billing.GetBillingSummary: %w", err)
	}
	return toBillingSummary(resp.GetSummary()), nil
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
