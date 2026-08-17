// Package promptsettings owns per-user, per-section custom LLM system
// prompts: the Settings > Prompts screen's backing store. A section is a
// processing option id (e.g. "summarize") — see media's Repository for
// the canonical set.
package promptsettings

import (
	"context"
	"errors"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/google/uuid"
)

// MaxPromptLength is the character cap enforced both here and by the
// user_prompt_settings.prompt_text CHECK constraint.
const MaxPromptLength = 500

// Sections are the processing options a custom prompt can be attached to —
// every option that reaches an LLM. generate_audio_summary and transcribe
// are excluded: TTS and transcription take no LLM prompt to append to.
var Sections = map[string]bool{
	"summarize":         true,
	"extract_keywords":  true,
	"extract_keypoints": true,
	"generate_notes":    true,
}

var ErrInvalidSection = errors.New("promptsettings: unknown section")
var ErrPromptTooLong = errors.New("promptsettings: prompt exceeds 500 characters")

// Setting is one user's custom prompt for one section.
type Setting struct {
	UserID     uuid.UUID
	Section    string
	PromptText string
	UpdatedAt  time.Time
}

// Repository is the persistence boundary Service depends on. It is
// implemented by internal/store.
type Repository interface {
	List(ctx context.Context, userID uuid.UUID) ([]Setting, error)
	Upsert(ctx context.Context, userID uuid.UUID, section, promptText string) (Setting, error)
}

// Service is the promptsettings application service.
type Service struct {
	repo Repository
}

// NewService returns a Service.
func NewService(repo Repository) *Service {
	return &Service{repo: repo}
}

// List returns every prompt setting the user has saved.
func (s *Service) List(ctx context.Context, userID uuid.UUID) ([]Setting, error) {
	return s.repo.List(ctx, userID)
}

// Upsert validates section and promptText, then creates or replaces the
// user's setting for that section.
func (s *Service) Upsert(ctx context.Context, userID uuid.UUID, section, promptText string) (Setting, error) {
	if !Sections[section] {
		return Setting{}, ErrInvalidSection
	}
	promptText = strings.TrimSpace(promptText)
	if utf8.RuneCountInString(promptText) > MaxPromptLength {
		return Setting{}, ErrPromptTooLong
	}
	return s.repo.Upsert(ctx, userID, section, promptText)
}
