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

// IsTerminal reports whether status is a state RequestProcessing accepts a
// new request against: at most one processing request may be active per
// media item at a time (see docs/services/media.md).
func (s Status) IsTerminal() bool {
	return s == StatusCompleted || s == StatusFailed
}

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
	ID          uuid.UUID
	OwnerID     uuid.UUID
	Title       string
	MediaType   Type
	ObjectKey   string
	MimeType    string
	SizeBytes   int64
	DurationMs  int64
	Checksum    string
	Status      Status
	CreatedAt   time.Time
	UpdatedAt   time.Time
	Description string
	// TrashedAt is set when the owner moved this item to the trash (a
	// reversible, user-visible soft delete distinct from Status ==
	// StatusDeletionPending, which is the irreversible hard-delete
	// coordinator flow in internal/deletion). nil means not trashed.
	TrashedAt *time.Time
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

// ErrNotProcessable is returned by RequestProcessing when the media item's
// status is not terminal: at most one processing request may be active per
// media item at a time.
var ErrNotProcessable = errors.New("media: not processable while a request is active")

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
	// Update changes title and/or description. A nil field is left
	// unchanged.
	Update(ctx context.Context, id uuid.UUID, title, description *string) (Media, error)
	// RequestProcessing atomically re-checks the media item's status under
	// lock, transitions it back to processing, creates a new processing
	// request row, and writes the outbox event — returning ErrNotProcessable
	// if a request is already active. A duplicate call for the same
	// idempotencyKey returns the existing request's media without
	// recreating anything.
	RequestProcessing(ctx context.Context, id uuid.UUID, idempotencyKey string, options []string, audioVoice string, promptOverrides map[string]string) (Media, error)

	// Trash sets trashed_at (if not already set — a repeat call does not
	// push the 30-day purge clock back out).
	Trash(ctx context.Context, id uuid.UUID) (Media, error)
	// Restore clears trashed_at. A no-op if the item isn't trashed.
	Restore(ctx context.Context, id uuid.UUID) (Media, error)
	// ListTrashed returns a cursor-paginated page of ownerID's trashed
	// media, newest-trashed first.
	ListTrashed(ctx context.Context, ownerID uuid.UUID, cursor string, pageSize int) (Page, error)
	// ListTrashedOlderThan returns every trashed item (any owner) whose
	// trashed_at is older than olderThan, up to limit — the purge
	// sweep's source of what to hard-delete next.
	ListTrashedOlderThan(ctx context.Context, olderThan time.Duration, limit int) ([]Media, error)
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

// GetMedia returns one media item by id, trashed or not — hermes uses
// this for ownership checks ahead of TrashMedia/RestoreMedia/
// RequestDeletion too, which must work on an already-trashed item. Only
// deletion_pending (the irreversible hard-delete flow) is excluded here;
// ListMedia and SignPlaybackURL/RequestProcessing exclude trashed items
// on top of that, since those are "normal use" operations a trashed item
// has been deliberately taken out of until restored.
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
	if m.Status == StatusDeletionPending || m.TrashedAt != nil {
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

// UpdateMedia changes a media item's title and/or description. A nil field
// is left unchanged.
func (s *Service) UpdateMedia(ctx context.Context, id uuid.UUID, title, description *string) (Media, error) {
	return s.repo.Update(ctx, id, title, description)
}

// RequestProcessingCommand is the input to RequestProcessing.
type RequestProcessingCommand struct {
	MediaID uuid.UUID
	Options []string
	// AudioVoice overrides conductor-worker's static default TTS voice for
	// this request's generate_audio_summary step, if that option is
	// selected. Empty means "use the worker's default".
	AudioVoice string
	// PromptOverrides maps a selected option id (e.g. "summarize") to a
	// custom instruction string worker appends to that step's LLM prompt.
	PromptOverrides map[string]string
	IdempotencyKey  string
}

// RequestProcessing starts a new processing request for a media item that
// has already been confirmed at least once. Only accepted while the media
// item's status is terminal (completed or failed): at most one processing
// request may be active per media item at a time.
func (s *Service) RequestProcessing(ctx context.Context, cmd RequestProcessingCommand) (Media, error) {
	m, err := s.repo.FindByID(ctx, cmd.MediaID)
	if err != nil {
		return Media{}, err
	}
	if m.Status == StatusDeletionPending || m.TrashedAt != nil {
		return Media{}, ErrNotFound
	}
	if !m.Status.IsTerminal() {
		return Media{}, ErrNotProcessable
	}

	idempotencyKey := cmd.IdempotencyKey
	if idempotencyKey == "" {
		idempotencyKey = uuid.NewString()
	}
	return s.repo.RequestProcessing(ctx, cmd.MediaID, idempotencyKey, cmd.Options, cmd.AudioVoice, cmd.PromptOverrides)
}

// TrashMedia moves a media item to the trash: excluded from ListMedia and
// GetMedia (so it disappears from the normal dashboard/detail views) but
// otherwise untouched, so RestoreMedia can bring it back at any point
// before the purge sweep hard-deletes it (TrashRetention after
// TrashedAt — see cmd/api/main.go's purge loop).
func (s *Service) TrashMedia(ctx context.Context, id uuid.UUID) (Media, error) {
	m, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return Media{}, err
	}
	if m.Status == StatusDeletionPending {
		return Media{}, ErrNotFound
	}
	return s.repo.Trash(ctx, id)
}

// RestoreMedia clears a trashed item's TrashedAt, per RestoreMedia's
// contract that this is a no-op if the item isn't trashed.
func (s *Service) RestoreMedia(ctx context.Context, id uuid.UUID) (Media, error) {
	m, err := s.repo.FindByID(ctx, id)
	if err != nil {
		return Media{}, err
	}
	if m.Status == StatusDeletionPending {
		return Media{}, ErrNotFound
	}
	return s.repo.Restore(ctx, id)
}

// ListTrashed returns a cursor-paginated page of ownerID's trashed media.
func (s *Service) ListTrashed(ctx context.Context, ownerID uuid.UUID, cursor string, pageSize int) (Page, error) {
	if pageSize <= 0 {
		pageSize = 20
	}
	if pageSize > 100 {
		pageSize = 100
	}
	return s.repo.ListTrashed(ctx, ownerID, cursor, pageSize)
}

// ListTrashedOlderThan returns trashed items due for the purge sweep.
func (s *Service) ListTrashedOlderThan(ctx context.Context, olderThan time.Duration, limit int) ([]Media, error) {
	return s.repo.ListTrashedOlderThan(ctx, olderThan, limit)
}
