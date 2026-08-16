package session_test

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/nolannguyen1212/media-notes/services/identity/internal/account"
	"github.com/nolannguyen1212/media-notes/services/identity/internal/session"
)

type fakeRepo struct {
	byID   map[uuid.UUID]session.Session
	byHash map[[32]byte]uuid.UUID
	users  map[uuid.UUID]account.User
}

func newFakeRepo() *fakeRepo {
	return &fakeRepo{
		byID:   map[uuid.UUID]session.Session{},
		byHash: map[[32]byte]uuid.UUID{},
		users:  map[uuid.UUID]account.User{},
	}
}

func (f *fakeRepo) Create(_ context.Context, userID uuid.UUID, tokenHash [32]byte, expiresAt time.Time) (session.Session, error) {
	s := session.Session{ID: uuid.New(), UserID: userID, ExpiresAt: expiresAt, CreatedAt: time.Now()}
	f.byID[s.ID] = s
	f.byHash[tokenHash] = s.ID
	return s, nil
}

func (f *fakeRepo) FindActiveByTokenHash(_ context.Context, tokenHash [32]byte) (session.Session, account.User, error) {
	id, ok := f.byHash[tokenHash]
	if !ok {
		return session.Session{}, account.User{}, session.ErrInvalidToken
	}
	s := f.byID[id]
	return s, f.users[s.UserID], nil
}

func (f *fakeRepo) Revoke(_ context.Context, sessionID uuid.UUID) error {
	s, ok := f.byID[sessionID]
	if !ok {
		return nil // idempotent: revoking an unknown session is a no-op
	}
	if s.RevokedAt == nil {
		now := time.Now()
		s.RevokedAt = &now
		f.byID[sessionID] = s
	}
	return nil
}

type fakeVerifier struct {
	users map[string]struct {
		user     account.User
		password string
	}
}

func newFakeVerifier() *fakeVerifier {
	return &fakeVerifier{users: map[string]struct {
		user     account.User
		password string
	}{}}
}

func (f *fakeVerifier) add(email, password string, state account.State) account.User {
	u := account.User{ID: uuid.New(), Email: email, NormalizedEmail: email, State: state}
	f.users[email] = struct {
		user     account.User
		password string
	}{u, password}
	return u
}

func (f *fakeVerifier) VerifyCredential(_ context.Context, email, password string) (account.User, error) {
	entry, ok := f.users[email]
	if !ok || entry.password != password {
		return account.User{}, account.ErrInvalidCredentials
	}
	return entry.user, nil
}

func TestServiceAuthenticate(t *testing.T) {
	tests := map[string]struct {
		state   account.State
		wantErr error
	}{
		"active account issues a session": {
			state: account.StateActive,
		},
		"deletion_pending account is rejected": {
			state: account.StateDeletionPending, wantErr: session.ErrAccountNotUsable,
		},
		"tombstoned account is rejected": {
			state: account.StateTombstoned, wantErr: session.ErrAccountNotUsable,
		},
	}

	for name, tc := range tests {
		t.Run(name, func(t *testing.T) {
			repo := newFakeRepo()
			verifier := newFakeVerifier()
			user := verifier.add("alice@example.com", "hunter2hunter", tc.state)
			repo.users[user.ID] = user

			svc := session.NewService(repo, verifier, time.Hour)
			sess, got, err := svc.Authenticate(context.Background(), "alice@example.com", "hunter2hunter")
			if tc.wantErr != nil {
				if !errors.Is(err, tc.wantErr) {
					t.Fatalf("got err %v, want %v", err, tc.wantErr)
				}
				return
			}
			if err != nil {
				t.Fatalf("Authenticate: %v", err)
			}
			if sess.Token == "" {
				t.Error("issued session has no token")
			}
			if got.ID != user.ID {
				t.Errorf("returned user id = %v, want %v", got.ID, user.ID)
			}
		})
	}
}

func TestServiceValidateSession(t *testing.T) {
	repo := newFakeRepo()
	verifier := newFakeVerifier()
	user := verifier.add("alice@example.com", "hunter2hunter", account.StateActive)
	repo.users[user.ID] = user

	svc := session.NewService(repo, verifier, time.Hour)
	ctx := context.Background()

	sess, _, err := svc.Authenticate(ctx, "alice@example.com", "hunter2hunter")
	if err != nil {
		t.Fatalf("Authenticate: %v", err)
	}

	if _, _, err := svc.ValidateSession(ctx, sess.Token); err != nil {
		t.Fatalf("ValidateSession: %v", err)
	}

	if _, _, err := svc.ValidateSession(ctx, "not-a-real-token"); !errors.Is(err, session.ErrInvalidToken) {
		t.Fatalf("unknown token: got err %v, want ErrInvalidToken", err)
	}

	if err := svc.RevokeSession(ctx, sess.ID); err != nil {
		t.Fatalf("RevokeSession: %v", err)
	}
	if _, _, err := svc.ValidateSession(ctx, sess.Token); !errors.Is(err, session.ErrInvalidToken) {
		t.Fatalf("revoked token: got err %v, want ErrInvalidToken", err)
	}

	// Revoking an already-revoked session is idempotent.
	if err := svc.RevokeSession(ctx, sess.ID); err != nil {
		t.Fatalf("RevokeSession (again): %v", err)
	}
}

func TestServiceValidateSessionExpired(t *testing.T) {
	repo := newFakeRepo()
	verifier := newFakeVerifier()
	user := verifier.add("alice@example.com", "hunter2hunter", account.StateActive)
	repo.users[user.ID] = user

	svc := session.NewService(repo, verifier, -time.Hour) // already-expired TTL
	ctx := context.Background()

	sess, _, err := svc.Authenticate(ctx, "alice@example.com", "hunter2hunter")
	if err != nil {
		t.Fatalf("Authenticate: %v", err)
	}

	if _, _, err := svc.ValidateSession(ctx, sess.Token); !errors.Is(err, session.ErrInvalidToken) {
		t.Fatalf("expired token: got err %v, want ErrInvalidToken", err)
	}
}
