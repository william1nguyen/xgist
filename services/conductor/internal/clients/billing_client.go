package clients

import (
	"context"
	"fmt"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"

	billingv1 "github.com/nolannguyen1212/media-notes/contracts/gen/go/media_notes/billing/v1"
	"github.com/nolannguyen1212/media-notes/services/conductor/internal/workflow"

	"github.com/google/uuid"
)

// BillingClient calls billing's gRPC API. It implements
// workflow.BillingClient.
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

// GetQuote implements workflow.BillingClient.
func (c *BillingClient) GetQuote(ctx context.Context, userID uuid.UUID, options []string, idempotencyKey string) (uuid.UUID, error) {
	resp, err := c.client.GetQuote(ctx, &billingv1.GetQuoteRequest{
		IdempotencyKey: idempotencyKey,
		UserId:         userID.String(),
		Options:        options,
	})
	if err != nil {
		return uuid.Nil, fmt.Errorf("billing.GetQuote: %w", err)
	}
	quoteID, err := uuid.Parse(resp.GetQuote().GetId())
	if err != nil {
		return uuid.Nil, fmt.Errorf("billing.GetQuote returned an invalid quote id: %w", err)
	}
	return quoteID, nil
}

var _ workflow.BillingClient = (*BillingClient)(nil)
