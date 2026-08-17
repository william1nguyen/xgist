// Package upload owns upload-session creation and confirmation. Creation
// validates declared MIME type and size and enforces the three-active-
// session cap per owner (ADR 0004); confirmation reads authoritative
// object metadata and atomically creates the processing request and
// outbox event, per docs/services/media.md.
package upload

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"

	"github.com/nolannguyen1212/media-notes/services/media/internal/media"
	"github.com/nolannguyen1212/media-notes/services/media/internal/objectstore"
)

// Status is the lifecycle state of one upload session.
type Status string

const (
	StatusActive    Status = "active"
	StatusCompleted Status = "completed"
	StatusExpired   Status = "expired"
	StatusCanceled  Status = "canceled"
)

// UploadSession is one in-progress or completed upload.
type UploadSession struct {
	ID          uuid.UUID
	MediaID     uuid.UUID
	OwnerID     uuid.UUID
	ObjectKey   string
	Status      Status
	ExpiresAt   time.Time
	CompletedAt *time.Time
	// UploadURL is a short-lived presigned PUT URL. It is computed at
	// request time, never persisted, and is empty once the session is no
	// longer active.
	UploadURL string
}

// NewUploadSession is the input to CreateUploadSession. MIME type and
// declared size are untrusted client input, checked here for early
// feedback and again, authoritatively, at confirmation.
type NewUploadSession struct {
	OwnerID           uuid.UUID
	Title             string
	MimeType          string
	DeclaredSizeBytes int64
	IdempotencyKey    string
}

// allowedMimeTypes maps every accepted container/codec MIME type to its
// coarse media type, per ADR 0004's accepted containers (MP4, MOV, MKV,
// WebM, MP3, WAV, M4A). media_type is derived from mime_type rather than
// trusted from the caller.
var allowedMimeTypes = map[string]media.Type{
	"video/mp4":        media.TypeVideo,
	"video/quicktime":  media.TypeVideo,
	"video/x-matroska": media.TypeVideo,
	"video/webm":       media.TypeVideo,
	"audio/mpeg":       media.TypeAudio,
	"audio/wav":        media.TypeAudio,
	"audio/x-wav":      media.TypeAudio,
	"audio/mp4":        media.TypeAudio,
	"audio/x-m4a":      media.TypeAudio,
}

var (
	ErrNotFound              = errors.New("upload: not found")
	ErrUnsupportedMimeType   = errors.New("upload: unsupported mime type")
	ErrDeclaredSizeExceeded  = errors.New("upload: declared size exceeds the maximum")
	ErrTooManyActiveSessions = errors.New("upload: too many active upload sessions")
	ErrSessionNotActive      = errors.New("upload: session is not active")
	ErrSessionExpired        = errors.New("upload: session expired")
	ErrObjectMissing         = errors.New("upload: object missing")
	ErrObjectEmpty           = errors.New("upload: object is empty")
	ErrObjectOversize        = errors.New("upload: object exceeds the maximum size")
)

// Repository is the persistence boundary Service depends on. It is
// implemented by internal/store.
type Repository interface {
	// Create atomically locks and counts ownerID's active sessions,
	// rejects a session beyond maxActiveSessions, and creates a
	// pending_upload media row and an active upload session. A duplicate
	// call with the same idempotency_key returns the existing session
	// without recreating it or re-checking the session count.
	Create(ctx context.Context, mediaID, sessionID uuid.UUID, in NewUploadSession, mediaType media.Type, objectKey string, expiresAt time.Time, maxActiveSessions int) (UploadSession, error)
	FindByID(ctx context.Context, id uuid.UUID) (UploadSession, error)
	// Confirm atomically marks the session completed, transitions the
	// owning media row to processing with the authoritative size and mime
	// type, and creates the processing request and its outbox event. A
	// duplicate call for an already-completed session returns the
	// existing media without mutating anything again.
	Confirm(ctx context.Context, sessionID uuid.UUID, sizeBytes int64, mimeType string, options []string, audioVoice string, promptOverrides map[string]string, idempotencyKey string) (media.Media, error)
	// FindConfirmedMedia returns the media row created by an
	// already-completed session, for idempotent ConfirmUpload replay.
	FindConfirmedMedia(ctx context.Context, mediaID uuid.UUID) (media.Media, error)
}

