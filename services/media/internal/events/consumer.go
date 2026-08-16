package events

import (
	"context"
	"encoding/json"
	"log/slog"

	"github.com/google/uuid"

	"github.com/nolannguyen1212/media-notes/services/media/internal/media"
)

// InboxRepository deduplicates delivered events by dedup key and topic.
// For StatusChangedTopic the dedup key is the envelope's event id; for
// AccountDeletionRequestedTopic it is identity's stable deletion_id, since
// identity's outbox payload carries no per-delivery event id and
// deletion_id is itself idempotent across redelivery and reconciler
// republishes. It is implemented by internal/store.
type InboxRepository interface {
	Record(ctx context.Context, dedupKey uuid.UUID, topic string) (inserted bool, err error)
}

// StatusApplier projects a workflow-status transition into media state.
// media.Service implements it.
type StatusApplier interface {
	ApplyWorkflowStatus(ctx context.Context, mediaID uuid.UUID, status media.Status) error
}

// AccountDeletionCascader starts media's deletion work for every media
// item owned by a deleted account and reports media's completion.
// deletion.Service implements it.
type AccountDeletionCascader interface {
	CascadeAccountDeletion(ctx context.Context, accountDeletionID, ownerID uuid.UUID) error
}

// Consumer applies inbound workflow-status and account-deletion events
// idempotently. Each application-service call writes its own
// transactional-outbox result event where one is required (deletion
// requested/completed); this consumer only deduplicates delivery and
// dispatches.
type Consumer struct {
	inbox    InboxRepository
	status   StatusApplier
	deletion AccountDeletionCascader
	logger   *slog.Logger
}

// NewConsumer returns a Consumer.
func NewConsumer(inbox InboxRepository, status StatusApplier, deletion AccountDeletionCascader, logger *slog.Logger) *Consumer {
	return &Consumer{inbox: inbox, status: status, deletion: deletion, logger: logger}
}

type statusChangedEnvelope struct {
	EventID uuid.UUID `json:"event_id"`
	MediaID uuid.UUID `json:"media_id"`
	Status  string    `json:"status"`
}

// accountDeletionEnvelope matches identity's outbox payload shape for
// DeletionRequestedTopic: {"deletion_id": ..., "user_id": ...}, with no
// per-delivery event id.
type accountDeletionEnvelope struct {
	DeletionID uuid.UUID `json:"deletion_id"`
	UserID     uuid.UUID `json:"user_id"`
}

// Handle applies one delivered event from topic. A payload that fails to
// decode is logged and skipped rather than retried forever.
func (c *Consumer) Handle(ctx context.Context, topic string, payload []byte) error {
	switch topic {
	case StatusChangedTopic:
		return c.handleStatusChanged(ctx, payload)
	case AccountDeletionRequestedTopic:
		return c.handleAccountDeletionRequested(ctx, payload)
	default:
		c.logger.WarnContext(ctx, "event from unexpected topic, skipping", "topic", topic)
		return nil
	}
}

func (c *Consumer) handleStatusChanged(ctx context.Context, payload []byte) error {
	var env statusChangedEnvelope
	if err := json.Unmarshal(payload, &env); err != nil {
		c.logger.ErrorContext(ctx, "decode status changed event, skipping", "error", err)
		return nil
	}

	inserted, err := c.inbox.Record(ctx, env.EventID, StatusChangedTopic)
	if err != nil {
		return err
	}
	if !inserted {
		return nil
	}

	return c.status.ApplyWorkflowStatus(ctx, env.MediaID, media.Status(env.Status))
}

func (c *Consumer) handleAccountDeletionRequested(ctx context.Context, payload []byte) error {
	var env accountDeletionEnvelope
	if err := json.Unmarshal(payload, &env); err != nil {
		c.logger.ErrorContext(ctx, "decode account deletion requested event, skipping", "error", err)
		return nil
	}

	inserted, err := c.inbox.Record(ctx, env.DeletionID, AccountDeletionRequestedTopic)
	if err != nil {
		return err
	}
	if !inserted {
		return nil
	}

	return c.deletion.CascadeAccountDeletion(ctx, env.DeletionID, env.UserID)
}
