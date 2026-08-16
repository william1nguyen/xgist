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

func (r *InboxRepository) Record(ctx context.Context, consumerGroup string, eventID uuid.UUID) (bool, error) {
	tag, err := r.pool.Exec(ctx, `
		INSERT INTO inbox_events (consumer_name, event_id)
		VALUES ($1, $2)
		ON CONFLICT (consumer_name, event_id) DO NOTHING
	`, consumerGroup, eventID)
	if err != nil {
		return false, err
	}
	return tag.RowsAffected() > 0, nil
}
