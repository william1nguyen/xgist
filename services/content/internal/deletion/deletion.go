// Package deletion owns content's participant role in one media item's
// deletion (ADR 0006's "user-visible media deletion" flow): content does
// not coordinate deletion, it only reacts to media's
// mn.media.deletion.requested.v1, removes its own owned rows, and reports
// completion back to media on mn.content.deletion.completed.v1. content
// has no directly account-indexed data, so it is not a direct participant
// of identity's account-deletion cascade — media's per-media deletion
// requests reach it the same way a user-initiated deletion does.
package deletion

import (
	"context"

	"github.com/google/uuid"
)

// Repository is the persistence boundary Service depends on. It is
// implemented by internal/store.
type Repository interface {
	// DeleteOwnedRows idempotently removes every row content owns for
	// mediaID (transcript, segments, summaries, keywords, keypoints,
	// notes, summary-audio metadata) and records a tombstone that
	// rejects future writes for mediaID, then writes the
	// mn.content.deletion.completed.v1 outbox event — all in one
	// transaction. Deduplicated by deletionID: a redelivered or
	// reconciler-republished request is a no-op after the first
	// successful call.
	DeleteOwnedRows(ctx context.Context, deletionID, mediaID uuid.UUID) error
	// IsDeletionPending reports whether mediaID has an active or
	// completed deletion tombstone, which excludes it from mutation.
	IsDeletionPending(ctx context.Context, mediaID uuid.UUID) (bool, error)
}

// Service applies content's deletion participant role.
type Service struct {
	repo Repository
}

// NewService returns a Service.
func NewService(repo Repository) *Service {
	return &Service{repo: repo}
}

// HandleDeletionRequested removes content's owned rows for mediaID and
// reports completion. Safe to call more than once for the same
// deletionID.
func (s *Service) HandleDeletionRequested(ctx context.Context, deletionID, mediaID uuid.UUID) error {
	return s.repo.DeleteOwnedRows(ctx, deletionID, mediaID)
}

// IsDeletionPending reports whether mediaID is excluded from mutation
// because its deletion has started.
func (s *Service) IsDeletionPending(ctx context.Context, mediaID uuid.UUID) (bool, error) {
	return s.repo.IsDeletionPending(ctx, mediaID)
}
