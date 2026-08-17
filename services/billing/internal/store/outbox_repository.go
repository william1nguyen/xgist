package store

import (
	"context"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/nolannguyen1212/media-notes/services/billing/internal/events"
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
		FROM billing.outbox_events
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
		UPDATE billing.outbox_events SET published_at = now() WHERE id = $1
	`, id)
	return err
}

func (r *OutboxRepository) IncrementAttempts(ctx context.Context, id uuid.UUID) error {
	_, err := r.pool.Exec(ctx, `
		UPDATE billing.outbox_events SET attempts = attempts + 1 WHERE id = $1
	`, id)
	return err
}

// insertOutboxEvent writes one outbox record as part of the caller's
// transaction (or pool, outside a transaction). Used by credit_repository
// and quote_repository to publish alongside their state change atomically.
func insertOutboxEvent(ctx context.Context, q querier, topic, key string, payload []byte) error {
	_, err := q.Exec(ctx, `
		INSERT INTO billing.outbox_events (id, topic, event_key, payload)
		VALUES ($1, $2, $3, $4)
	`, uuid.New(), topic, key, payload)
	return err
}
