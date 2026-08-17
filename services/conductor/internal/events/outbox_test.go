package events_test

import (
	"context"
	"sync"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/nolannguyen1212/media-notes/services/conductor/internal/events"
)

type fakeOutboxRepo struct {
	mu          sync.Mutex
	pending     []events.OutboxRecord
	published   []uuid.UUID
	incremented []uuid.UUID
}

func (f *fakeOutboxRepo) ListPending(ctx context.Context, limit int) ([]events.OutboxRecord, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	if len(f.pending) > limit {
		return f.pending[:limit], nil
	}
	return f.pending, nil
}

func (f *fakeOutboxRepo) MarkPublished(ctx context.Context, id uuid.UUID) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.published = append(f.published, id)
	for i, rec := range f.pending {
		if rec.ID == id {
			f.pending = append(f.pending[:i], f.pending[i+1:]...)
			break
		}
	}
	return nil
}

func (f *fakeOutboxRepo) IncrementAttempts(ctx context.Context, id uuid.UUID) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.incremented = append(f.incremented, id)
	return nil
}

type publisherFunc func(ctx context.Context, topic, key string, payload []byte) error

func (f publisherFunc) Publish(ctx context.Context, topic, key string, payload []byte) error {
	return f(ctx, topic, key, payload)
}

func TestRelayPublishesPendingRecords(t *testing.T) {
	repo := &fakeOutboxRepo{pending: []events.OutboxRecord{
		{ID: uuid.New(), Topic: events.StepRequestedTopic, Key: "media-1", Payload: []byte(`{}`)},
	}}
	var published []string
	var mu sync.Mutex
	publisher := publisherFunc(func(ctx context.Context, topic, key string, payload []byte) error {
		mu.Lock()
		defer mu.Unlock()
		published = append(published, topic)
		return nil
	})

	relay := events.NewRelay(repo, publisher, testLogger())
	ctx, cancel := context.WithTimeout(context.Background(), 200*time.Millisecond)
	defer cancel()
	relay.Run(ctx, 10*time.Millisecond, 10)

	mu.Lock()
	defer mu.Unlock()
	if len(published) == 0 {
		t.Fatal("expected at least one record to be published")
	}
	repo.mu.Lock()
	defer repo.mu.Unlock()
	if len(repo.pending) != 0 {
		t.Error("published record is still listed as pending")
	}
}

func TestRelayIncrementsAttemptsOnPublishFailure(t *testing.T) {
	id := uuid.New()
	repo := &fakeOutboxRepo{pending: []events.OutboxRecord{
		{ID: id, Topic: events.StepRequestedTopic, Key: "media-1", Payload: []byte(`{}`)},
	}}
	publisher := publisherFunc(func(ctx context.Context, topic, key string, payload []byte) error {
		return context.DeadlineExceeded
	})

	relay := events.NewRelay(repo, publisher, testLogger())
	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Millisecond)
	defer cancel()
	relay.Run(ctx, 10*time.Millisecond, 10)

	repo.mu.Lock()
	defer repo.mu.Unlock()
	if len(repo.incremented) == 0 {
		t.Error("expected IncrementAttempts to be called after a publish failure")
	}
	if len(repo.pending) != 1 {
		t.Error("a failed publish must not remove the record from pending")
	}
}
