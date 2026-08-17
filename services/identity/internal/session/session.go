// Package session owns issuing, validating, and revoking opaque session
// tokens.
package session

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"time"

	"github.com/google/uuid"

	"github.com/nolannguyen1212/media-notes/services/identity/internal/account"
)

var (
	ErrInvalidToken     = errors.New("session: invalid or expired token")
	ErrAccountNotUsable = errors.New("session: account is not active")
)

// Session is an issued session record. Token is populated only on Issue;
// every other path only ever sees TokenHash.
type Session struct {
	ID        uuid.UUID
	UserID    uuid.UUID
	Token     string // set only by Issue, never persisted in plaintext
	ExpiresAt time.Time
	RevokedAt *time.Time
	CreatedAt time.Time
}

// Repository is the persistence boundary Service depends on. It is
// implemented by internal/store.
type Repository interface {
	Create(ctx context.Context, userID uuid.UUID, tokenHash [32]byte, expiresAt time.Time) (Session, error)
	// FindActiveByTokenHash returns the session and its owning user in
	// one round trip, joined so account state can be checked without a
	// second query.
	FindActiveByTokenHash(ctx context.Context, tokenHash [32]byte) (Session, account.User, error)
	Revoke(ctx context.Context, sessionID uuid.UUID) error
}

// AccountVerifier authenticates credentials. account.Service implements
// it.
type AccountVerifier interface {
	VerifyCredential(ctx context.Context, email, password string) (account.User, error)
}

// Service issues, validates, and revokes sessions.
type Service struct {
	repo     Repository
	accounts AccountVerifier
	ttl      time.Duration
}

// NewService returns a Service. ttl is the lifetime applied to every
// newly issued session.
func NewService(repo Repository, accounts AccountVerifier, ttl time.Duration) *Service {
	return &Service{repo: repo, accounts: accounts, ttl: ttl}
}

// Authenticate verifies email and password, rejects accounts that are not
// active, and issues a new session.
func (s *Service) Authenticate(ctx context.Context, email, password string) (Session, account.User, error) {
	user, err := s.accounts.VerifyCredential(ctx, email, password)
	if err != nil {
		return Session{}, account.User{}, err
	}
	if user.State != account.StateActive {
		return Session{}, account.User{}, ErrAccountNotUsable
	}

	sess, err := s.issue(ctx, user.ID)
	if err != nil {
		return Session{}, account.User{}, err
	}
	return sess, user, nil
}

func (s *Service) issue(ctx context.Context, userID uuid.UUID) (Session, error) {
	token, err := randomToken()
	if err != nil {
		return Session{}, err
	}
	hash := hashToken(token)

	sess, err := s.repo.Create(ctx, userID, hash, time.Now().Add(s.ttl))
	if err != nil {
		return Session{}, err
	}
	sess.Token = token
	return sess, nil
}

// ValidateSession resolves a raw token to its session and owning user. It
// rejects expired, revoked, and deletion_pending/tombstoned accounts.
func (s *Service) ValidateSession(ctx context.Context, token string) (Session, account.User, error) {
	hash := hashToken(token)
	sess, user, err := s.repo.FindActiveByTokenHash(ctx, hash)
	if err != nil {
		return Session{}, account.User{}, err
	}

	if sess.RevokedAt != nil || time.Now().After(sess.ExpiresAt) {
		return Session{}, account.User{}, ErrInvalidToken
	}
	if user.State != account.StateActive {
		return Session{}, account.User{}, ErrAccountNotUsable
	}
	return sess, user, nil
}

// RevokeSession invalidates one session. Idempotent: revoking an
// already-revoked session succeeds.
func (s *Service) RevokeSession(ctx context.Context, sessionID uuid.UUID) error {
	return s.repo.Revoke(ctx, sessionID)
}

func randomToken() (string, error) {
	buf := make([]byte, 32)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return hex.EncodeToString(buf), nil
}

func hashToken(token string) [32]byte {
	return sha256.Sum256([]byte(token))
}
