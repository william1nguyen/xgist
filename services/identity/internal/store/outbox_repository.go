package store

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/nolannguyen1212/media-notes/services/identity/internal/events"
)

// OutboxRepository implements events.OutboxRepository over PostgreSQL.
type OutboxRepository struct {
	pool *pgxpool.Pool
}

// NewOutboxRepository returns an OutboxRepository.
func NewOutboxRepository(pool *pgxpool.Pool) *OutboxRepository {
	return &OutboxRepository{pool: pool}
}

func (r *OutboxRepository) ListPending(ctx context.Context, limit int) ([]events.OutboxRecord, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, topic, event_key, payload
		FROM outbox_events
		WHERE published_at IS NULL
		ORDER BY created_at ASC
		LIMIT $1
	`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var records []events.OutboxRecord
	for rows.Next() {
		var rec events.OutboxRecord
		if err := rows.Scan(&rec.ID, &rec.Topic, &rec.Key, &rec.Payload); err != nil {
			return nil, err
		}
		records = append(records, rec)
	}
	return records, rows.Err()
}

func (r *OutboxRepository) MarkPublished(ctx context.Context, id uuid.UUID) error {
	_, err := r.pool.Exec(ctx, `
		UPDATE outbox_events SET published_at = now() WHERE id = $1
	`, id)
	return err
}

func (r *OutboxRepository) IncrementAttempts(ctx context.Context, id uuid.UUID) error {
	_, err := r.pool.Exec(ctx, `
		UPDATE outbox_events SET attempts = attempts + 1 WHERE id = $1
	`, id)
	return err
}
