package deletion_test

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/nolannguyen1212/media-notes/services/media/internal/deletion"
)

type fakeRepo struct {
	mediaOwner  map[uuid.UUID]uuid.UUID
	pending     map[uuid.UUID]bool
	objectKeys  map[uuid.UUID][]string
	rowsDeleted map[uuid.UUID]bool
	opsByMedia  map[uuid.UUID]deletion.Operation
	opsByID     map[uuid.UUID]deletion.Operation
	completions []struct{ deletionID, ownerID uuid.UUID }
}

func newFakeRepo() *fakeRepo {
	return &fakeRepo{
		mediaOwner:  map[uuid.UUID]uuid.UUID{},
		pending:     map[uuid.UUID]bool{},
		objectKeys:  map[uuid.UUID][]string{},
		rowsDeleted: map[uuid.UUID]bool{},
		opsByMedia:  map[uuid.UUID]deletion.Operation{},
		opsByID:     map[uuid.UUID]deletion.Operation{},
	}
}

func (f *fakeRepo) addMedia(mediaID, ownerID uuid.UUID, objectKeys ...string) {
	f.mediaOwner[mediaID] = ownerID
	f.objectKeys[mediaID] = objectKeys
}

func (f *fakeRepo) RequestDeletion(ctx context.Context, mediaID uuid.UUID) (deletion.Operation, []string, error) {
	owner, ok := f.mediaOwner[mediaID]
	if !ok {
		return deletion.Operation{}, nil, deletion.ErrNotFound
	}
	if !f.pending[mediaID] {
		f.pending[mediaID] = true
		op := deletion.Operation{
			DeletionID:   uuid.New(),
			MediaID:      mediaID,
			OwnerID:      owner,
			State:        deletion.StatePending,
			Participants: map[string]string{},
			CreatedAt:    time.Now(),
		}
		f.opsByMedia[mediaID] = op
		f.opsByID[op.DeletionID] = op
	}
	op := f.opsByMedia[mediaID]
	return op, f.objectKeys[mediaID], nil
}

func (f *fakeRepo) MarkRowsDeleted(ctx context.Context, mediaID uuid.UUID) error {
	f.rowsDeleted[mediaID] = true
	f.objectKeys[mediaID] = nil
	return nil
}

func (f *fakeRepo) FindOperation(ctx context.Context, deletionID uuid.UUID) (deletion.Operation, error) {
	op, ok := f.opsByID[deletionID]
	if !ok {
		return deletion.Operation{}, deletion.ErrOperationNotFound
	}
	return op, nil
}

func (f *fakeRepo) RecordCompletion(ctx context.Context, deletionID uuid.UUID, participant string) (deletion.Operation, error) {
	op, ok := f.opsByID[deletionID]
	if !ok {
		return deletion.Operation{}, deletion.ErrOperationNotFound
	}
	if op.Participants == nil {
		op.Participants = map[string]string{}
	}
	op.Participants[participant] = "completed"
	if op.Done() {
		op.State = deletion.StateCompleted
		now := time.Now()
		op.CompletedAt = &now
	}
	f.opsByID[deletionID] = op
	f.opsByMedia[op.MediaID] = op
	return op, nil
}

func (f *fakeRepo) ListOverduePending(ctx context.Context, olderThan time.Duration, limit int) ([]deletion.Operation, error) {
	var ops []deletion.Operation
	for _, op := range f.opsByID {
		if op.State == deletion.StatePending {
			ops = append(ops, op)
		}
	}
	return ops, nil
}

func (f *fakeRepo) RepublishRequested(ctx context.Context, deletionID uuid.UUID) error {
	return nil
}

func (f *fakeRepo) ListActiveMediaIDs(ctx context.Context, ownerID uuid.UUID) ([]uuid.UUID, error) {
	var ids []uuid.UUID
	for id, owner := range f.mediaOwner {
		if owner == ownerID && !f.pending[id] {
			ids = append(ids, id)
		}
	}
	return ids, nil
}

func (f *fakeRepo) PublishAccountDeletionCompletion(ctx context.Context, accountDeletionID, ownerID uuid.UUID) error {
	f.completions = append(f.completions, struct{ deletionID, ownerID uuid.UUID }{accountDeletionID, ownerID})
	return nil
}

