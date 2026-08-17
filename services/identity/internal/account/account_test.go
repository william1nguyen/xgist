package account_test

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"

	"github.com/nolannguyen1212/media-notes/services/identity/internal/account"
)

type fakeRepo struct {
	usersByID      map[uuid.UUID]account.User
	usersByEmail   map[string]uuid.UUID
	hashes         map[uuid.UUID][]byte
	deletions      map[uuid.UUID]account.DeletionOperation
	deletionByUser map[uuid.UUID]uuid.UUID
	republished    []uuid.UUID
}

func newFakeRepo() *fakeRepo {
	return &fakeRepo{
		usersByID:      map[uuid.UUID]account.User{},
		usersByEmail:   map[string]uuid.UUID{},
		hashes:         map[uuid.UUID][]byte{},
		deletions:      map[uuid.UUID]account.DeletionOperation{},
		deletionByUser: map[uuid.UUID]uuid.UUID{},
	}
}

func (f *fakeRepo) CreateWithCredential(_ context.Context, in account.NewAccount, hash []byte, normalizedEmail string) (account.User, error) {
	if _, exists := f.usersByEmail[normalizedEmail]; exists {
		return account.User{}, account.ErrEmailTaken
	}
	id := uuid.New()
	u := account.User{ID: id, Email: in.Email, NormalizedEmail: normalizedEmail, Name: in.Name, State: account.StateActive, CreatedAt: time.Now(), UpdatedAt: time.Now()}
	f.usersByID[id] = u
	f.usersByEmail[normalizedEmail] = id
	f.hashes[id] = hash
	return u, nil
}

func (f *fakeRepo) FindByNormalizedEmail(_ context.Context, normalizedEmail string) (account.User, []byte, error) {
	id, ok := f.usersByEmail[normalizedEmail]
	if !ok {
		return account.User{}, nil, account.ErrNotFound
	}
	return f.usersByID[id], f.hashes[id], nil
}

func (f *fakeRepo) FindByID(_ context.Context, id uuid.UUID) (account.User, error) {
	u, ok := f.usersByID[id]
	if !ok {
		return account.User{}, account.ErrNotFound
	}
	return u, nil
}

func (f *fakeRepo) UpdateProfile(_ context.Context, id uuid.UUID, patch account.ProfilePatch) (account.User, error) {
	u, ok := f.usersByID[id]
	if !ok {
		return account.User{}, account.ErrNotFound
	}
	if patch.Name != nil {
		u.Name = *patch.Name
	}
	if patch.ImageURL != nil {
		u.ImageURL = *patch.ImageURL
	}
	f.usersByID[id] = u
	return u, nil
}

func (f *fakeRepo) RequestDeletion(_ context.Context, userID uuid.UUID) (account.DeletionOperation, bool, error) {
	if existingID, ok := f.deletionByUser[userID]; ok {
		return f.deletions[existingID], false, nil
	}
	deletionID := uuid.New()
	op := account.DeletionOperation{
		DeletionID: deletionID, UserID: userID, State: account.DeletionPending,
		Participants: map[string]string{}, CreatedAt: time.Now(),
	}
	f.deletions[deletionID] = op
	f.deletionByUser[userID] = deletionID

	u := f.usersByID[userID]
	u.State = account.StateDeletionPending
	f.usersByID[userID] = u
	return op, true, nil
}

func (f *fakeRepo) FindDeletion(_ context.Context, deletionID uuid.UUID) (account.DeletionOperation, error) {
	op, ok := f.deletions[deletionID]
	if !ok {
		return account.DeletionOperation{}, account.ErrDeletionNotFound
	}
	return op, nil
}

func (f *fakeRepo) RecordDeletionCompletion(_ context.Context, deletionID uuid.UUID, owner string) (account.DeletionOperation, error) {
	op, ok := f.deletions[deletionID]
	if !ok {
		return account.DeletionOperation{}, account.ErrDeletionNotFound
	}
	if op.Participants == nil {
		op.Participants = map[string]string{}
	}
	op.Participants[owner] = "completed"
	if op.Done() {
		op.State = account.DeletionCompleted
		now := time.Now()
		op.CompletedAt = &now

		u := f.usersByID[op.UserID]
		u.State = account.StateTombstoned
		f.usersByID[op.UserID] = u
	}
	f.deletions[deletionID] = op
	return op, nil
}

