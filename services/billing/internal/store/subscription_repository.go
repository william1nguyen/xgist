package store

import (
	"context"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/nolannguyen1212/media-notes/services/billing/internal/subscription"
)

// SubscriptionRepository implements subscription.Repository over
// PostgreSQL.
type SubscriptionRepository struct {
	pool *pgxpool.Pool
}

// NewSubscriptionRepository returns a SubscriptionRepository.
func NewSubscriptionRepository(pool *pgxpool.Pool) *SubscriptionRepository {
	return &SubscriptionRepository{pool: pool}
}

func (r *SubscriptionRepository) FindActiveByUserID(ctx context.Context, userID uuid.UUID) (subscription.Subscription, bool, error) {
	row := r.pool.QueryRow(ctx, `
		SELECT s.id, s.provider_id, s.plan, s.status, s.period_start, s.period_end
		FROM billing.subscriptions s
		JOIN billing.billing_accounts a ON a.id = s.billing_account_id
		WHERE a.user_id = $1
		ORDER BY s.period_start DESC NULLS LAST
		LIMIT 1
	`, userID)

	var sub subscription.Subscription
	var status string
	err := row.Scan(&sub.ID, &sub.ProviderID, &sub.Plan, &status, &sub.PeriodStart, &sub.PeriodEnd)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return subscription.Subscription{}, false, nil
		}
		return subscription.Subscription{}, false, err
	}
	sub.Status = subscription.Status(status)
	return sub, true, nil
}