type fakeObjectRemover struct {
	removed []string
}

func (f *fakeObjectRemover) RemoveObject(ctx context.Context, objectKey string) error {
	f.removed = append(f.removed, objectKey)
	return nil
}

func TestRequestDeletionRemovesOwnedObjectsAndRows(t *testing.T) {
	repo := newFakeRepo()
	store := &fakeObjectRemover{}
	mediaID := uuid.New()
	repo.addMedia(mediaID, uuid.New(), "media/x/source", "media/x/thumbnail/v1.webp")

	svc := deletion.NewService(repo, store)
	op, err := svc.RequestDeletion(context.Background(), mediaID)
	if err != nil {
		t.Fatalf("RequestDeletion: %v", err)
	}
	if op.State != deletion.StatePending {
		t.Errorf("state = %v, want pending", op.State)
	}
	if len(store.removed) != 2 {
		t.Errorf("removed %d objects, want 2", len(store.removed))
	}
	if !repo.rowsDeleted[mediaID] {
		t.Error("expected owned child rows to be marked deleted")
	}
}

func TestRequestDeletionIsIdempotent(t *testing.T) {
	repo := newFakeRepo()
	store := &fakeObjectRemover{}
	mediaID := uuid.New()
	repo.addMedia(mediaID, uuid.New(), "media/x/source")

	svc := deletion.NewService(repo, store)
	first, err := svc.RequestDeletion(context.Background(), mediaID)
	if err != nil {
		t.Fatalf("RequestDeletion: %v", err)
	}
	second, err := svc.RequestDeletion(context.Background(), mediaID)
	if err != nil {
		t.Fatalf("RequestDeletion (again): %v", err)
	}
	if first.DeletionID != second.DeletionID {
		t.Error("deletion ids differ across idempotent calls")
	}
}

func TestRecordCompletion(t *testing.T) {
	repo := newFakeRepo()
	store := &fakeObjectRemover{}
	mediaID := uuid.New()
	repo.addMedia(mediaID, uuid.New())
	svc := deletion.NewService(repo, store)
	op, err := svc.RequestDeletion(context.Background(), mediaID)
	if err != nil {
		t.Fatalf("RequestDeletion: %v", err)
	}

	t.Run("rejects an unknown participant", func(t *testing.T) {
		_, err := svc.RecordCompletion(context.Background(), op.DeletionID, "billing")
		if !errors.Is(err, deletion.ErrUnknownParticipant) {
			t.Fatalf("got %v, want ErrUnknownParticipant", err)
		}
	})

	t.Run("completes only once every required participant reports", func(t *testing.T) {
		for i, participant := range deletion.RequiredParticipants {
			updated, err := svc.RecordCompletion(context.Background(), op.DeletionID, participant)
			if err != nil {
				t.Fatalf("RecordCompletion(%s): %v", participant, err)
			}
			last := i == len(deletion.RequiredParticipants)-1
			if last && updated.State != deletion.StateCompleted {
				t.Errorf("state = %v, want completed after every participant reported", updated.State)
			}
			if !last && updated.State != deletion.StatePending {
				t.Errorf("state = %v, want still pending", updated.State)
			}
		}
	})
}

func TestCascadeAccountDeletion(t *testing.T) {
	repo := newFakeRepo()
	store := &fakeObjectRemover{}
	owner := uuid.New()
	media1 := uuid.New()
	media2 := uuid.New()
	repo.addMedia(media1, owner, "media/1/source")
	repo.addMedia(media2, owner, "media/2/source")

	svc := deletion.NewService(repo, store)
	accountDeletionID := uuid.New()
	if err := svc.CascadeAccountDeletion(context.Background(), accountDeletionID, owner); err != nil {
		t.Fatalf("CascadeAccountDeletion: %v", err)
	}

	if !repo.pending[media1] || !repo.pending[media2] {
		t.Error("expected every owned media item to be marked deletion_pending")
	}
	if len(repo.completions) != 1 {
		t.Fatalf("published %d completions, want 1", len(repo.completions))
	}
	if repo.completions[0].deletionID != accountDeletionID || repo.completions[0].ownerID != owner {
		t.Error("completion event carries the wrong deletion or owner id")
	}
}