// ObjectStore presigns upload URLs and reads authoritative object
// metadata. objectstore.Client implements it.
type ObjectStore interface {
	PresignPutObject(ctx context.Context, objectKey string, expires time.Duration) (string, error)
	StatObject(ctx context.Context, objectKey string) (objectstore.ObjectInfo, error)
}

// Service creates and confirms upload sessions.
type Service struct {
	repo               Repository
	store              ObjectStore
	maxSourceSizeBytes int64
	maxActiveSessions  int
	sessionTTL         time.Duration
}

// NewService returns a Service enforcing the given launch limits
// (ADR 0004).
func NewService(repo Repository, store ObjectStore, maxSourceSizeBytes int64, maxActiveSessions int, sessionTTL time.Duration) *Service {
	return &Service{
		repo:               repo,
		store:              store,
		maxSourceSizeBytes: maxSourceSizeBytes,
		maxActiveSessions:  maxActiveSessions,
		sessionTTL:         sessionTTL,
	}
}

// CreateUploadSession validates in and, once the underlying rows are
// created, returns a session carrying a freshly presigned upload URL.
func (s *Service) CreateUploadSession(ctx context.Context, in NewUploadSession) (UploadSession, error) {
	mediaType, ok := allowedMimeTypes[in.MimeType]
	if !ok {
		return UploadSession{}, fmt.Errorf("%w: %s", ErrUnsupportedMimeType, in.MimeType)
	}
	if in.DeclaredSizeBytes <= 0 || in.DeclaredSizeBytes > s.maxSourceSizeBytes {
		return UploadSession{}, ErrDeclaredSizeExceeded
	}

	mediaID := uuid.New()
	sessionID := uuid.New()
	objectKey := fmt.Sprintf("media/%s/source", mediaID)
	expiresAt := time.Now().Add(s.sessionTTL)

	session, err := s.repo.Create(ctx, mediaID, sessionID, in, mediaType, objectKey, expiresAt, s.maxActiveSessions)
	if err != nil {
		return UploadSession{}, err
	}

	if session.Status == StatusActive {
		url, err := s.store.PresignPutObject(ctx, session.ObjectKey, time.Until(session.ExpiresAt))
		if err != nil {
			return UploadSession{}, err
		}
		session.UploadURL = url
	}
	return session, nil
}

// ConfirmUploadCommand is the input to ConfirmUpload.
type ConfirmUploadCommand struct {
	SessionID uuid.UUID
	Options   []string
	// AudioVoice overrides conductor-worker's static default TTS voice for
	// this workflow's generate_audio_summary step, if that option is
	// selected. Empty means "use the worker's default".
	AudioVoice string
	// PromptOverrides maps a selected option id (e.g. "summarize") to a
	// custom instruction string worker appends to that step's LLM prompt.
	PromptOverrides map[string]string
	IdempotencyKey  string
}

// ConfirmUpload reads authoritative object metadata for the session's
// object key and, once accepted, atomically creates the processing
// request and outbox event.
func (s *Service) ConfirmUpload(ctx context.Context, cmd ConfirmUploadCommand) (media.Media, error) {
	session, err := s.repo.FindByID(ctx, cmd.SessionID)
	if err != nil {
		return media.Media{}, err
	}

	if session.Status != StatusActive {
		if session.Status == StatusCompleted {
			return s.repo.FindConfirmedMedia(ctx, session.MediaID)
		}
		return media.Media{}, ErrSessionNotActive
	}
	if time.Now().After(session.ExpiresAt) {
		return media.Media{}, ErrSessionExpired
	}

	info, err := s.store.StatObject(ctx, session.ObjectKey)
	if err != nil {
		if errors.Is(err, objectstore.ErrObjectMissing) {
			return media.Media{}, ErrObjectMissing
		}
		return media.Media{}, err
	}
	if info.SizeBytes == 0 {
		return media.Media{}, ErrObjectEmpty
	}
	if info.SizeBytes > s.maxSourceSizeBytes {
		return media.Media{}, ErrObjectOversize
	}

	return s.repo.Confirm(ctx, session.ID, info.SizeBytes, info.ContentType, cmd.Options, cmd.AudioVoice, cmd.PromptOverrides, cmd.IdempotencyKey)
}
