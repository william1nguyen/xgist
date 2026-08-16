package events_test

import (
	"context"
	"errors"
	"slices"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/nolannguyen1212/media-notes/services/billing/internal/events"
)

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

type publisherFunc func(ctx context.Context, topic, key string, payload []byte) error

func (f publisherFunc) Publish(ctx context.Context, topic, key string, payload []byte) error {
	return f(ctx, topic, key, payload)
}

func TestRelayPublishesAndMarksPending(t *testing.T) {
	id := uuid.New()
	repo := &fakeOutboxRepo{pending: []events.OutboxRecord{
		{ID: id, Topic: events.ReservedResultTopic, Key: "user-1", Payload: []byte(`{}`)},
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
		{ID: id, Topic: events.ReservedResultTopic, Key: "user-1", Payload: []byte(`{}`)},
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
