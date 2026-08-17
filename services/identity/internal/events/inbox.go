package events

import (
	"context"
	"log/slog"

	"github.com/google/uuid"

	"github.com/nolannguyen1212/media-notes/services/identity/internal/account"
)

// deletionCompletionsConsumerGroup names the inbox dedup scope for
// deletion-completion events, and doubles as the Kafka consumer group.
const deletionCompletionsConsumerGroup = "identity-deletion-completions"

// CompletionEvent is a deletion-completion event published by media,
// content, conductor, or billing once their owned deletion or
// anonymization work is durable. None of those services exist yet, so
// this is a forward-compatible shape rather than one negotiated against
// a live producer.
type CompletionEvent struct {
	DeletionID uuid.UUID
	Owner      string
	Status     string // "completed" or "failed"
}

// InboxRepository deduplicates delivered events by consumer group and
// event id. It is implemented by internal/store.
type InboxRepository interface {
	// Record inserts a dedup row and reports whether it was newly
	// inserted; false means this event was already processed.
	Record(ctx context.Context, consumerGroup string, eventID uuid.UUID) (inserted bool, err error)
}

// DeletionCompleter records deletion completions. account.Service
// implements it.
type DeletionCompleter interface {
	RecordDeletionCompletion(ctx context.Context, deletionID uuid.UUID, owner string) (account.DeletionOperation, error)
}

// CompletionConsumer applies inbound deletion-completion events
// idempotently.
type CompletionConsumer struct {
	inbox   InboxRepository
	account DeletionCompleter
	logger  *slog.Logger
}

// NewCompletionConsumer returns a CompletionConsumer.
func NewCompletionConsumer(inbox InboxRepository, account DeletionCompleter, logger *slog.Logger) *CompletionConsumer {
	return &CompletionConsumer{inbox: inbox, account: account, logger: logger}
}

// Handle applies one delivered event, deduplicated by eventID. Redelivery
// of the same eventID is a no-op.
func (c *CompletionConsumer) Handle(ctx context.Context, eventID uuid.UUID, ev CompletionEvent) error {
	inserted, err := c.inbox.Record(ctx, deletionCompletionsConsumerGroup, eventID)
	if err != nil {
		return err
	}
	if !inserted {
		return nil
	}

	if ev.Status != "completed" {
		c.logger.WarnContext(ctx, "deletion completion reported non-completed status",
			"deletion_id", ev.DeletionID, "owner", ev.Owner, "status", ev.Status)
		return nil
	}

	_, err = c.account.RecordDeletionCompletion(ctx, ev.DeletionID, ev.Owner)
	return err
}
