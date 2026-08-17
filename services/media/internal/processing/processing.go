// Package processing owns processing-request records created atomically
// with upload confirmation (see internal/upload) and updated as conductor
// accepts a quote and starts a workflow. media does not own workflow
// attempts themselves — only the request that started them, per
// docs/services/media.md.
package processing

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
)

// Status is the lifecycle state of one processing request, as tracked by
// media. It is a coarse projection, not the workflow state machine itself,
// which conductor owns.
type Status string

const (
	StatusRequested Status = "requested"
	StatusAccepted  Status = "accepted"
	StatusCompleted Status = "completed"
	StatusFailed    Status = "failed"
)

// Request is one processing request for a media item.
type Request struct {
	ID          uuid.UUID
	MediaID     uuid.UUID
	RequestedBy uuid.UUID
	Options     []string
	WorkflowID  *uuid.UUID
	Status      Status
	CreatedAt   time.Time
}

// ErrNotFound is returned when a media item has no processing request.
var ErrNotFound = errors.New("processing: not found")

// Repository is the persistence boundary Service depends on. It is
// implemented by internal/store. Request creation happens inside
// internal/upload's ConfirmUpload transaction, not through this
// Repository, so it exposes reads only.
type Repository interface {
	FindByMediaID(ctx context.Context, mediaID uuid.UUID) (Request, error)
}

// Service reads processing-request state.
type Service struct {
	repo Repository
}

// NewService returns a Service.
func NewService(repo Repository) *Service {
	return &Service{repo: repo}
}

// GetByMediaID returns the processing request for a media item.
func (s *Service) GetByMediaID(ctx context.Context, mediaID uuid.UUID) (Request, error) {
	return s.repo.FindByMediaID(ctx, mediaID)
}
