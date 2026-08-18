// Package subscription owns billing accounts and subscription state
// projected from provider (Polar) events.
package subscription

import (
	"context"
	"time"

	"github.com/google/uuid"
)

// Status is the lifecycle state of a subscription.
type Status string

const (
	StatusNone     Status = "none"
	StatusActive   Status = "active"
	StatusCanceled Status = "canceled"
	StatusPastDue  Status = "past_due"
)

// Subscription is a user's current subscription, if any.
type Subscription struct {
	ID          uuid.UUID
	ProviderID  string
	Plan        string
	Status      Status
	PeriodStart *time.Time
	PeriodEnd   *time.Time
}

// Event is one Polar subscription.* webhook delivery, decoded into just
// the fields Upsert needs to project local state. UserID and
// PolarCustomerID are both required: UserID (from the checkout's metadata,
// carried through by Polar onto the subscription it produced) identifies
// whose billing_accounts row to upsert, and PolarCustomerID is stored on
// that row so a future webhook needs only the customer id, not metadata,
// to resolve back to a user.
type Event struct {
	ProviderID      string
	UserID          uuid.UUID
	PolarCustomerID string
	Plan            string
	Status          Status
	PeriodStart     *time.Time
	PeriodEnd       *time.Time
}

// Repository is the persistence boundary Service depends on. It is
// implemented by internal/store.
type Repository interface {
	// FindActiveByUserID returns the user's current subscription. ok is
	// false when the user has never subscribed.
	FindActiveByUserID(ctx context.Context, userID uuid.UUID) (sub Subscription, ok bool, err error)
	// Upsert projects a webhook-reported subscription state, creating the
	// user's billing_accounts row on first delivery if needed. Keyed by
	// ProviderID (Polar's subscription id), so redelivery of the same
	// event is a harmless no-op overwrite rather than a duplicate row.
	Upsert(ctx context.Context, in Event) error
}

// Service reads and projects subscription state.
type Service struct {
	repo Repository
}

// NewService returns a Service backed by repo.
func NewService(repo Repository) *Service {
	return &Service{repo: repo}
}

// Active returns the user's current subscription, if any.
func (s *Service) Active(ctx context.Context, userID uuid.UUID) (Subscription, bool, error) {
	return s.repo.FindActiveByUserID(ctx, userID)
}

// ApplyEvent projects a Polar subscription.* webhook event into local
// state.
func (s *Service) ApplyEvent(ctx context.Context, in Event) error {
	return s.repo.Upsert(ctx, in)
}
