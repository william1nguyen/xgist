// Package content owns transcript, ordered segments, summaries, citations,
// keywords, keypoints, notes, and summary-audio metadata for one media
// item — everything docs/services/content.md assigns to the content
// service, except its deletion participant role, which lives in
// internal/deletion.
package content

import (
	"errors"
	"fmt"
	"time"

	"context"

	"github.com/google/uuid"
)

var (
	// ErrNotFound is returned for a media item with no stored content, and
	// for a media item whose deletion has started: a pending deletion is
	// immediately excluded from normal read and write operations, per
	// ADR 0006.
	ErrNotFound = errors.New("content: not found")
	// ErrDeletionPending is returned by a Store* call for a media item
	// whose deletion has started. Mutation is rejected outright rather
	// than silently accepted and then deleted, per ADR 0006.
	ErrDeletionPending = errors.New("content: media deletion pending")
	// ErrStaleAttempt is returned when a Store* call's attempt number is
	// lower than the highest attempt already applied for that step: a
	// late-arriving retry of an earlier attempt must not overwrite a
	// newer result.
	ErrStaleAttempt = errors.New("content: stale attempt")
	// ErrInvalidSegments is returned when transcript segments are not
	// contiguously ordered from index 0, or a segment's end precedes its
	// start, or segments overlap.
	ErrInvalidSegments = errors.New("content: invalid segment ordering")
	// ErrUnknownSegment is returned when a citation or keypoint range
	// references a transcript segment index that does not exist for the
	// media item.
	ErrUnknownSegment = errors.New("content: citation references unknown segment")
)

// TranscriptSegment is one ordered, timestamped span of a transcript.
type TranscriptSegment struct {
	SegmentIndex int
	StartMs      int64
	EndMs        int64
	Speaker      string
	Text         string
}

// Transcript is one media item's full transcript and ordered segments.
type Transcript struct {
	MediaID  uuid.UUID
	Language string
	Text     string
	Segments []TranscriptSegment
	Version  int
}

// SummarySentence is one sentence of a summary and the transcript segments
// it cites as evidence.
type SummarySentence struct {
	SentenceIndex       int
	Text                string
	CitedSegmentIndexes []int
}

// Summary is generated summary text of one type for one media item.
type Summary struct {
	SummaryType   string
	Text          string
	Model         string
	PromptVersion string
	Sentences     []SummarySentence
	CreatedAt     time.Time
}

// Keyword is one extracted keyword and its relevance score.
type Keyword struct {
	Keyword  string
	Score    float64
	Position int
}

// Keypoint is one extracted keypoint and the transcript segment range it
// summarizes.
type Keypoint struct {
	PointIndex   int
	Text         string
	StartSegment int
	EndSegment   int
}

// Note is one generated note document in a given format.
type Note struct {
	Format    string
	Body      string
	CreatedAt time.Time
}

// AudioStatus is the lifecycle state of one summary-audio object.
type AudioStatus string

const (
	AudioStatusReady  AudioStatus = "ready"
	AudioStatusFailed AudioStatus = "failed"
)

// SummaryAudio is the metadata of one durable summary-audio object.
// content never stores the audio bytes themselves.
type SummaryAudio struct {
	SummaryType string
	ObjectKey   string
	MimeType    string
	DurationMs  int64
	Voice       string
	Status      AudioStatus
}

// Content is every generated artifact stored for one media item.
type Content struct {
	MediaID       uuid.UUID
	Transcript    *Transcript
	Summaries     []Summary
	Keywords      []Keyword
	Keypoints     []Keypoint
	Notes         []Note
	SummaryAudios []SummaryAudio
	Version       int
}

// Version is the durable version of one media item's content record after
// a write.
type Version struct {
	MediaID   uuid.UUID
	Version   int
	UpdatedAt time.Time
}

// Step names identify which workflow step a Store* call and its resulting
// mn.processing.step.completed.v1 event belong to, per
// docs/architecture.md's enrichment step names. Summary, summary-audio,
// and notes steps are further scoped by their type/format (StepKey) since
// a media item can hold more than one of each.
const (
	StepTranscript   = "transcribe"
	StepSummary      = "summary"
	StepKeywords     = "keywords"
	StepKeypoints    = "keypoints"
	StepNotes        = "notes"
	StepSummaryAudio = "summary_audio"
)

