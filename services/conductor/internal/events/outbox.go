package events

import (
	"context"
	"log/slog"
	"time"

	"github.com/google/uuid"
)

// OutboxRecord is one durable event pending publication.
type OutboxRecord struct {
	ID      uuid.UUID
	Topic   string
	Key     string
	Payload []byte
}

// OutboxRepository is the persistence boundary the relay depends on. It
// is implemented by internal/store.
type OutboxRepository interface {
	ListPending(ctx context.Context, limit int) ([]OutboxRecord, error)
	MarkPublished(ctx context.Context, id uuid.UUID) error
	IncrementAttempts(ctx context.Context, id uuid.UUID) error
}

// Publisher sends one record to its topic, partitioned by key.
type Publisher interface {
	Publish(ctx context.Context, topic, key string, payload []byte) error
}

// Relay polls OutboxRepository and publishes pending records through
// Publisher, including the step.requested/status.changed/credit-command/
// DLQ/deletion-completed records every workflow.Repository method writes
// transactionally alongside its state change. It commits a record as
// published only after Publish succeeds, so a crash mid-publish is safe:
// the record is retried on the next tick.
type Relay struct {
	repo      OutboxRepository
	publisher Publisher
	logger    *slog.Logger
}

// NewRelay returns a Relay.
func NewRelay(repo OutboxRepository, publisher Publisher, logger *slog.Logger) *Relay {
	return &Relay{repo: repo, publisher: publisher, logger: logger}
}

// Run polls every interval until ctx is canceled, publishing up to
// batchSize pending records per tick.
func (r *Relay) Run(ctx context.Context, interval time.Duration, batchSize int) {
	ticker := time.NewTicker(interval)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			r.tick(ctx, batchSize)
		}
	}
}

func (r *Relay) tick(ctx context.Context, batchSize int) {
	records, err := r.repo.ListPending(ctx, batchSize)
	if err != nil {
		r.logger.ErrorContext(ctx, "list pending outbox records", "error", err)
		return
	}

	for _, rec := range records {
		if err := r.publisher.Publish(ctx, rec.Topic, rec.Key, rec.Payload); err != nil {
			r.logger.ErrorContext(ctx, "publish outbox record", "id", rec.ID, "topic", rec.Topic, "error", err)
			if incErr := r.repo.IncrementAttempts(ctx, rec.ID); incErr != nil {
				r.logger.ErrorContext(ctx, "increment outbox attempts", "id", rec.ID, "error", incErr)
			}
			continue
		}
		if err := r.repo.MarkPublished(ctx, rec.ID); err != nil {
			r.logger.ErrorContext(ctx, "mark outbox record published", "id", rec.ID, "error", err)
		}
	}
}
