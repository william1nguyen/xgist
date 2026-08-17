// Package audiojob owns standalone audio generation: a media-independent
// "paste text, or describe it and let AI draft a script, then synthesize
// audio" feature. Unlike everything else content owns, a Job belongs
// directly to a user — it has no media_id, no workflow_id, and is never
// reached through conductor. See docs/services/worker.md's "Standalone
// audio generation" section for the end-to-end flow.
package audiojob

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
)

// Kind distinguishes the two job shapes a caller can submit.
type Kind string

const (
	// KindScript asks an LLM to draft narration text from a loose
	// description — output_text is the drafted script, never audio.
	KindScript Kind = "script"
	// KindAudio synthesizes input_text directly to speech.
	KindAudio Kind = "audio"
)

// Status is a job's lifecycle state — the same generating/completed/failed
// vocabulary every other async artifact in this app already exposes.
type Status string

const (
	StatusGenerating Status = "generating"
	StatusCompleted  Status = "completed"
	StatusFailed     Status = "failed"
)

var (
	ErrNotFound = errors.New("audiojob: not found")
	// ErrNotGenerating is returned by a Complete*/Fail call for a job that
	// has already left the generating state — a redelivered worker
	// callback, safe to treat as a no-op rather than an error.
	ErrNotGenerating = errors.New("audiojob: job is not generating")
)

// Job is one standalone script-draft or audio-generation request.
type Job struct {
	ID         uuid.UUID
	UserID     uuid.UUID
	Kind       Kind
	Status     Status
	InputText  string
	OutputText string
	Voice      string
	ObjectKey  string
	MimeType   string
	DurationMs int64
	ErrorCode  string
	CreatedAt  time.Time
	UpdatedAt  time.Time
}

// Page is one cursor-paginated slice of a user's jobs, newest first.
type Page struct {
	Items      []Job
	NextCursor string
}

// Repository is the persistence boundary Service depends on. It is
// implemented by internal/store.
type Repository interface {
	// RequestScriptDraft creates a generating KindScript job and queues
	// its mn.audio.job.requested.v1 outbox event, or returns the
	// existing job for a repeated idempotencyKey.
	RequestScriptDraft(ctx context.Context, userID uuid.UUID, idempotencyKey, description string) (Job, error)
	// RequestStandaloneAudio creates a generating KindAudio job and
	// queues its outbox event, or returns the existing job for a
	// repeated idempotencyKey.
	RequestStandaloneAudio(ctx context.Context, userID uuid.UUID, idempotencyKey, text, voice string) (Job, error)
	// CompleteScriptDraft transitions a generating KindScript job to
	// completed with its drafted text. Returns ErrNotGenerating (not an
	// error to the caller) for a job already terminal.
	CompleteScriptDraft(ctx context.Context, jobID uuid.UUID, scriptText string) (Job, error)
	// CompleteStandaloneAudio transitions a generating KindAudio job to
	// completed with its durable object metadata.
	CompleteStandaloneAudio(ctx context.Context, jobID uuid.UUID, objectKey, mimeType string, durationMs int64, voice string) (Job, error)
	// FailJob transitions a generating job of either kind to failed.
	FailJob(ctx context.Context, jobID uuid.UUID, errorCode string) (Job, error)
	FindByID(ctx context.Context, jobID uuid.UUID) (Job, error)
	// List returns userID's jobs of kind, newest first.
	List(ctx context.Context, userID uuid.UUID, kind Kind, cursor string, pageSize int) (Page, error)
}

// Service applies content's standalone-audio-job role.
type Service struct {
	repo Repository
}

// NewService returns a Service.
func NewService(repo Repository) *Service {
	return &Service{repo: repo}
}

func (s *Service) RequestScriptDraft(ctx context.Context, userID uuid.UUID, idempotencyKey, description string) (Job, error) {
	return s.repo.RequestScriptDraft(ctx, userID, idempotencyKey, description)
}

func (s *Service) RequestStandaloneAudio(ctx context.Context, userID uuid.UUID, idempotencyKey, text, voice string) (Job, error) {
	return s.repo.RequestStandaloneAudio(ctx, userID, idempotencyKey, text, voice)
}

func (s *Service) CompleteScriptDraft(ctx context.Context, jobID uuid.UUID, scriptText string) (Job, error) {
	return s.repo.CompleteScriptDraft(ctx, jobID, scriptText)
}

func (s *Service) CompleteStandaloneAudio(ctx context.Context, jobID uuid.UUID, objectKey, mimeType string, durationMs int64, voice string) (Job, error) {
	return s.repo.CompleteStandaloneAudio(ctx, jobID, objectKey, mimeType, durationMs, voice)
}

func (s *Service) FailJob(ctx context.Context, jobID uuid.UUID, errorCode string) (Job, error) {
	return s.repo.FailJob(ctx, jobID, errorCode)
}

func (s *Service) GetJob(ctx context.Context, jobID uuid.UUID) (Job, error) {
	return s.repo.FindByID(ctx, jobID)
}

func (s *Service) ListJobs(ctx context.Context, userID uuid.UUID, kind Kind, cursor string, pageSize int) (Page, error) {
	return s.repo.List(ctx, userID, kind, cursor, pageSize)
}
