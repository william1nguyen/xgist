package events_test

import (
	"context"
	"io"
	"log/slog"
	"testing"

	"github.com/google/uuid"
	"github.com/segmentio/kafka-go"

	"github.com/nolannguyen1212/media-notes/services/conductor/internal/events"
	"github.com/nolannguyen1212/media-notes/services/conductor/internal/workflow"
)

func testLogger() *slog.Logger {
	return slog.New(slog.NewTextHandler(io.Discard, nil))
}

type fakeInbox struct {
	seen map[string]bool
}

func newFakeInbox() *fakeInbox { return &fakeInbox{seen: map[string]bool{}} }

func (f *fakeInbox) Record(ctx context.Context, dedupKey uuid.UUID, topic string) (bool, error) {
	key := topic + ":" + dedupKey.String()
	if f.seen[key] {
		return false, nil
	}
	f.seen[key] = true
	return true, nil
}

type fakeDLQ struct {
	records []string
}

func (f *fakeDLQ) RecordUndecodable(ctx context.Context, msg kafka.Message, reason string) error {
	f.records = append(f.records, reason)
	return nil
}

type fakeHandler struct {
	started         []workflow.ProcessingRequested
	creditDecisions int
	completed       []workflow.StepCompletion
	failed          []workflow.StepFailure
	derivatives     int
	deletions       int
}

func (f *fakeHandler) StartWorkflow(ctx context.Context, req workflow.ProcessingRequested) error {
	f.started = append(f.started, req)
	return nil
}

func (f *fakeHandler) HandleCreditReserved(ctx context.Context, eventID, workflowID uuid.UUID, accepted bool) error {
	f.creditDecisions++
	return nil
}

func (f *fakeHandler) HandleStepCompleted(ctx context.Context, in workflow.StepCompletion) error {
	f.completed = append(f.completed, in)
	return nil
}

func (f *fakeHandler) HandleStepFailed(ctx context.Context, in workflow.StepFailure) error {
	f.failed = append(f.failed, in)
	return nil
}

func (f *fakeHandler) HandleDerivativeReady(ctx context.Context, mediaID uuid.UUID, derivativeType string) error {
	f.derivatives++
	return nil
}

func (f *fakeHandler) HandleDeletionRequested(ctx context.Context, deletionID, mediaID uuid.UUID) error {
	f.deletions++
	return nil
}

func TestHandleProcessingRequestedStartsWorkflow(t *testing.T) {
	handler := &fakeHandler{}
	c := events.NewConsumer(newFakeInbox(), &fakeDLQ{}, handler, testLogger())

	mediaID := uuid.New()
	msg := kafka.Message{
		Topic: events.ProcessingRequestedTopic,
		Value: []byte(`{"event_id":"` + uuid.New().String() + `","media_id":"` + mediaID.String() + `","options":["summarize"]}`),
	}

	if err := c.Handle(context.Background(), msg); err != nil {
		t.Fatalf("Handle: %v", err)
	}
	if len(handler.started) != 1 || handler.started[0].MediaID != mediaID {
		t.Fatalf("started = %v, want one request for media %s", handler.started, mediaID)
	}
}

func TestHandleDeduplicatesByEventID(t *testing.T) {
	handler := &fakeHandler{}
	c := events.NewConsumer(newFakeInbox(), &fakeDLQ{}, handler, testLogger())

	msg := kafka.Message{
		Topic: events.ProcessingRequestedTopic,
		Value: []byte(`{"event_id":"` + uuid.New().String() + `","media_id":"` + uuid.New().String() + `","options":[]}`),
	}

	if err := c.Handle(context.Background(), msg); err != nil {
		t.Fatalf("Handle (first): %v", err)
	}
	if err := c.Handle(context.Background(), msg); err != nil {
		t.Fatalf("Handle (redelivery): %v", err)
	}
	if len(handler.started) != 1 {
		t.Fatalf("started called %d times, want 1 (redelivery must be a no-op)", len(handler.started))
	}
}