// StepKey returns the stale-attempt/idempotency tracking key for a step
// scoped by subtype (summary_type or note format). subtype is empty for
// transcript, keywords, and keypoints, which have exactly one instance per
// media item.
func StepKey(step, subtype string) string {
	if subtype == "" {
		return step
	}
	return step + ":" + subtype
}

// StoreTranscriptCommand carries the inputs to commit one transcript.
type StoreTranscriptCommand struct {
	IdempotencyKey string
	MediaID        uuid.UUID
	WorkflowID     uuid.UUID
	Attempt        int
	Language       string
	Text           string
	Segments       []TranscriptSegment
}

// StoreSummaryCommand carries the inputs to commit one summary.
type StoreSummaryCommand struct {
	IdempotencyKey string
	MediaID        uuid.UUID
	WorkflowID     uuid.UUID
	Attempt        int
	SummaryType    string
	Text           string
	Model          string
	PromptVersion  string
	Sentences      []SummarySentence
}

// StoreKeywordsCommand carries the inputs to replace the stored keyword
// set.
type StoreKeywordsCommand struct {
	IdempotencyKey string
	MediaID        uuid.UUID
	WorkflowID     uuid.UUID
	Attempt        int
	Keywords       []Keyword
}

// StoreKeypointsCommand carries the inputs to replace the stored keypoint
// set.
type StoreKeypointsCommand struct {
	IdempotencyKey string
	MediaID        uuid.UUID
	WorkflowID     uuid.UUID
	Attempt        int
	Keypoints      []Keypoint
}

// StoreNotesCommand carries the inputs to commit one note document.
type StoreNotesCommand struct {
	IdempotencyKey string
	MediaID        uuid.UUID
	WorkflowID     uuid.UUID
	Attempt        int
	Format         string
	Body           string
}

// StoreSummaryAudioCommand carries the inputs to commit one summary-audio
// object's metadata.
type StoreSummaryAudioCommand struct {
	IdempotencyKey string
	MediaID        uuid.UUID
	WorkflowID     uuid.UUID
	Attempt        int
	SummaryType    string
	ObjectKey      string
	MimeType       string
	DurationMs     int64
	Voice          string
}

// Repository is the persistence boundary Service depends on. Every Store*
// method commits its write and the mn.processing.step.completed.v1 outbox
// event in one transaction, and returns (applied=false, currentVersion,
// nil) instead of reapplying when idempotencyKey was already recorded for
// that step. It is implemented by internal/store.
type Repository interface {
	StoreTranscript(ctx context.Context, cmd StoreTranscriptCommand) (Version, error)
	FindTranscript(ctx context.Context, mediaID uuid.UUID) (Transcript, error)
	StoreSummary(ctx context.Context, cmd StoreSummaryCommand) (Version, error)
	StoreKeywords(ctx context.Context, cmd StoreKeywordsCommand) (Version, error)
	StoreKeypoints(ctx context.Context, cmd StoreKeypointsCommand) (Version, error)
	StoreNotes(ctx context.Context, cmd StoreNotesCommand) (Version, error)
	StoreSummaryAudio(ctx context.Context, cmd StoreSummaryAudioCommand) (Version, error)
	FindContent(ctx context.Context, mediaID uuid.UUID) (Content, error)
}

// DeletionChecker reports whether a media item's deletion has started.
// deletion.Service implements it. A Store* call for a pending-deletion
// media item is rejected outright rather than silently accepted and then
// deleted, per ADR 0006.
type DeletionChecker interface {
	IsDeletionPending(ctx context.Context, mediaID uuid.UUID) (bool, error)
}

// Service validates and commits generated content, and serves transcript
// and content reads.
type Service struct {
	repo      Repository
	deletions DeletionChecker
}

// NewService returns a Service.
func NewService(repo Repository, deletions DeletionChecker) *Service {
	return &Service{repo: repo, deletions: deletions}
}

func (s *Service) rejectIfDeletionPending(ctx context.Context, mediaID uuid.UUID) error {
	pending, err := s.deletions.IsDeletionPending(ctx, mediaID)
	if err != nil {
		return err
	}
	if pending {
		return ErrDeletionPending
	}
	return nil
}

