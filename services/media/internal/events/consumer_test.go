package events_test

import (
	"context"
	"io"
	"log/slog"
	"testing"

	"github.com/google/uuid"

	"github.com/nolannguyen1212/media-notes/services/media/internal/events"
	"github.com/nolannguyen1212/media-notes/services/media/internal/media"
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

type fakeStatusApplier struct {
	calls []struct {
		mediaID uuid.UUID
		status  media.Status
	}
}

func (f *fakeStatusApplier) ApplyWorkflowStatus(ctx context.Context, mediaID uuid.UUID, status media.Status) error {
	f.calls = append(f.calls, struct {
		mediaID uuid.UUID
		status  media.Status
	}{mediaID, status})
	return nil
}

type fakeCascader struct {
	calls []struct {
		deletionID uuid.UUID
		ownerID    uuid.UUID
	}
}

func (f *fakeCascader) CascadeAccountDeletion(ctx context.Context, accountDeletionID, ownerID uuid.UUID) error {
	f.calls = append(f.calls, struct {
		deletionID uuid.UUID
		ownerID    uuid.UUID
	}{accountDeletionID, ownerID})
	return nil
}

func TestConsumerHandleStatusChanged(t *testing.T) {
	inbox := newFakeInboxRepo()
	status := &fakeStatusApplier{}
	cascader := &fakeCascader{}
	consumer := events.NewConsumer(inbox, status, cascader, slog.New(slog.NewTextHandler(io.Discard, nil)))

	mediaID := uuid.New()
	payload := []byte(`{"event_id":"` + uuid.New().String() + `","media_id":"` + mediaID.String() + `","status":"completed"}`)

	if err := consumer.Handle(context.Background(), events.StatusChangedTopic, payload); err != nil {
		t.Fatalf("Handle: %v", err)
	}
	if len(status.calls) != 1 {
		t.Fatalf("ApplyWorkflowStatus called %d times, want 1", len(status.calls))
	}
	if status.calls[0].mediaID != mediaID {
		t.Errorf("media id = %v, want %v", status.calls[0].mediaID, mediaID)
	}

	// Redelivering the same event id is deduplicated by the inbox and must
	// not call ApplyWorkflowStatus again.
	if err := consumer.Handle(context.Background(), events.StatusChangedTopic, payload); err != nil {
		t.Fatalf("Handle (redelivery): %v", err)
	}
	if len(status.calls) != 1 {
		t.Errorf("redelivered event was applied again: %d calls", len(status.calls))
	}
}

func TestConsumerHandleAccountDeletionRequested(t *testing.T) {
	inbox := newFakeInboxRepo()
	status := &fakeStatusApplier{}
	cascader := &fakeCascader{}
	consumer := events.NewConsumer(inbox, status, cascader, slog.New(slog.NewTextHandler(io.Discard, nil)))

	deletionID := uuid.New()
	ownerID := uuid.New()
	payload := []byte(`{"deletion_id":"` + deletionID.String() + `","user_id":"` + ownerID.String() + `"}`)

	if err := consumer.Handle(context.Background(), events.AccountDeletionRequestedTopic, payload); err != nil {
		t.Fatalf("Handle: %v", err)
	}
	if len(cascader.calls) != 1 {
		t.Fatalf("CascadeAccountDeletion called %d times, want 1", len(cascader.calls))
	}
	if cascader.calls[0].deletionID != deletionID || cascader.calls[0].ownerID != ownerID {
		t.Error("cascade called with the wrong deletion or owner id")
	}

	// The reconciler may republish the same deletion_id verbatim; a
	// redelivery must not cascade twice.
	if err := consumer.Handle(context.Background(), events.AccountDeletionRequestedTopic, payload); err != nil {
		t.Fatalf("Handle (redelivery): %v", err)
	}
	if len(cascader.calls) != 1 {
		t.Errorf("redelivered event cascaded again: %d calls", len(cascader.calls))
	}
}

func TestConsumerSkipsMalformedPayload(t *testing.T) {
	inbox := newFakeInboxRepo()
	status := &fakeStatusApplier{}
	cascader := &fakeCascader{}
	consumer := events.NewConsumer(inbox, status, cascader, slog.New(slog.NewTextHandler(io.Discard, nil)))

	if err := consumer.Handle(context.Background(), events.StatusChangedTopic, []byte(`not json`)); err != nil {
		t.Fatalf("Handle: %v", err)
	}
	if len(status.calls) != 0 {
		t.Error("malformed payload should not reach ApplyWorkflowStatus")
	}
}