func TestHandleDeletionRequestedDedupsByDeletionIDNotEventID(t *testing.T) {
	handler := &fakeHandler{}
	c := events.NewConsumer(newFakeInbox(), &fakeDLQ{}, handler, testLogger())

	deletionID := uuid.New()
	mediaID := uuid.New()
	// Two different event_ids for the same deletion_id, mirroring media's
	// reconciler republishing an overdue operation under a fresh event_id.
	first := kafka.Message{Topic: events.DeletionRequestedTopic, Value: []byte(
		`{"event_id":"` + uuid.New().String() + `","deletion_id":"` + deletionID.String() + `","media_id":"` + mediaID.String() + `"}`)}
	second := kafka.Message{Topic: events.DeletionRequestedTopic, Value: []byte(
		`{"event_id":"` + uuid.New().String() + `","deletion_id":"` + deletionID.String() + `","media_id":"` + mediaID.String() + `"}`)}

	if err := c.Handle(context.Background(), first); err != nil {
		t.Fatalf("Handle (first): %v", err)
	}
	if err := c.Handle(context.Background(), second); err != nil {
		t.Fatalf("Handle (republish): %v", err)
	}
	if handler.deletions != 1 {
		t.Fatalf("HandleDeletionRequested called %d times, want 1", handler.deletions)
	}
}

func TestHandleUndecodablePayloadGoesToDLQ(t *testing.T) {
	handler := &fakeHandler{}
	dlq := &fakeDLQ{}
	c := events.NewConsumer(newFakeInbox(), dlq, handler, testLogger())

	msg := kafka.Message{Topic: events.ProcessingRequestedTopic, Value: []byte(`not json`)}

	if err := c.Handle(context.Background(), msg); err != nil {
		t.Fatalf("Handle: %v", err)
	}
	if len(dlq.records) != 1 {
		t.Fatalf("DLQ records = %d, want 1", len(dlq.records))
	}
	if len(handler.started) != 0 {
		t.Fatal("a non-decodable message must not reach the workflow handler")
	}
}

func TestHandleStepFailedCarriesSourceCoordinates(t *testing.T) {
	handler := &fakeHandler{}
	c := events.NewConsumer(newFakeInbox(), &fakeDLQ{}, handler, testLogger())

	msg := kafka.Message{
		Topic:     events.StepFailedTopic,
		Partition: 2,
		Offset:    42,
		Key:       []byte("media-1"),
		Value: []byte(`{"event_id":"` + uuid.New().String() + `","media_id":"` + uuid.New().String() +
			`","workflow_id":"` + uuid.New().String() + `","step":"transcribe","attempt":1,"error_code":"provider_timeout","retriable":true}`),
	}

	if err := c.Handle(context.Background(), msg); err != nil {
		t.Fatalf("Handle: %v", err)
	}
	if len(handler.failed) != 1 {
		t.Fatalf("failed = %d, want 1", len(handler.failed))
	}
	got := handler.failed[0]
	if got.SourceTopic != events.StepFailedTopic || got.SourcePartition != 2 || got.SourceOffset != 42 || got.SourceKey != "media-1" {
		t.Errorf("source coordinates = %+v, want topic=%s partition=2 offset=42 key=media-1", got, events.StepFailedTopic)
	}
}

func TestHandleCreditReservedMapsStatusToAccepted(t *testing.T) {
	handler := &fakeHandler{}
	c := events.NewConsumer(newFakeInbox(), &fakeDLQ{}, handler, testLogger())

	msg := kafka.Message{
		Topic: events.CreditReservedTopic,
		Value: []byte(`{"event_id":"` + uuid.New().String() + `","user_id":"` + uuid.New().String() +
			`","workflow_id":"` + uuid.New().String() + `","status":"reserved"}`),
	}

	if err := c.Handle(context.Background(), msg); err != nil {
		t.Fatalf("Handle: %v", err)
	}
	if handler.creditDecisions != 1 {
		t.Fatalf("HandleCreditReserved called %d times, want 1", handler.creditDecisions)
	}
}

func TestHandleDerivativeReadyDispatches(t *testing.T) {
	handler := &fakeHandler{}
	c := events.NewConsumer(newFakeInbox(), &fakeDLQ{}, handler, testLogger())

	msg := kafka.Message{
		Topic: events.DerivativeReadyTopic,
		Value: []byte(`{"event_id":"` + uuid.New().String() + `","media_id":"` + uuid.New().String() + `","derivative_type":"thumbnail"}`),
	}

	if err := c.Handle(context.Background(), msg); err != nil {
		t.Fatalf("Handle: %v", err)
	}
	if handler.derivatives != 1 {
		t.Fatalf("HandleDerivativeReady called %d times, want 1", handler.derivatives)
	}
}
