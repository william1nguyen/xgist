package promptsettings_test

import (
	"context"
	"errors"
	"strings"
	"testing"

	"github.com/google/uuid"

	"github.com/nolannguyen1212/media-notes/services/identity/internal/promptsettings"
)

type fakeRepo struct {
	settings map[string]promptsettings.Setting
}

func newFakeRepo() *fakeRepo {
	return &fakeRepo{settings: map[string]promptsettings.Setting{}}
}

func (f *fakeRepo) List(_ context.Context, userID uuid.UUID) ([]promptsettings.Setting, error) {
	var out []promptsettings.Setting
	for _, s := range f.settings {
		if s.UserID == userID {
			out = append(out, s)
		}
	}
	return out, nil
}

func (f *fakeRepo) Upsert(_ context.Context, userID uuid.UUID, section, promptText string) (promptsettings.Setting, error) {
	s := promptsettings.Setting{UserID: userID, Section: section, PromptText: promptText}
	f.settings[userID.String()+":"+section] = s
	return s, nil
}

func TestServiceUpsert(t *testing.T) {
	userID := uuid.New()

	t.Run("rejects an unknown section", func(t *testing.T) {
		repo := newFakeRepo()
		svc := promptsettings.NewService(repo)
		_, err := svc.Upsert(context.Background(), userID, "generate_audio_summary", "be concise")
		if !errors.Is(err, promptsettings.ErrInvalidSection) {
			t.Fatalf("got %v, want ErrInvalidSection", err)
		}
	})

	t.Run("rejects a prompt over 500 characters", func(t *testing.T) {
		repo := newFakeRepo()
		svc := promptsettings.NewService(repo)
		_, err := svc.Upsert(context.Background(), userID, "summarize", strings.Repeat("a", 501))
		if !errors.Is(err, promptsettings.ErrPromptTooLong) {
			t.Fatalf("got %v, want ErrPromptTooLong", err)
		}
	})

	t.Run("saves a valid prompt and lists it back", func(t *testing.T) {
		repo := newFakeRepo()
		svc := promptsettings.NewService(repo)
		saved, err := svc.Upsert(context.Background(), userID, "summarize", "  be concise  ")
		if err != nil {
			t.Fatalf("upsert: %v", err)
		}
		if saved.PromptText != "be concise" {
			t.Fatalf("got prompt text %q, want trimmed %q", saved.PromptText, "be concise")
		}

		settings, err := svc.List(context.Background(), userID)
		if err != nil {
			t.Fatalf("list: %v", err)
		}
		if len(settings) != 1 || settings[0].Section != "summarize" {
			t.Fatalf("got %+v, want one summarize setting", settings)
		}
	})
}
