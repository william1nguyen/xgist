package deletion_test

import (
	"context"
	"testing"

	"github.com/google/uuid"

	"github.com/nolannguyen1212/media-notes/services/content/internal/deletion"
)

type fakeRepo struct {
	deleted map[uuid.UUID]uuid.UUID // mediaID -> deletionID
	calls   int
}

func newFakeRepo() *fakeRepo {
	return &fakeRepo{deleted: map[uuid.UUID]uuid.UUID{}}
}

func (f *fakeRepo) DeleteOwnedRows(ctx context.Context, deletionID, mediaID uuid.UUID) error {
	f.calls++
	if _, ok := f.deleted[mediaID]; ok {
		return nil
	}
	f.deleted[mediaID] = deletionID
	return nil
}

func (f *fakeRepo) IsDeletionPending(ctx context.Context, mediaID uuid.UUID) (bool, error) {
	_, ok := f.deleted[mediaID]
	return ok, nil
}

func TestHandleDeletionRequestedIsIdempotent(t *testing.T) {
	repo := newFakeRepo()
	svc := deletion.NewService(repo)
	mediaID := uuid.New()
	deletionID := uuid.New()

	if err := svc.HandleDeletionRequested(context.Background(), deletionID, mediaID); err != nil {
		t.Fatalf("HandleDeletionRequested: %v", err)
	}
	if err := svc.HandleDeletionRequested(context.Background(), deletionID, mediaID); err != nil {
		t.Fatalf("HandleDeletionRequested (redelivery): %v", err)
	}
	if repo.calls != 2 {
		t.Fatalf("repo called %d times, want 2 (idempotency is the repository's job)", repo.calls)
	}

	pending, err := svc.IsDeletionPending(context.Background(), mediaID)
	if err != nil {
		t.Fatalf("IsDeletionPending: %v", err)
	}
	if !pending {
		t.Error("expected mediaID to be marked deletion pending after HandleDeletionRequested")
	}
}

func TestIsDeletionPendingFalseForUnknownMedia(t *testing.T) {
	repo := newFakeRepo()
	svc := deletion.NewService(repo)

	pending, err := svc.IsDeletionPending(context.Background(), uuid.New())
	if err != nil {
		t.Fatalf("IsDeletionPending: %v", err)
	}
	if pending {
		t.Error("expected an unknown media item to not be deletion pending")
	}
}
