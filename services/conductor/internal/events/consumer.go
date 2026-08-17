package events

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"

	"github.com/google/uuid"
	"github.com/segmentio/kafka-go"

	"github.com/nolannguyen1212/media-notes/services/conductor/internal/workflow"
)

// InboxRepository deduplicates delivered messages by dedup key and topic.
// It is implemented by internal/store. For DeletionRequestedTopic the
// dedup key is media's stable deletion_id, not the envelope's
// per-delivery event_id — mirroring content's own inbox, since media's
// reconciler republishes the same deletion_id (with a fresh event_id) for
// an overdue operation, and that republish must not re-cancel an
// already-canceled workflow. Every other topic dedups by event_id.
type InboxRepository interface {
	Record(ctx context.Context, dedupKey uuid.UUID, topic string) (inserted bool, err error)
}

// DLQRepository records a Kafka record ADR 0003 requires preserving:
// non-decodable payloads land here directly (there is no workflow to
// apply them to); a step's own exhausted-retry DLQ record is written by
// workflow.Repository.FailStep in the same transaction as the terminal
// failure, using the Source* fields on workflow.StepFailure.
type DLQRepository interface {
	RecordUndecodable(ctx context.Context, msg kafka.Message, reason string) error
}

// WorkflowHandler is the subset of workflow.Service's methods Consumer
// dispatches to. *workflow.Service implements it.
type WorkflowHandler interface {
	StartWorkflow(ctx context.Context, req workflow.ProcessingRequested) error
	HandleCreditReserved(ctx context.Context, eventID, workflowID uuid.UUID, accepted bool) error
	HandleStepCompleted(ctx context.Context, in workflow.StepCompletion) error
	HandleStepFailed(ctx context.Context, in workflow.StepFailure) error
	HandleDerivativeReady(ctx context.Context, mediaID uuid.UUID, derivativeType string) error
	HandleDeletionRequested(ctx context.Context, deletionID, mediaID uuid.UUID) error
}

// Consumer applies every inbound message conductor consumes, idempotently.
type Consumer struct {
	inbox    InboxRepository
	dlq      DLQRepository
	workflow WorkflowHandler
	logger   *slog.Logger
}

// NewConsumer returns a Consumer.
func NewConsumer(inbox InboxRepository, dlq DLQRepository, wf WorkflowHandler, logger *slog.Logger) *Consumer {
	return &Consumer{inbox: inbox, dlq: dlq, workflow: wf, logger: logger}
}

type processingRequestedEnvelope struct {
	EventID uuid.UUID `json:"event_id"`
	MediaID uuid.UUID `json:"media_id"`
	Options []string  `json:"options"`
}

// deletionRequestedEnvelope matches media's outbox payload shape for
// DeletionRequestedTopic.
type deletionRequestedEnvelope struct {
	DeletionID uuid.UUID `json:"deletion_id"`
	MediaID    uuid.UUID `json:"media_id"`
}

// stepCompletedEnvelope matches content's publishStepCompleted payload
// shape (services/content/internal/store/content_repository.go). Subtype
// and Version are not used by conductor: content's schema allows more
// than one summary/note/audio instance per media item, but the current
// processing options are single-instance flags, so conductor tracks one
// workflow step per Step value.
type stepCompletedEnvelope struct {
	EventID    uuid.UUID `json:"event_id"`
	MediaID    uuid.UUID `json:"media_id"`
	WorkflowID uuid.UUID `json:"workflow_id"`
	Step       string    `json:"step"`
	Attempt    int       `json:"attempt"`
}

// stepFailedEnvelope is the contract conductor-worker publishes to
// StepFailedTopic (worker.md: "On failure emit only classified small
// metadata").
type stepFailedEnvelope struct {
	EventID    uuid.UUID `json:"event_id"`
	MediaID    uuid.UUID `json:"media_id"`
	WorkflowID uuid.UUID `json:"workflow_id"`
	Step       string    `json:"step"`
	Attempt    int       `json:"attempt"`
	ErrorCode  string    `json:"error_code"`
	Retriable  bool      `json:"retriable"`
}

// derivativeReadyEnvelope matches media's outbox payload shape for
// DerivativeReadyTopic.
type derivativeReadyEnvelope struct {
	EventID        uuid.UUID `json:"event_id"`
	MediaID        uuid.UUID `json:"media_id"`
	DerivativeType string    `json:"derivative_type"`
}

// creditReservedEnvelope matches billing's reservationEventPayload shape
// for CreditReservedTopic (services/billing/internal/store/credit_repository.go).
type creditReservedEnvelope struct {
	EventID    uuid.UUID `json:"event_id"`
	UserID     uuid.UUID `json:"user_id"`
	WorkflowID uuid.UUID `json:"workflow_id"`
	Status     string    `json:"status"` // "reserved" | "rejected"
}

// creditSettledEnvelope matches billing's settlementEventPayload shape
// for CreditSettledTopic. conductor only logs it: HandleStepCompleted
// already advances the workflow before this confirmation arrives.
type creditSettledEnvelope struct {
	EventID    uuid.UUID `json:"event_id"`
	WorkflowID uuid.UUID `json:"workflow_id"`
	Status     string    `json:"status"`
}

