package events_test

import (
	"context"
	"io"
	"log/slog"
	"testing"

	"github.com/google/uuid"

	"github.com/nolannguyen1212/media-notes/services/content/internal/events"
)

type fakeInboxRepo struct {
	recorded map[string]bool
}

func newFakeInboxRepo() *fakeInboxRepo {
	return &fakeInboxRepo{recorded: map[string]bool{}}
}

func (f *fakeInboxRepo) Record(ctx context.Context, dedupKey uuid.UUID, topic string) (bool, error) {
	key := dedupKey.String() + "|" + topic
	if f.recorded[key] {
		return false, nil
	}
	f.recorded[key] = true
	return true, nil
}

type fakeDeletionHandler struct {
	calls []struct {
		deletionID uuid.UUID
		mediaID    uuid.UUID
	}
}

func (f *fakeDeletionHandler) HandleDeletionRequested(ctx context.Context, deletionID, mediaID uuid.UUID) error {
	f.calls = append(f.calls, struct {
		deletionID uuid.UUID
		mediaID    uuid.UUID
	}{deletionID, mediaID})
	return nil
}

func TestConsumerHandleDeletionRequested(t *testing.T) {
	inbox := newFakeInboxRepo()
	handler := &fakeDeletionHandler{}
	consumer := events.NewConsumer(inbox, handler, testLogger())

	deletionID := uuid.New()
	mediaID := uuid.New()
	payload := []byte(`{"event_id":"` + uuid.New().String() + `","deletion_id":"` + deletionID.String() + `","media_id":"` + mediaID.String() + `","owner_id":"` + uuid.New().String() + `"}`)

	if err := consumer.Handle(context.Background(), events.DeletionRequestedTopic, payload); err != nil {
		t.Fatalf("Handle: %v", err)
	}
	if len(handler.calls) != 1 {
		t.Fatalf("HandleDeletionRequested called %d times, want 1", len(handler.calls))
	}
	if handler.calls[0].deletionID != deletionID || handler.calls[0].mediaID != mediaID {
		t.Error("handler called with the wrong deletion or media id")
	}

	// media's reconciler may republish the same deletion_id verbatim; a
	// redelivery must not run deletion work twice.
	if err := consumer.Handle(context.Background(), events.DeletionRequestedTopic, payload); err != nil {
		t.Fatalf("Handle (redelivery): %v", err)
	}
	if len(handler.calls) != 1 {
		t.Errorf("redelivered event handled again: %d calls", len(handler.calls))
	}
}

func TestConsumerSkipsMalformedPayload(t *testing.T) {
	inbox := newFakeInboxRepo()
	handler := &fakeDeletionHandler{}
	consumer := events.NewConsumer(inbox, handler, testLogger())

	if err := consumer.Handle(context.Background(), events.DeletionRequestedTopic, []byte(`not json`)); err != nil {
		t.Fatalf("Handle: %v", err)
	}
	if len(handler.calls) != 0 {
		t.Error("malformed payload should not reach HandleDeletionRequested")
	}
}

func TestConsumerSkipsUnexpectedTopic(t *testing.T) {
	inbox := newFakeInboxRepo()
	handler := &fakeDeletionHandler{}
	consumer := events.NewConsumer(inbox, handler, slog.New(slog.NewTextHandler(io.Discard, nil)))

	if err := consumer.Handle(context.Background(), "mn.some.other.topic.v1", []byte(`{}`)); err != nil {
		t.Fatalf("Handle: %v", err)
	}
	if len(handler.calls) != 0 {
		t.Error("an event from an unexpected topic must not dispatch")
	}
}
