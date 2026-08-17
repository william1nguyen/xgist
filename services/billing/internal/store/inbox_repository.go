package store

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

// InboxRepository implements events.InboxRepository over PostgreSQL.
type InboxRepository struct {
	pool *pgxpool.Pool
}

// NewInboxRepository returns an InboxRepository.
func NewInboxRepository(pool *pgxpool.Pool) *InboxRepository {
	return &InboxRepository{pool: pool}
}

func (r *InboxRepository) Record(ctx context.Context, eventID uuid.UUID, topic string) (bool, error) {
	tag, err := r.pool.Exec(ctx, `
		INSERT INTO billing.inbox_events (event_id, topic)
		VALUES ($1, $2)
		ON CONFLICT (event_id) DO NOTHING
	`, eventID, topic)
	if err != nil {
		return false, err
	}
	return tag.RowsAffected() > 0, nil
}