// Handle applies one delivered Kafka message. A non-decodable payload is
// copied to the DLQ (ADR 0003) rather than retried forever or silently
// dropped.
func (c *Consumer) Handle(ctx context.Context, msg kafka.Message) error {
	dedupKey, err := dedupKeyFor(msg.Topic, msg.Value)
	if err != nil {
		c.logger.ErrorContext(ctx, "decode message envelope, sending to DLQ", "topic", msg.Topic, "error", err)
		return c.dlq.RecordUndecodable(ctx, msg, fmt.Sprintf("decode error: %v", err))
	}

	inserted, err := c.inbox.Record(ctx, dedupKey, msg.Topic)
	if err != nil {
		return err
	}
	if !inserted {
		return nil
	}

	switch msg.Topic {
	case ProcessingRequestedTopic:
		return c.handleProcessingRequested(ctx, msg.Value)
	case DeletionRequestedTopic:
		return c.handleDeletionRequested(ctx, msg.Value)
	case StepCompletedTopic:
		return c.handleStepCompleted(ctx, msg.Value)
	case StepFailedTopic:
		return c.handleStepFailed(ctx, msg)
	case DerivativeReadyTopic:
		return c.handleDerivativeReady(ctx, msg.Value)
	case CreditReservedTopic:
		return c.handleCreditReserved(ctx, msg.Value)
	case CreditSettledTopic:
		return c.handleCreditSettled(ctx, msg.Value)
	default:
		c.logger.WarnContext(ctx, "message from unexpected topic, skipping", "topic", msg.Topic)
		return nil
	}
}

// dedupKeyFor decodes just enough of payload to find the inbox dedup key
// for topic, per InboxRepository's doc comment.
func dedupKeyFor(topic string, payload []byte) (uuid.UUID, error) {
	if topic == DeletionRequestedTopic {
		var env struct {
			DeletionID uuid.UUID `json:"deletion_id"`
		}
		if err := json.Unmarshal(payload, &env); err != nil {
			return uuid.UUID{}, err
		}
		if env.DeletionID == uuid.Nil {
			return uuid.UUID{}, errors.New("missing deletion_id")
		}
		return env.DeletionID, nil
	}

	var env struct {
		EventID uuid.UUID `json:"event_id"`
	}
	if err := json.Unmarshal(payload, &env); err != nil {
		return uuid.UUID{}, err
	}
	if env.EventID == uuid.Nil {
		return uuid.UUID{}, errors.New("missing event_id")
	}
	return env.EventID, nil
}

func (c *Consumer) handleProcessingRequested(ctx context.Context, payload []byte) error {
	var env processingRequestedEnvelope
	if err := json.Unmarshal(payload, &env); err != nil {
		return fmt.Errorf("decode processing requested: %w", err)
	}
	return c.workflow.StartWorkflow(ctx, workflow.ProcessingRequested{
		EventID: env.EventID,
		MediaID: env.MediaID,
		Options: env.Options,
	})
}

func (c *Consumer) handleDeletionRequested(ctx context.Context, payload []byte) error {
	var env deletionRequestedEnvelope
	if err := json.Unmarshal(payload, &env); err != nil {
		return fmt.Errorf("decode deletion requested: %w", err)
	}
	return c.workflow.HandleDeletionRequested(ctx, env.DeletionID, env.MediaID)
}

func (c *Consumer) handleStepCompleted(ctx context.Context, payload []byte) error {
	var env stepCompletedEnvelope
	if err := json.Unmarshal(payload, &env); err != nil {
		return fmt.Errorf("decode step completed: %w", err)
	}
	return c.workflow.HandleStepCompleted(ctx, workflow.StepCompletion{
		EventID:    env.EventID,
		WorkflowID: env.WorkflowID,
		MediaID:    env.MediaID,
		StepType:   env.Step,
		Attempt:    env.Attempt,
	})
}

func (c *Consumer) handleStepFailed(ctx context.Context, msg kafka.Message) error {
	var env stepFailedEnvelope
	if err := json.Unmarshal(msg.Value, &env); err != nil {
		return fmt.Errorf("decode step failed: %w", err)
	}
	return c.workflow.HandleStepFailed(ctx, workflow.StepFailure{
		EventID:         env.EventID,
		WorkflowID:      env.WorkflowID,
		MediaID:         env.MediaID,
		StepType:        env.Step,
		Attempt:         env.Attempt,
		ErrorCode:       env.ErrorCode,
		Retriable:       env.Retriable,
		SourceTopic:     msg.Topic,
		SourcePartition: msg.Partition,
		SourceOffset:    msg.Offset,
		SourceKey:       string(msg.Key),
	})
}

func (c *Consumer) handleDerivativeReady(ctx context.Context, payload []byte) error {
	var env derivativeReadyEnvelope
	if err := json.Unmarshal(payload, &env); err != nil {
		return fmt.Errorf("decode derivative ready: %w", err)
	}
	return c.workflow.HandleDerivativeReady(ctx, env.MediaID, env.DerivativeType)
}

func (c *Consumer) handleCreditReserved(ctx context.Context, payload []byte) error {
	var env creditReservedEnvelope
	if err := json.Unmarshal(payload, &env); err != nil {
		return fmt.Errorf("decode credit reserved: %w", err)
	}
	return c.workflow.HandleCreditReserved(ctx, env.EventID, env.WorkflowID, env.Status == "reserved")
}

func (c *Consumer) handleCreditSettled(ctx context.Context, payload []byte) error {
	var env creditSettledEnvelope
	if err := json.Unmarshal(payload, &env); err != nil {
		return fmt.Errorf("decode credit settled: %w", err)
	}
	c.logger.InfoContext(ctx, "credit settlement confirmed", "workflow_id", env.WorkflowID, "status", env.Status)
	return nil
}