// StoreTranscript validates segment ordering and commits the transcript.
func (s *Service) StoreTranscript(ctx context.Context, cmd StoreTranscriptCommand) (Version, error) {
	if err := validateSegments(cmd.Segments); err != nil {
		return Version{}, err
	}
	if err := s.rejectIfDeletionPending(ctx, cmd.MediaID); err != nil {
		return Version{}, err
	}
	return s.repo.StoreTranscript(ctx, cmd)
}

// GetTranscript returns one media item's transcript.
func (s *Service) GetTranscript(ctx context.Context, mediaID uuid.UUID) (Transcript, error) {
	return s.repo.FindTranscript(ctx, mediaID)
}

// StoreSummary validates that every cited segment index exists in the
// stored transcript, then commits the summary.
func (s *Service) StoreSummary(ctx context.Context, cmd StoreSummaryCommand) (Version, error) {
	if cmd.SummaryType == "" {
		return Version{}, fmt.Errorf("%w: summary_type is required", ErrUnknownSegment)
	}
	if err := s.rejectIfDeletionPending(ctx, cmd.MediaID); err != nil {
		return Version{}, err
	}
	transcript, err := s.repo.FindTranscript(ctx, cmd.MediaID)
	if err != nil {
		return Version{}, err
	}
	known := segmentIndexSet(transcript.Segments)
	for _, sentence := range cmd.Sentences {
		for _, idx := range sentence.CitedSegmentIndexes {
			if !known[idx] {
				return Version{}, ErrUnknownSegment
			}
		}
	}
	return s.repo.StoreSummary(ctx, cmd)
}

// StoreKeywords replaces the stored keyword set.
func (s *Service) StoreKeywords(ctx context.Context, cmd StoreKeywordsCommand) (Version, error) {
	if err := s.rejectIfDeletionPending(ctx, cmd.MediaID); err != nil {
		return Version{}, err
	}
	return s.repo.StoreKeywords(ctx, cmd)
}

// StoreKeypoints validates that every referenced segment range exists in
// the stored transcript, then replaces the stored keypoint set.
func (s *Service) StoreKeypoints(ctx context.Context, cmd StoreKeypointsCommand) (Version, error) {
	if err := s.rejectIfDeletionPending(ctx, cmd.MediaID); err != nil {
		return Version{}, err
	}
	transcript, err := s.repo.FindTranscript(ctx, cmd.MediaID)
	if err != nil {
		return Version{}, err
	}
	known := segmentIndexSet(transcript.Segments)
	for _, kp := range cmd.Keypoints {
		if kp.EndSegment < kp.StartSegment || !known[kp.StartSegment] || !known[kp.EndSegment] {
			return Version{}, ErrUnknownSegment
		}
	}
	return s.repo.StoreKeypoints(ctx, cmd)
}

// StoreNotes commits one note document.
func (s *Service) StoreNotes(ctx context.Context, cmd StoreNotesCommand) (Version, error) {
	if err := s.rejectIfDeletionPending(ctx, cmd.MediaID); err != nil {
		return Version{}, err
	}
	return s.repo.StoreNotes(ctx, cmd)
}

// StoreSummaryAudioMetadata commits one summary-audio object's metadata.
func (s *Service) StoreSummaryAudioMetadata(ctx context.Context, cmd StoreSummaryAudioCommand) (Version, error) {
	if err := s.rejectIfDeletionPending(ctx, cmd.MediaID); err != nil {
		return Version{}, err
	}
	return s.repo.StoreSummaryAudio(ctx, cmd)
}

// GetContent returns every generated artifact stored for one media item.
func (s *Service) GetContent(ctx context.Context, mediaID uuid.UUID) (Content, error) {
	return s.repo.FindContent(ctx, mediaID)
}

// validateSegments requires segments to be contiguously indexed from 0,
// each with a non-negative, non-decreasing start time at or after the
// previous segment's end (no overlap).
func validateSegments(segments []TranscriptSegment) error {
	var prevEnd int64
	for i, seg := range segments {
		if seg.SegmentIndex != i {
			return ErrInvalidSegments
		}
		if seg.EndMs < seg.StartMs || seg.StartMs < 0 {
			return ErrInvalidSegments
		}
		if i > 0 && seg.StartMs < prevEnd {
			return ErrInvalidSegments
		}
		prevEnd = seg.EndMs
	}
	return nil
}

func segmentIndexSet(segments []TranscriptSegment) map[int]bool {
	set := make(map[int]bool, len(segments))
	for _, seg := range segments {
		set[seg.SegmentIndex] = true
	}
	return set
}
