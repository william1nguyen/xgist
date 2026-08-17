// Package media owns source-media metadata: reads, playback-URL signing,
// and workflow-status projection. Upload session creation and
// confirmation, which also create and mutate media rows, live in
// internal/upload; deletion lives in internal/deletion — per
// docs/services/media.md's package layout, media does not own transcript
// or content, workflow attempts, or credit balance.
package media

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
)

// Type is the coarse kind of source media.
type Type string

const (
	TypeAudio Type = "audio"
	TypeVideo Type = "video"
)

// Status is the lifecycle state of one media item.
type Status string

const (
	StatusPendingUpload   Status = "pending_upload"
	StatusProcessing      Status = "processing"
	StatusCompleted       Status = "completed"
	StatusFailed          Status = "failed"
	StatusDeletionPending Status = "deletion_pending"
)

// Media is source-media metadata. It never carries object bytes.
type Media struct {
	ID         uuid.UUID
	OwnerID    uuid.UUID
	Title      string
	MediaType  Type
	ObjectKey  string
	MimeType   string
	SizeBytes  int64
	DurationMs int64
	Checksum   string
	Status     Status
	CreatedAt  time.Time
	UpdatedAt  time.Time
}

// Page is one cursor-paginated page of media, ordered by creation time,
// descending. NextCursor is empty on the last page.
type Page struct {
	Items      []Media
	NextCursor string
}

// ProcessingStatus is the lifecycle state of one media item's processing
// request, as tracked by media. It mirrors internal/processing.Status;
// FindProgress reads processing_requests directly rather than importing
// that package, since it exposes reads only for its own owner (media.Service).
type ProcessingStatus string

const (
	ProcessingStatusUnspecified ProcessingStatus = ""
	ProcessingStatusRequested   ProcessingStatus = "requested"
	ProcessingStatusAccepted    ProcessingStatus = "accepted"
	ProcessingStatusCompleted   ProcessingStatus = "completed"
	ProcessingStatusFailed      ProcessingStatus = "failed"
)

// Progress is one media item's processing-status projection for hermes's
// mediaProgress query, per docs/adr/0005-progress-update-delivery.md.
// CompletedSteps and TotalSteps are derived from the processing request's
// selected options count: conductor does not publish per-step detail into
// mn.media.status.changed.v1, so this is a coarse workflow-stage
// indicator, not a guarantee of step-level accuracy. Version increments on
// every applied status transition.
type Progress struct {
	MediaID          uuid.UUID
	Status           Status
	ProcessingStatus ProcessingStatus
	CompletedSteps   int32
	TotalSteps       int32
	UpdatedAt        time.Time
	Version          int32
}

// ErrNotFound is returned for an unknown media id, and for a media item in
// deletion_pending state: a pending deletion is immediately excluded from
// normal read operations, per ADR 0006.
var ErrNotFound = errors.New("media: not found")

// Repository is the persistence boundary Service depends on. It is
// implemented by internal/store.
type Repository interface {
	FindByID(ctx context.Context, id uuid.UUID) (Media, error)
	List(ctx context.Context, ownerID uuid.UUID, cursor string, pageSize int, search string) (Page, error)
	// ApplyWorkflowStatus projects a workflow-status transition from
	// conductor into the owning media row. A status for a media item that
	// no longer exists, or that is already deletion_pending, is a no-op:
	// conductor may report a stale or late transition after deletion
	// started.
	ApplyWorkflowStatus(ctx context.Context, mediaID uuid.UUID, status Status) error
	// FindProgress returns the progress projection for every id in ids
	// owned by ownerID. An id that is unknown, not owned by ownerID, or
	// deletion_pending is silently omitted, per ADR 0005 — the API must
	// not reveal whether another user's media exists.
	FindProgress(ctx context.Context, ownerID uuid.UUID, ids []uuid.UUID) ([]Progress, error)
}

// ObjectSigner signs a short-lived URL for reading an object.
// objectstore.Client implements it.
type ObjectSigner interface {
	PresignGetObject(ctx context.Context, objectKey string, expires time.Duration) (string, error)
}

// Service reads media metadata, signs playback URLs, and projects
// workflow-status transitions.
type Service struct {
	repo           Repository
	signer         ObjectSigner
	playbackURLTTL time.Duration
}

// NewService returns a Service. playbackURLTTL is the lifetime applied to
// every signed playback URL (15 minutes per ADR 0004).
func NewService(repo Repository, signer ObjectSigner, playbackURLTTL time.Duration) *Service {
	return &Service{repo: repo, signer: signer, playbackURLTTL: playbackURLTTL}
}

// GetMedia returns one media item.
func (s *Service) GetMedia(ctx context.Context, id uuid.UUID) (Media, error) {
	m, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return Media{}, err
	}
	if m.Status == StatusDeletionPending {
		return Media{}, ErrNotFound
	}
	return m, nil
}

// ListMedia returns a cursor-paginated page for one owner. pageSize
// defaults to 20 and is capped at 100, per ADR 0004.
func (s *Service) ListMedia(ctx context.Context, ownerID uuid.UUID, cursor string, pageSize int, search string) (Page, error) {
	if pageSize <= 0 {
		pageSize = 20
	}
	if pageSize > 100 {
		pageSize = 100
	}
	return s.repo.List(ctx, ownerID, cursor, pageSize, search)
}

// SignPlaybackURL returns a short-lived signed URL for a media item's
// source object and the time it expires at.
func (s *Service) SignPlaybackURL(ctx context.Context, id uuid.UUID) (string, time.Time, error) {
	m, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return "", time.Time{}, err
	}
	if m.Status == StatusDeletionPending {
		return "", time.Time{}, ErrNotFound
	}
	url, err := s.signer.PresignGetObject(ctx, m.ObjectKey, s.playbackURLTTL)
	if err != nil {
		return "", time.Time{}, err
	}
	return url, time.Now().Add(s.playbackURLTTL), nil
}

// ApplyWorkflowStatus projects a workflow-status transition delivered by
// mn.media.status.changed.v1 into the owning media row. It is not exposed
// over gRPC: conductor drives it exclusively through Kafka, per
// docs/services/media.md.
func (s *Service) ApplyWorkflowStatus(ctx context.Context, mediaID uuid.UUID, status Status) error {
	return s.repo.ApplyWorkflowStatus(ctx, mediaID, status)
}

// GetProgress returns the processing-status projection for up to 50 media
// items owned by ownerID, per ADR 0005.
func (s *Service) GetProgress(ctx context.Context, ownerID uuid.UUID, ids []uuid.UUID) ([]Progress, error) {
	return s.repo.FindProgress(ctx, ownerID, ids)
}
