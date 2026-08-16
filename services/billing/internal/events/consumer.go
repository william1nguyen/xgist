package events

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"

	"github.com/google/uuid"

	"github.com/nolannguyen1212/media-notes/services/billing/internal/credit"
)

// InboxRepository deduplicates delivered commands by event id. It is
// implemented by internal/store.
type InboxRepository interface {
	// Record inserts a dedup row and reports whether it was newly
	// inserted; false means this event was already processed.
	Record(ctx context.Context, eventID uuid.UUID, topic string) (inserted bool, err error)
}

// Reserver requests a credit hold. credit.Service implements it.
type Reserver interface {
	Reserve(ctx context.Context, cmd credit.ReserveCommand) (credit.Reservation, error)
}

// Settler settles or releases a credit reservation. credit.Service
// implements it.
type Settler interface {
	SettleItem(ctx context.Context, workflowID uuid.UUID, itemID, idempotencyKey string) (credit.Reservation, error)
	ReleaseRemainder(ctx context.Context, workflowID uuid.UUID, idempotencyKey string) (credit.Reservation, error)
}

// CommandConsumer applies inbound reserve and settle commands from
// conductor idempotently. Each application-service call also writes its
// own transactional-outbox result event (mn.billing.credit.reserved.v1 or
// .settled.v1); this consumer only deduplicates delivery and dispatches.
type CommandConsumer struct {
	inbox    InboxRepository
	reserver Reserver
	settler  Settler
	logger   *slog.Logger
}

// NewCommandConsumer returns a CommandConsumer.
func NewCommandConsumer(inbox InboxRepository, reserver Reserver, settler Settler, logger *slog.Logger) *CommandConsumer {
	return &CommandConsumer{inbox: inbox, reserver: reserver, settler: settler, logger: logger}
}

type reserveEnvelope struct {
	EventID    uuid.UUID `json:"event_id"`
	UserID     uuid.UUID `json:"user_id"`
	WorkflowID uuid.UUID `json:"workflow_id"`
	QuoteID    uuid.UUID `json:"quote_id"`
}

// settleEnvelope covers both purposes ADR 0003 assigns SettleCommandTopic:
// per-item settlement while a workflow runs, and releasing the unsettled
// remainder once a workflow reaches a terminal state.
type settleEnvelope struct {
	EventID    uuid.UUID `json:"event_id"`
	WorkflowID uuid.UUID `json:"workflow_id"`
	Action     string    `json:"action"` // "settle_item" or "release_remainder"
	ItemID     string    `json:"item_id,omitempty"`
}

// Handle applies one delivered command from topic, deduplicated by the
// envelope's event id. Redelivery of the same event id is a no-op. A
// payload that fails to decode is logged and skipped rather than retried
// forever.
func (c *CommandConsumer) Handle(ctx context.Context, topic string, payload []byte) error {
	eventID, err := peekEventID(payload)
	if err != nil {
		c.logger.ErrorContext(ctx, "decode command envelope, skipping", "topic", topic, "error", err)
		return nil
	}

	inserted, err := c.inbox.Record(ctx, eventID, topic)
	if err != nil {
		return err
	}
	if !inserted {
		return nil
	}

	switch topic {
	case ReserveCommandTopic:
		return c.handleReserve(ctx, payload)
	case SettleCommandTopic:
		return c.handleSettle(ctx, payload)
	default:
		c.logger.WarnContext(ctx, "command from unexpected topic, skipping", "topic", topic)
		return nil
	}
}

func (c *CommandConsumer) handleReserve(ctx context.Context, payload []byte) error {
	var env reserveEnvelope
	if err := json.Unmarshal(payload, &env); err != nil {
		return fmt.Errorf("decode reserve command: %w", err)
	}
	_, err := c.reserver.Reserve(ctx, credit.ReserveCommand{
		UserID:     env.UserID,
		WorkflowID: env.WorkflowID,
		QuoteID:    env.QuoteID,
	})
	if err == nil {
		return nil
	}
	if isReserveRejection(err) {
		// Not a processing failure: credit.Repository.Reserve already
		// committed a "rejected" result event to the outbox in the same
		// transaction it read this outcome from, so the command is fully
		// handled and the offset must commit. Returning the error here
		// would instead cause endless redelivery of a decision that will
		// never change.
		c.logger.InfoContext(ctx, "reserve command rejected", "workflow_id", env.WorkflowID, "reason", err)
		return nil
	}
	return err
}

func (c *CommandConsumer) handleSettle(ctx context.Context, payload []byte) error {
	var env settleEnvelope
	if err := json.Unmarshal(payload, &env); err != nil {
		return fmt.Errorf("decode settle command: %w", err)
	}

	var err error
	switch env.Action {
	case "settle_item":
		idempotencyKey := fmt.Sprintf("settle:%s:%s", env.WorkflowID, env.ItemID)
		_, err = c.settler.SettleItem(ctx, env.WorkflowID, env.ItemID, idempotencyKey)
	case "release_remainder":
		idempotencyKey := fmt.Sprintf("release:%s", env.WorkflowID)
		_, err = c.settler.ReleaseRemainder(ctx, env.WorkflowID, idempotencyKey)
	default:
		c.logger.ErrorContext(ctx, "settle command has unknown action, skipping", "workflow_id", env.WorkflowID, "action", env.Action)
		return nil
	}

	if err == nil {
		return nil
	}
	if isStaleSettle(err) {
		// A settle or release arriving for a reservation that is already
		// fully released, or naming a price item outside its quote, can
		// only be stale or malformed input: retrying changes nothing, so
		// log and ack rather than redeliver forever.
		c.logger.WarnContext(ctx, "settle command skipped", "workflow_id", env.WorkflowID, "reason", err)
		return nil
	}
	return err
}

func isReserveRejection(err error) bool {
	return errors.Is(err, credit.ErrQuoteNotFound) ||
		errors.Is(err, credit.ErrQuoteExpired) ||
		errors.Is(err, credit.ErrInsufficientCredit)
}

func isStaleSettle(err error) bool {
	return errors.Is(err, credit.ErrReservationReleased) || errors.Is(err, credit.ErrUnknownItem)
}

func peekEventID(payload []byte) (uuid.UUID, error) {
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
