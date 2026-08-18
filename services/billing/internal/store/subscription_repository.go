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

// Upsert projects in into billing.billing_accounts and billing.subscriptions,
// creating the account row on the user's first-ever subscription event.
// Idempotent per in.ProviderID: a redelivered event overwrites the same
// row with the same values instead of inserting a duplicate.
func (r *SubscriptionRepository) Upsert(ctx context.Context, in subscription.Event) error {
	return withTx(ctx, r.pool, func(ctx context.Context, tx pgx.Tx) error {
		var accountID uuid.UUID
		err := tx.QueryRow(ctx, `
			INSERT INTO billing.billing_accounts (id, user_id, polar_customer_id, status)
			VALUES ($1, $2, $3, 'active')
			ON CONFLICT (user_id) DO UPDATE SET polar_customer_id = EXCLUDED.polar_customer_id
			RETURNING id
		`, uuid.New(), in.UserID, in.PolarCustomerID).Scan(&accountID)
		if err != nil {
			return err
		}

		_, err = tx.Exec(ctx, `
			INSERT INTO billing.subscriptions
				(id, billing_account_id, provider_id, plan, status, period_start, period_end, updated_at)
			VALUES ($1, $2, $3, $4, $5, $6, $7, now())
			ON CONFLICT (provider_id) DO UPDATE SET
				plan = EXCLUDED.plan,
				status = EXCLUDED.status,
				period_start = EXCLUDED.period_start,
				period_end = EXCLUDED.period_end,
				updated_at = now()
		`, uuid.New(), accountID, in.ProviderID, in.Plan, string(in.Status), in.PeriodStart, in.PeriodEnd)
		return err
	})
}
