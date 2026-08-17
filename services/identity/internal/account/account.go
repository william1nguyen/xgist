// Package account owns registration, profile management, and the account
// deletion state machine.
package account

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

// State is the lifecycle state of a user account.
type State string

const (
	StateActive          State = "active"
	StateDeletionPending State = "deletion_pending"
	StateTombstoned      State = "tombstoned"
)

// User is public account data. It never carries a credential.
type User struct {
	ID              uuid.UUID
	Email           string
	NormalizedEmail string
	Name            string
	ImageURL        string
	EmailVerifiedAt *time.Time
	State           State
	CreatedAt       time.Time
	UpdatedAt       time.Time
}

// DeletionState is the state of an account deletion operation.
type DeletionState string

const (
	DeletionPending                 DeletionState = "pending"
	DeletionCompleted               DeletionState = "completed"
	DeletionFailedAttentionRequired DeletionState = "failed_attention_required"
)

// RequiredDeletionParticipants are the services that must report deletion
// completion before an account deletion operation finishes. hermes and
// identity itself are excluded: identity is the coordinator, and hermes
// owns no domain data.
var RequiredDeletionParticipants = []string{"media", "content", "conductor", "billing"}

// DeletionOperation tracks one account deletion request.
type DeletionOperation struct {
	DeletionID   uuid.UUID
	UserID       uuid.UUID
	State        DeletionState
	Participants map[string]string // owner -> "pending" | "completed"
	CreatedAt    time.Time
	CompletedAt  *time.Time
}

// Done reports whether every required participant has completed.
func (d DeletionOperation) Done() bool {
	for _, owner := range RequiredDeletionParticipants {
		if d.Participants[owner] != "completed" {
			return false
		}
	}
	return true
}

var (
	ErrEmailTaken           = errors.New("account: email already registered")
	ErrNotFound             = errors.New("account: not found")
	ErrInvalidCredentials   = errors.New("account: invalid credentials")
	ErrAccountNotActive     = errors.New("account: not active")
	ErrDeletionNotFound     = errors.New("account: deletion operation not found")
	ErrUnknownDeletionOwner = errors.New("account: unknown deletion participant")
)

// NewAccount is the input to Register.
type NewAccount struct {
	Email    string
	Password string
	Name     string
}

// ProfilePatch carries the mutable profile fields to change. A nil field is
// left unchanged.
type ProfilePatch struct {
	Name     *string
	ImageURL *string
}

// Repository is the persistence boundary Service depends on. It is
// implemented by internal/store.
type Repository interface {
	CreateWithCredential(ctx context.Context, in NewAccount, credentialHash []byte, normalizedEmail string) (User, error)
	FindByNormalizedEmail(ctx context.Context, normalizedEmail string) (User, []byte, error)
	FindByID(ctx context.Context, id uuid.UUID) (User, error)
	UpdateProfile(ctx context.Context, id uuid.UUID, patch ProfilePatch) (User, error)

	// RequestDeletion atomically transitions the account to
	// deletion_pending, revokes its sessions, and writes the outbox
	// event, or returns the existing operation if one already exists for
	// userID.
	RequestDeletion(ctx context.Context, userID uuid.UUID) (op DeletionOperation, created bool, err error)
	FindDeletion(ctx context.Context, deletionID uuid.UUID) (DeletionOperation, error)
	// RecordDeletionCompletion marks owner complete for deletionID and,
	// once every required owner has reported, transitions the operation
	// to completed and tombstones the account. Returns the updated
	// operation.
	RecordDeletionCompletion(ctx context.Context, deletionID uuid.UUID, owner string) (DeletionOperation, error)
	// ListOverduePendingDeletions returns pending operations older than
	// olderThan, for the reconciler.
	ListOverduePendingDeletions(ctx context.Context, olderThan time.Duration, limit int) ([]DeletionOperation, error)
	// RepublishDeletion writes a fresh outbox event for an existing
	// pending deletion operation.
	RepublishDeletion(ctx context.Context, deletionID uuid.UUID) error
}

// Service implements account registration, profile management, and
// deletion.
type Service struct {
	repo       Repository
	bcryptCost int
}

// NewService returns a Service backed by repo. bcryptCost must be within
// bcrypt's accepted range.
func NewService(repo Repository, bcryptCost int) *Service {
	return &Service{repo: repo, bcryptCost: bcryptCost}
}

// Register creates a user and its password credential.
func (s *Service) Register(ctx context.Context, in NewAccount) (User, error) {
	normalized := normalizeEmail(in.Email)
	hash, err := bcrypt.GenerateFromPassword([]byte(in.Password), s.bcryptCost)
	if err != nil {
		return User{}, err
	}

	user, err := s.repo.CreateWithCredential(ctx, in, hash, normalized)
	if err != nil {
		return User{}, err
	}
	return user, nil
}

// VerifyCredential checks email and password and returns the matching
// active-or-not user. Callers must check the returned user's State before
// issuing a session.
func (s *Service) VerifyCredential(ctx context.Context, email, password string) (User, error) {
	normalized := normalizeEmail(email)
	user, hash, err := s.repo.FindByNormalizedEmail(ctx, normalized)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return User{}, ErrInvalidCredentials
		}
		return User{}, err
	}

	if err := bcrypt.CompareHashAndPassword(hash, []byte(password)); err != nil {
		return User{}, ErrInvalidCredentials
	}
	return user, nil
}

// GetUser returns one user by id.
func (s *Service) GetUser(ctx context.Context, id uuid.UUID) (User, error) {
	return s.repo.FindByID(ctx, id)
}

// UpdateUser applies patch to the user's mutable profile fields.
func (s *Service) UpdateUser(ctx context.Context, id uuid.UUID, patch ProfilePatch) (User, error) {
	return s.repo.UpdateProfile(ctx, id, patch)
}

// RequestDeletion starts (or returns the existing) deletion operation for
// userID.
func (s *Service) RequestDeletion(ctx context.Context, userID uuid.UUID) (DeletionOperation, error) {
	op, _, err := s.repo.RequestDeletion(ctx, userID)
	return op, err
}

// GetDeletion returns the deletion operation identified by deletionID.
func (s *Service) GetDeletion(ctx context.Context, deletionID uuid.UUID) (DeletionOperation, error) {
	return s.repo.FindDeletion(ctx, deletionID)
}

// RecordDeletionCompletion marks owner complete for a deletion operation.
func (s *Service) RecordDeletionCompletion(ctx context.Context, deletionID uuid.UUID, owner string) (DeletionOperation, error) {
	if !isRequiredParticipant(owner) {
		return DeletionOperation{}, ErrUnknownDeletionOwner
	}
	return s.repo.RecordDeletionCompletion(ctx, deletionID, owner)
}

// ReconcileOverdueDeletions republishes outbox events for pending
// operations older than olderThan, up to limit per call.
func (s *Service) ReconcileOverdueDeletions(ctx context.Context, olderThan time.Duration, limit int) (int, error) {
	ops, err := s.repo.ListOverduePendingDeletions(ctx, olderThan, limit)
	if err != nil {
		return 0, err
	}
	for _, op := range ops {
		if err := s.repo.RepublishDeletion(ctx, op.DeletionID); err != nil {
			return 0, err
		}
	}
	return len(ops), nil
}

func isRequiredParticipant(owner string) bool {
	for _, o := range RequiredDeletionParticipants {
		if o == owner {
			return true
		}
	}
	return false
}

func normalizeEmail(email string) string {
	return strings.ToLower(strings.TrimSpace(email))
}
