package events_test

import (
	"context"
	"errors"
	"io"
	"log/slog"
	"slices"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/nolannguyen1212/media-notes/services/identity/internal/account"
	"github.com/nolannguyen1212/media-notes/services/identity/internal/events"
)

func testLogger() *slog.Logger {
	return slog.New(slog.NewTextHandler(io.Discard, nil))
}

type fakeOutboxRepo struct {
	pending     []events.OutboxRecord
	published   []uuid.UUID
	incremented []uuid.UUID
}

func (f *fakeOutboxRepo) ListPending(_ context.Context, limit int) ([]events.OutboxRecord, error) {
	var out []events.OutboxRecord
	for _, rec := range f.pending {
		if slices.Contains(f.published, rec.ID) {
			continue // real store filters WHERE published_at IS NULL
		}
		out = append(out, rec)
		if len(out) >= limit {
			break
		}
	}
	return out, nil
}

func (f *fakeOutboxRepo) MarkPublished(_ context.Context, id uuid.UUID) error {
	f.published = append(f.published, id)
	return nil
}

func (f *fakeOutboxRepo) IncrementAttempts(_ context.Context, id uuid.UUID) error {
	f.incremented = append(f.incremented, id)
	return nil
}

func TestRelayPublishesAndMarksPending(t *testing.T) {
	id := uuid.New()
	repo := &fakeOutboxRepo{pending: []events.OutboxRecord{
		{ID: id, Topic: events.DeletionRequestedTopic, Key: "user-1", Payload: []byte(`{}`)},
	}}
	var published []string
	publisher := publisherFunc(func(_ context.Context, topic, key string, _ []byte) error {
		published = append(published, topic+":"+key)
		return nil
	})

	relay := events.NewRelay(repo, publisher, testLogger())
	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Millisecond)
	defer cancel()
	relay.Run(ctx, 10*time.Millisecond, 10)

	if len(repo.published) != 1 || repo.published[0] != id {
		t.Fatalf("published = %v, want [%v]", repo.published, id)
	}
	if len(published) == 0 {
		t.Fatal("publisher was never called")
	}
}

func TestRelayRetriesOnPublishFailure(t *testing.T) {
	id := uuid.New()
	repo := &fakeOutboxRepo{pending: []events.OutboxRecord{
		{ID: id, Topic: events.DeletionRequestedTopic, Key: "user-1", Payload: []byte(`{}`)},
	}}
	publisher := publisherFunc(func(context.Context, string, string, []byte) error {
		return errors.New("broker unavailable")
	})

	relay := events.NewRelay(repo, publisher, testLogger())
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Millisecond)
	defer cancel()
	relay.Run(ctx, 10*time.Millisecond, 10)

	if len(repo.published) != 0 {
		t.Fatalf("published = %v, want none (publish always fails)", repo.published)
	}
	if len(repo.incremented) == 0 {
		t.Fatal("attempts were never incremented on failure")
	}
}

type publisherFunc func(ctx context.Context, topic, key string, payload []byte) error

func (f publisherFunc) Publish(ctx context.Context, topic, key string, payload []byte) error {
	return f(ctx, topic, key, payload)
}

type fakeInboxRepo struct {
	seen map[string]bool
}

func newFakeInboxRepo() *fakeInboxRepo {
	return &fakeInboxRepo{seen: map[string]bool{}}
}

func (f *fakeInboxRepo) Record(_ context.Context, consumerGroup string, eventID uuid.UUID) (bool, error) {
	key := consumerGroup + ":" + eventID.String()
	if f.seen[key] {
		return false, nil
	}
	f.seen[key] = true
	return true, nil
}

type fakeCompleter struct {
	calls []struct {
		deletionID uuid.UUID
		owner      string
	}
}

func (f *fakeCompleter) RecordDeletionCompletion(_ context.Context, deletionID uuid.UUID, owner string) (account.DeletionOperation, error) {
	f.calls = append(f.calls, struct {
		deletionID uuid.UUID
		owner      string
	}{deletionID, owner})
	return account.DeletionOperation{DeletionID: deletionID}, nil
}

func TestCompletionConsumerDeduplicatesRedelivery(t *testing.T) {
	inbox := newFakeInboxRepo()
	completer := &fakeCompleter{}
	consumer := events.NewCompletionConsumer(inbox, completer, testLogger())

	eventID := uuid.New()
	ev := events.CompletionEvent{DeletionID: uuid.New(), Owner: "media", Status: "completed"}

	if err := consumer.Handle(context.Background(), eventID, ev); err != nil {
		t.Fatalf("Handle: %v", err)
	}
	if err := consumer.Handle(context.Background(), eventID, ev); err != nil {
		t.Fatalf("Handle (redelivery): %v", err)
	}

	if len(completer.calls) != 1 {
		t.Fatalf("RecordDeletionCompletion called %d times, want 1 (redelivery must be a no-op)", len(completer.calls))
	}
}

func TestCompletionConsumerIgnoresNonCompletedStatus(t *testing.T) {
	inbox := newFakeInboxRepo()
	completer := &fakeCompleter{}
	consumer := events.NewCompletionConsumer(inbox, completer, testLogger())

	ev := events.CompletionEvent{DeletionID: uuid.New(), Owner: "media", Status: "failed"}
	if err := consumer.Handle(context.Background(), uuid.New(), ev); err != nil {
		t.Fatalf("Handle: %v", err)
	}
	if len(completer.calls) != 0 {
		t.Fatalf("RecordDeletionCompletion called for a non-completed status")
	}
}

type fakeOverdueReconciler struct {
	calls int
	n     int
	err   error
}

func (f *fakeOverdueReconciler) ReconcileOverdueDeletions(_ context.Context, _ time.Duration, _ int) (int, error) {
	f.calls++
	return f.n, f.err
}

func TestReconcilerTicks(t *testing.T) {
	reconciler := &fakeOverdueReconciler{n: 2}
	r := events.NewReconciler(reconciler, testLogger(), 15*time.Minute, 10)

	ctx, cancel := context.WithTimeout(context.Background(), 35*time.Millisecond)
	defer cancel()
	r.Run(ctx, 10*time.Millisecond)

	if reconciler.calls == 0 {
		t.Fatal("reconciler was never ticked")
	}
}