func (f *fakeRepo) ListOverduePendingDeletions(_ context.Context, olderThan time.Duration, limit int) ([]account.DeletionOperation, error) {
	var out []account.DeletionOperation
	for _, op := range f.deletions {
		if op.State == account.DeletionPending && time.Since(op.CreatedAt) > olderThan {
			out = append(out, op)
			if len(out) >= limit {
				break
			}
		}
	}
	return out, nil
}

func (f *fakeRepo) RepublishDeletion(_ context.Context, deletionID uuid.UUID) error {
	f.republished = append(f.republished, deletionID)
	return nil
}

func newService(repo *fakeRepo) *account.Service {
	return account.NewService(repo, bcrypt.MinCost)
}

func TestServiceRegister(t *testing.T) {
	tests := map[string]struct {
		seedEmail string
		email     string
		wantErr   error
	}{
		"creates a new account": {
			email: "Alice@Example.com",
		},
		"rejects a duplicate email": {
			seedEmail: "alice@example.com",
			email:     "  ALICE@example.com ",
			wantErr:   account.ErrEmailTaken,
		},
	}

	for name, tc := range tests {
		t.Run(name, func(t *testing.T) {
			repo := newFakeRepo()
			svc := newService(repo)
			ctx := context.Background()

			if tc.seedEmail != "" {
				if _, err := svc.Register(ctx, account.NewAccount{Email: tc.seedEmail, Password: "hunter2hunter", Name: "Seed"}); err != nil {
					t.Fatalf("seed register: %v", err)
				}
			}

			user, err := svc.Register(ctx, account.NewAccount{Email: tc.email, Password: "hunter2hunter", Name: "Alice"})
			if tc.wantErr != nil {
				if !errors.Is(err, tc.wantErr) {
					t.Fatalf("got err %v, want %v", err, tc.wantErr)
				}
				return
			}
			if err != nil {
				t.Fatalf("Register: %v", err)
			}
			if user.State != account.StateActive {
				t.Errorf("state = %v, want active", user.State)
			}
			if user.NormalizedEmail != "alice@example.com" {
				t.Errorf("normalized email = %q, want alice@example.com", user.NormalizedEmail)
			}
		})
	}
}

func TestServiceVerifyCredential(t *testing.T) {
	repo := newFakeRepo()
	svc := newService(repo)
	ctx := context.Background()

	if _, err := svc.Register(ctx, account.NewAccount{Email: "alice@example.com", Password: "hunter2hunter", Name: "Alice"}); err != nil {
		t.Fatalf("seed register: %v", err)
	}

	tests := map[string]struct {
		email    string
		password string
		wantErr  error
	}{
		"correct credentials succeed": {
			email: "alice@example.com", password: "hunter2hunter",
		},
		"wrong password is rejected": {
			email: "alice@example.com", password: "wrong", wantErr: account.ErrInvalidCredentials,
		},
		"unknown email is rejected": {
			email: "bob@example.com", password: "hunter2hunter", wantErr: account.ErrInvalidCredentials,
		},
	}

	for name, tc := range tests {
		t.Run(name, func(t *testing.T) {
			_, err := svc.VerifyCredential(ctx, tc.email, tc.password)
			if tc.wantErr != nil {
				if !errors.Is(err, tc.wantErr) {
					t.Fatalf("got err %v, want %v", err, tc.wantErr)
				}
				return
			}
			if err != nil {
				t.Fatalf("VerifyCredential: %v", err)
			}
		})
	}
}

