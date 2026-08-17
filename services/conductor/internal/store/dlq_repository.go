package store

import (
	"context"
	"encoding/json"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/segmentio/kafka-go"

	"github.com/nolannguyen1212/media-notes/services/conductor/internal/events"
)

// DLQRepository implements events.DLQRepository over PostgreSQL: it
// writes directly to the outbox rather than inside a workflow
// transaction, since a non-decodable message has no workflow to tie it
// to.
type DLQRepository struct {
	pool *pgxpool.Pool
}

// NewDLQRepository returns a DLQRepository.
func NewDLQRepository(pool *pgxpool.Pool) *DLQRepository {
	return &DLQRepository{pool: pool}
}

var _ events.DLQRepository = (*DLQRepository)(nil)

func (r *DLQRepository) RecordUndecodable(ctx context.Context, msg kafka.Message, reason string) error {
	payload, err := json.Marshal(map[string]any{
		"original_topic":     msg.Topic,
		"original_partition": msg.Partition,
		"original_offset":    msg.Offset,
		"original_key":       string(msg.Key),
		"error_code":         "undecodable",
		"reason":             reason,
		"failed_at":          time.Now(),
	})
	if err != nil {
		return err
	}
	return insertOutboxEvent(ctx, r.pool, events.DLQTopic, string(msg.Key), payload)
}
