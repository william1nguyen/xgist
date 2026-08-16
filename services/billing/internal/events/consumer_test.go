package events_test

import (
	"context"
	"errors"
	"io"
	"log/slog"
	"testing"

	"github.com/google/uuid"

	"github.com/nolannguyen1212/media-notes/services/billing/internal/credit"
	"github.com/nolannguyen1212/media-notes/services/billing/internal/events"
)

func testLogger() *slog.Logger {
	return slog.New(slog.NewTextHandler(io.Discard, nil))
}

type fakeInboxRepo struct {
	seen map[string]bool
}

func newFakeInboxRepo() *fakeInboxRepo {
	return &fakeInboxRepo{seen: map[string]bool{}}
}

func (f *fakeInboxRepo) Record(_ context.Context, eventID uuid.UUID, topic string) (bool, error) {
	key := topic + ":" + eventID.String()
	if f.seen[key] {
		return false, nil
	}
	f.seen[key] = true
	return true, nil
}

type fakeReserver struct {
	calls int
	err   error
}

func (f *fakeReserver) Reserve(context.Context, credit.ReserveCommand) (credit.Reservation, error) {
	f.calls++
	return credit.Reservation{}, f.err
}

type settleCall struct {
	workflowID     uuid.UUID
	itemID         string
	idempotencyKey string
}

type fakeSettler struct {
	settleCalls []settleCall
	releaseCall *settleCall
	settleErr   error
	releaseErr  error
}

func (f *fakeSettler) SettleItem(_ context.Context, workflowID uuid.UUID, itemID, idempotencyKey string) (credit.Reservation, error) {
	f.settleCalls = append(f.settleCalls, settleCall{workflowID, itemID, idempotencyKey})
	return credit.Reservation{}, f.settleErr
}

func (f *fakeSettler) ReleaseRemainder(_ context.Context, workflowID uuid.UUID, idempotencyKey string) (credit.Reservation, error) {
	f.releaseCall = &settleCall{workflowID, "", idempotencyKey}
	return credit.Reservation{}, f.releaseErr
}

func reserveEnvelope(eventID, userID, workflowID, quoteID uuid.UUID) []byte {
	return []byte(`{"event_id":"` + eventID.String() + `","user_id":"` + userID.String() + `","workflow_id":"` + workflowID.String() + `","quote_id":"` + quoteID.String() + `"}`)
}

func settleEnvelope(eventID, workflowID uuid.UUID, action, itemID string) []byte {
	return []byte(`{"event_id":"` + eventID.String() + `","workflow_id":"` + workflowID.String() + `","action":"` + action + `","item_id":"` + itemID + `"}`)
}

func TestHandleReserveDispatchesAndDedupesRedelivery(t *testing.T) {
	inbox := newFakeInboxRepo()
	reserver := &fakeReserver{}
	consumer := events.NewCommandConsumer(inbox, reserver, &fakeSettler{}, testLogger())

	payload := reserveEnvelope(uuid.New(), uuid.New(), uuid.New(), uuid.New())

	if err := consumer.Handle(context.Background(), events.ReserveCommandTopic, payload); err != nil {
		t.Fatalf("Handle: %v", err)
	}
	if err := consumer.Handle(context.Background(), events.ReserveCommandTopic, payload); err != nil {
		t.Fatalf("Handle (redelivery): %v", err)
	}

	if reserver.calls != 1 {
		t.Fatalf("Reserve called %d times, want 1 (redelivery must be a no-op)", reserver.calls)
	}
}

func TestHandleReserveRejectionIsAcked(t *testing.T) {
	inbox := newFakeInboxRepo()
	reserver := &fakeReserver{err: credit.ErrInsufficientCredit}
	consumer := events.NewCommandConsumer(inbox, reserver, &fakeSettler{}, testLogger())

	payload := reserveEnvelope(uuid.New(), uuid.New(), uuid.New(), uuid.New())
	if err := consumer.Handle(context.Background(), events.ReserveCommandTopic, payload); err != nil {
		t.Fatalf("Handle: %v, want a business rejection to be acked (nil), not retried", err)
	}
}

func TestHandleReserveTransientErrorPropagates(t *testing.T) {
	inbox := newFakeInboxRepo()
	reserver := &fakeReserver{err: errors.New("database is unreachable")}
	consumer := events.NewCommandConsumer(inbox, reserver, &fakeSettler{}, testLogger())

	payload := reserveEnvelope(uuid.New(), uuid.New(), uuid.New(), uuid.New())
	if err := consumer.Handle(context.Background(), events.ReserveCommandTopic, payload); err == nil {
		t.Fatal("Handle returned nil, want a transient error to propagate for retry")
	}
}

func TestHandleSettleItemDerivesIdempotencyKey(t *testing.T) {
	inbox := newFakeInboxRepo()
	settler := &fakeSettler{}
	consumer := events.NewCommandConsumer(inbox, &fakeReserver{}, settler, testLogger())

	workflowID := uuid.New()
	payload := settleEnvelope(uuid.New(), workflowID, "settle_item", "transcribe")

	if err := consumer.Handle(context.Background(), events.SettleCommandTopic, payload); err != nil {
		t.Fatalf("Handle: %v", err)
	}
	if len(settler.settleCalls) != 1 {
		t.Fatalf("SettleItem called %d times, want 1", len(settler.settleCalls))
	}
	want := "settle:" + workflowID.String() + ":transcribe"
	if got := settler.settleCalls[0].idempotencyKey; got != want {
		t.Errorf("idempotency key = %q, want %q", got, want)
	}
}

func TestHandleReleaseRemainderDerivesIdempotencyKey(t *testing.T) {
	inbox := newFakeInboxRepo()
	settler := &fakeSettler{}
	consumer := events.NewCommandConsumer(inbox, &fakeReserver{}, settler, testLogger())

	workflowID := uuid.New()
	payload := settleEnvelope(uuid.New(), workflowID, "release_remainder", "")

	if err := consumer.Handle(context.Background(), events.SettleCommandTopic, payload); err != nil {
		t.Fatalf("Handle: %v", err)
	}
	if settler.releaseCall == nil {
		t.Fatal("ReleaseRemainder was not called")
	}
	want := "release:" + workflowID.String()
	if settler.releaseCall.idempotencyKey != want {
		t.Errorf("idempotency key = %q, want %q", settler.releaseCall.idempotencyKey, want)
	}
}

func TestHandleStaleSettleIsAcked(t *testing.T) {
	inbox := newFakeInboxRepo()
	settler := &fakeSettler{settleErr: credit.ErrReservationReleased}
	consumer := events.NewCommandConsumer(inbox, &fakeReserver{}, settler, testLogger())

	payload := settleEnvelope(uuid.New(), uuid.New(), "settle_item", "transcribe")
	if err := consumer.Handle(context.Background(), events.SettleCommandTopic, payload); err != nil {
		t.Fatalf("Handle: %v, want a stale settle against a released reservation to be acked", err)
	}
}

func TestHandleMalformedPayloadIsSkipped(t *testing.T) {
	inbox := newFakeInboxRepo()
	reserver := &fakeReserver{}
	consumer := events.NewCommandConsumer(inbox, reserver, &fakeSettler{}, testLogger())

	if err := consumer.Handle(context.Background(), events.ReserveCommandTopic, []byte(`{"user_id":"not-json-shaped`)); err != nil {
		t.Fatalf("Handle: %v, want a malformed payload to be skipped, not errored", err)
	}
	if reserver.calls != 0 {
		t.Fatalf("Reserve called for a malformed payload")
	}
}