func TestServiceRequestDeletionIsIdempotent(t *testing.T) {
	repo := newFakeRepo()
	svc := newService(repo)
	ctx := context.Background()

	user, err := svc.Register(ctx, account.NewAccount{Email: "alice@example.com", Password: "hunter2hunter", Name: "Alice"})
	if err != nil {
		t.Fatalf("Register: %v", err)
	}

	first, err := svc.RequestDeletion(ctx, user.ID)
	if err != nil {
		t.Fatalf("RequestDeletion: %v", err)
	}
	second, err := svc.RequestDeletion(ctx, user.ID)
	if err != nil {
		t.Fatalf("RequestDeletion (duplicate): %v", err)
	}
	if first.DeletionID != second.DeletionID {
		t.Errorf("duplicate request created a new operation: %v != %v", first.DeletionID, second.DeletionID)
	}

	got, err := svc.GetUser(ctx, user.ID)
	if err != nil {
		t.Fatalf("GetUser: %v", err)
	}
	if got.State != account.StateDeletionPending {
		t.Errorf("state = %v, want deletion_pending", got.State)
	}
}

func TestServiceRecordDeletionCompletion(t *testing.T) {
	repo := newFakeRepo()
	svc := newService(repo)
	ctx := context.Background()

	user, err := svc.Register(ctx, account.NewAccount{Email: "alice@example.com", Password: "hunter2hunter", Name: "Alice"})
	if err != nil {
		t.Fatalf("Register: %v", err)
	}
	op, err := svc.RequestDeletion(ctx, user.ID)
	if err != nil {
		t.Fatalf("RequestDeletion: %v", err)
	}

	if _, err := svc.RecordDeletionCompletion(ctx, op.DeletionID, "not-a-real-owner"); !errors.Is(err, account.ErrUnknownDeletionOwner) {
		t.Fatalf("unknown owner: got err %v, want ErrUnknownDeletionOwner", err)
	}

	for i, owner := range account.RequiredDeletionParticipants {
		got, err := svc.RecordDeletionCompletion(ctx, op.DeletionID, owner)
		if err != nil {
			t.Fatalf("RecordDeletionCompletion(%s): %v", owner, err)
		}

		wantDone := i == len(account.RequiredDeletionParticipants)-1
		if got.Done() != wantDone {
			t.Errorf("after %s: Done() = %v, want %v", owner, got.Done(), wantDone)
		}
	}

	final, err := svc.GetDeletion(ctx, op.DeletionID)
	if err != nil {
		t.Fatalf("GetDeletion: %v", err)
	}
	if final.State != account.DeletionCompleted {
		t.Errorf("final state = %v, want completed", final.State)
	}

	got, err := svc.GetUser(ctx, user.ID)
	if err != nil {
		t.Fatalf("GetUser: %v", err)
	}
	if got.State != account.StateTombstoned {
		t.Errorf("user state = %v, want tombstoned", got.State)
	}
}

func TestServiceReconcileOverdueDeletions(t *testing.T) {
	repo := newFakeRepo()
	svc := newService(repo)
	ctx := context.Background()

	fresh, err := svc.Register(ctx, account.NewAccount{Email: "fresh@example.com", Password: "hunter2hunter", Name: "Fresh"})
	if err != nil {
		t.Fatalf("Register: %v", err)
	}
	overdue, err := svc.Register(ctx, account.NewAccount{Email: "overdue@example.com", Password: "hunter2hunter", Name: "Overdue"})
	if err != nil {
		t.Fatalf("Register: %v", err)
	}

	if _, err := svc.RequestDeletion(ctx, fresh.ID); err != nil {
		t.Fatalf("RequestDeletion(fresh): %v", err)
	}
	overdueOp, err := svc.RequestDeletion(ctx, overdue.ID)
	if err != nil {
		t.Fatalf("RequestDeletion(overdue): %v", err)
	}

	// Backdate only the overdue operation.
	entry := repo.deletions[overdueOp.DeletionID]
	entry.CreatedAt = time.Now().Add(-time.Hour)
	repo.deletions[overdueOp.DeletionID] = entry

	n, err := svc.ReconcileOverdueDeletions(ctx, 15*time.Minute, 10)
	if err != nil {
		t.Fatalf("ReconcileOverdueDeletions: %v", err)
	}
	if n != 1 {
		t.Fatalf("reconciled %d operations, want 1", n)
	}
	if len(repo.republished) != 1 || repo.republished[0] != overdueOp.DeletionID {
		t.Errorf("republished = %v, want [%v]", repo.republished, overdueOp.DeletionID)
	}
}
