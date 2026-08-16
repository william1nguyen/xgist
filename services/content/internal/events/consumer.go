package events

import (
	"context"
	"encoding/json"
	"log/slog"

	"github.com/google/uuid"
)

// InboxRepository deduplicates delivered events by dedup key and topic.
// For DeletionRequestedTopic the dedup key is media's stable deletion_id,
// not the envelope's per-delivery event_id: media's reconciler republishes
// the same deletion_id for an overdue operation, and that republish must
// not re-run content's deletion work. It is implemented by internal/store.
type InboxRepository interface {
	Record(ctx context.Context, dedupKey uuid.UUID, topic string) (inserted bool, err error)
}

// DeletionHandler applies content's participant role in one media item's
// deletion. deletion.Service implements it.
type DeletionHandler interface {
	HandleDeletionRequested(ctx context.Context, deletionID, mediaID uuid.UUID) error
}

// Consumer applies inbound deletion-requested events idempotently. The
// deletion application service writes its own transactional-outbox
// completion event; this consumer only deduplicates delivery and
// dispatches.
type Consumer struct {
	inbox    InboxRepository
	deletion DeletionHandler
	logger   *slog.Logger
}

// NewConsumer returns a Consumer.
func NewConsumer(inbox InboxRepository, deletion DeletionHandler, logger *slog.Logger) *Consumer {
	return &Consumer{inbox: inbox, deletion: deletion, logger: logger}
}

// deletionRequestedEnvelope matches media's outbox payload shape for
// DeletionRequestedTopic: {"event_id":..., "deletion_id":..., "media_id":
// ..., "owner_id":...}.
type deletionRequestedEnvelope struct {
	DeletionID uuid.UUID `json:"deletion_id"`
	MediaID    uuid.UUID `json:"media_id"`
}

// Handle applies one delivered event from topic. A payload that fails to
// decode is logged and skipped rather than retried forever.
func (c *Consumer) Handle(ctx context.Context, topic string, payload []byte) error {
	switch topic {
	case DeletionRequestedTopic:
		return c.handleDeletionRequested(ctx, payload)
	default:
		c.logger.WarnContext(ctx, "event from unexpected topic, skipping", "topic", topic)
		return nil
	}
}

func (c *Consumer) handleDeletionRequested(ctx context.Context, payload []byte) error {
	var env deletionRequestedEnvelope
	if err := json.Unmarshal(payload, &env); err != nil {
		c.logger.ErrorContext(ctx, "decode deletion requested event, skipping", "error", err)
		return nil
	}

	inserted, err := c.inbox.Record(ctx, env.DeletionID, DeletionRequestedTopic)
	if err != nil {
		return err
	}
	if !inserted {
		return nil
	}

	return c.deletion.HandleDeletionRequested(ctx, env.DeletionID, env.MediaID)
}
