// Package deletion owns media's deletion coordinator role for one media
// item (ADR 0006's "user-visible media deletion" flow) and media's
// participant role in account deletion (cascading identity's
// mn.identity.account.deletion.requested.v1 into per-media deletions and
// reporting media's own completion back to identity).
package deletion

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
)

// State is the state of a media deletion operation.
type State string

const (
	StatePending                 State = "pending"
	StateCompleted               State = "completed"
	StateFailedAttentionRequired State = "failed_attention_required"
)

// RequiredParticipants are the services that must report completion
// before a media-item deletion operation finishes. media deletes its own
// owned rows and objects synchronously when the operation starts (ADR
// 0006 step 5), so it is not itself a participant of its own operation —
// mirroring identity's RequiredDeletionParticipants.
var RequiredParticipants = []string{"content", "conductor"}

// Operation tracks one media deletion request.
type Operation struct {
	DeletionID   uuid.UUID
	MediaID      uuid.UUID
	OwnerID      uuid.UUID
	State        State
	Participants map[string]string // participant -> "pending" | "completed"
	CreatedAt    time.Time
	CompletedAt  *time.Time
}

// Done reports whether every required participant has completed.
func (d Operation) Done() bool {
	for _, p := range RequiredParticipants {
		if d.Participants[p] != "completed" {
			return false
		}
	}
	return true
}

var (
	ErrNotFound           = errors.New("deletion: media not found")
	ErrOperationNotFound  = errors.New("deletion: operation not found")
	ErrUnknownParticipant = errors.New("deletion: unknown participant")
)

// Repository is the persistence boundary Service depends on. It is
// implemented by internal/store.
type Repository interface {
	// RequestDeletion atomically transitions media to deletion_pending,
	// cancels its active upload sessions, and records the operation (or
	// returns the existing one and the mn.media.deletion.requested.v1
	// outbox event on the first transition only). It always returns the
	// object keys media still owns for mediaID, so a retried call can
	// resume interrupted object cleanup.
	RequestDeletion(ctx context.Context, mediaID uuid.UUID) (Operation, []string, error)
	// MarkRowsDeleted removes media's owned child rows (upload sessions,
	// derivatives, processing requests) for mediaID. Safe to call
	// repeatedly.
	MarkRowsDeleted(ctx context.Context, mediaID uuid.UUID) error
	FindOperation(ctx context.Context, deletionID uuid.UUID) (Operation, error)
	// RecordCompletion marks participant complete for deletionID and,
	// once every required participant has reported, transitions the
	// operation to completed.
	RecordCompletion(ctx context.Context, deletionID uuid.UUID, participant string) (Operation, error)
	ListOverduePending(ctx context.Context, olderThan time.Duration, limit int) ([]Operation, error)
	RepublishRequested(ctx context.Context, deletionID uuid.UUID) error

	// ListActiveMediaIDs returns every media id owned by ownerID that is
	// not already deletion_pending, for the account-deletion cascade.
	ListActiveMediaIDs(ctx context.Context, ownerID uuid.UUID) ([]uuid.UUID, error)
	// PublishAccountDeletionCompletion writes media's completion event
	// for an identity account-deletion operation, deduplicated by
	// accountDeletionID so redelivery does not republish.
	PublishAccountDeletionCompletion(ctx context.Context, accountDeletionID, ownerID uuid.UUID) error
}

// ObjectRemover deletes an object by key. objectstore.Client implements
// it. A missing object is treated as an idempotent success (ADR 0006).
type ObjectRemover interface {
	RemoveObject(ctx context.Context, objectKey string) error
}

// Service coordinates media-item deletion and media's participation in
// account deletion.
type Service struct {
	repo  Repository
	store ObjectRemover
}

// NewService returns a Service.
func NewService(repo Repository, store ObjectRemover) *Service {
	return &Service{repo: repo, store: store}
}

// RequestDeletion starts (or resumes) deletion for mediaID: the item is
// immediately excluded from normal operations, and media's own owned
// object keys and child rows are removed before returning.
func (s *Service) RequestDeletion(ctx context.Context, mediaID uuid.UUID) (Operation, error) {
	op, objectKeys, err := s.repo.RequestDeletion(ctx, mediaID)
	if err != nil {
		return Operation{}, err
	}
	if err := s.cleanup(ctx, mediaID, objectKeys); err != nil {
		return Operation{}, err
	}
	return op, nil
}

func (s *Service) cleanup(ctx context.Context, mediaID uuid.UUID, objectKeys []string) error {
	for _, key := range objectKeys {
		if err := s.store.RemoveObject(ctx, key); err != nil {
			return err
		}
	}
	return s.repo.MarkRowsDeleted(ctx, mediaID)
}

// GetDeletion returns the deletion operation identified by deletionID.
func (s *Service) GetDeletion(ctx context.Context, deletionID uuid.UUID) (Operation, error) {
	return s.repo.FindOperation(ctx, deletionID)
}

// RecordCompletion marks participant complete for a deletion operation.
func (s *Service) RecordCompletion(ctx context.Context, deletionID uuid.UUID, participant string) (Operation, error) {
	if !isRequiredParticipant(participant) {
		return Operation{}, ErrUnknownParticipant
	}
	return s.repo.RecordCompletion(ctx, deletionID, participant)
}

// ReconcileOverdueDeletions republishes outbox events for pending
// operations older than olderThan, up to limit per call.
func (s *Service) ReconcileOverdueDeletions(ctx context.Context, olderThan time.Duration, limit int) (int, error) {
	ops, err := s.repo.ListOverduePending(ctx, olderThan, limit)
	if err != nil {
		return 0, err
	}
	for _, op := range ops {
		if err := s.repo.RepublishRequested(ctx, op.DeletionID); err != nil {
			return 0, err
		}
	}
	return len(ops), nil
}

// CascadeAccountDeletion starts media's own deletion work for every media
// item owned by ownerID, then reports media's completion for the
// account-deletion operation identified by accountDeletionID. media does
// not wait for content or conductor before reporting: each service
// reports completion only for its own durable work, per ADR 0006's
// account-deletion flow.
func (s *Service) CascadeAccountDeletion(ctx context.Context, accountDeletionID, ownerID uuid.UUID) error {
	mediaIDs, err := s.repo.ListActiveMediaIDs(ctx, ownerID)
	if err != nil {
		return err
	}
	for _, mediaID := range mediaIDs {
		if _, err := s.RequestDeletion(ctx, mediaID); err != nil {
			return err
		}
	}
	return s.repo.PublishAccountDeletionCompletion(ctx, accountDeletionID, ownerID)
}

func isRequiredParticipant(p string) bool {
	for _, o := range RequiredParticipants {
		if o == p {
			return true
		}
	}
	return false
}
