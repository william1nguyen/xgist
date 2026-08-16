package store

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"
)

// ProviderEventRepository implements provider.EventRepository over
// PostgreSQL. It is a best-effort audit log: see the comment on
// provider.EventRepository for why recording is not the idempotency gate.
type ProviderEventRepository struct {
	pool *pgxpool.Pool
}

// NewProviderEventRepository returns a ProviderEventRepository.
func NewProviderEventRepository(pool *pgxpool.Pool) *ProviderEventRepository {
	return &ProviderEventRepository{pool: pool}
}

func (r *ProviderEventRepository) Record(ctx context.Context, providerEventID, eventType string, payload []byte) error {
	_, err := r.pool.Exec(ctx, `
		INSERT INTO billing.webhook_events (provider_event_id, event_type, payload, processed_at)
		VALUES ($1, $2, $3, now())
		ON CONFLICT (provider_event_id) DO NOTHING
	`, providerEventID, eventType, payload)
	return err
}
