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

// Repository is the persistence boundary Service depends on. It is
// implemented by internal/store. Only a read path exists today: the wired
// Polar webhook handling covers credit purchase (order.created) only, not
// subscription lifecycle events, so there is no producer of subscription
// state yet. The billing.subscriptions table and this read path exist so
// GetBillingSummary has a place to report from once that producer exists.
type Repository interface {
	// FindActiveByUserID returns the user's current subscription. ok is
	// false when the user has never subscribed.
	FindActiveByUserID(ctx context.Context, userID uuid.UUID) (sub Subscription, ok bool, err error)
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
