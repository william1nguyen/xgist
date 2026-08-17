package media_test

import (
	"context"
	"errors"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/nolannguyen1212/media-notes/services/media/internal/media"
)

type fakeRepo struct {
	byID map[uuid.UUID]media.Media
}

func (f *fakeRepo) FindByID(ctx context.Context, id uuid.UUID) (media.Media, error) {
	m, ok := f.byID[id]
	if !ok {
		return media.Media{}, media.ErrNotFound
	}
	return m, nil
}

func (f *fakeRepo) List(ctx context.Context, ownerID uuid.UUID, cursor string, pageSize int, search string) (media.Page, error) {
	var items []media.Media
	for _, m := range f.byID {
		if m.OwnerID == ownerID && m.Status != media.StatusDeletionPending &&
			(search == "" || strings.Contains(strings.ToLower(m.Title), strings.ToLower(search))) {
			items = append(items, m)
		}
	}
	if len(items) > pageSize {
		items = items[:pageSize]
	}
	return media.Page{Items: items}, nil
}

func (f *fakeRepo) ApplyWorkflowStatus(ctx context.Context, mediaID uuid.UUID, status media.Status) error {
	m, ok := f.byID[mediaID]
	if !ok || m.Status == media.StatusDeletionPending {
		return nil
	}
	m.Status = status
	f.byID[mediaID] = m
	return nil
}

func (f *fakeRepo) Update(ctx context.Context, id uuid.UUID, title, description *string) (media.Media, error) {
	m, ok := f.byID[id]
	if !ok {
		return media.Media{}, media.ErrNotFound
	}
	if title != nil {
		m.Title = *title
	}
	if description != nil {
		m.Description = *description
	}
	f.byID[id] = m
	return m, nil
}

func (f *fakeRepo) RequestProcessing(ctx context.Context, id uuid.UUID, idempotencyKey string, options []string, audioVoice string, promptOverrides map[string]string) (media.Media, error) {
	m, ok := f.byID[id]
	if !ok {
		return media.Media{}, media.ErrNotFound
	}
	if !m.Status.IsTerminal() {
		return media.Media{}, media.ErrNotProcessable
	}
	m.Status = media.StatusProcessing
	f.byID[id] = m
	return m, nil
}

func (f *fakeRepo) FindProgress(ctx context.Context, ownerID uuid.UUID, ids []uuid.UUID) ([]media.Progress, error) {
	var out []media.Progress
	for _, id := range ids {
		m, ok := f.byID[id]
		if !ok || m.OwnerID != ownerID || m.Status == media.StatusDeletionPending {
			continue
		}
		out = append(out, media.Progress{MediaID: m.ID, Status: m.Status, UpdatedAt: m.UpdatedAt})
	}
	return out, nil
}

type fakeSigner struct {
	url string
	err error
}

func (f *fakeSigner) PresignGetObject(ctx context.Context, objectKey string, expires time.Duration) (string, error) {
	return f.url, f.err
}

func TestGetMedia(t *testing.T) {
	id := uuid.New()
	repo := &fakeRepo{byID: map[uuid.UUID]media.Media{
		id: {ID: id, Status: media.StatusCompleted},
	}}
	svc := media.NewService(repo, &fakeSigner{}, 15*time.Minute)

	t.Run("returns an existing item", func(t *testing.T) {
		m, err := svc.GetMedia(context.Background(), id)
		if err != nil {
			t.Fatalf("GetMedia: %v", err)
		}
		if m.ID != id {
			t.Errorf("id = %v, want %v", m.ID, id)
		}
	})

	t.Run("hides a deletion_pending item", func(t *testing.T) {
		pendingID := uuid.New()
		repo.byID[pendingID] = media.Media{ID: pendingID, Status: media.StatusDeletionPending}
		_, err := svc.GetMedia(context.Background(), pendingID)
		if !errors.Is(err, media.ErrNotFound) {
			t.Fatalf("got %v, want ErrNotFound", err)
		}
	})
}

func TestListMediaClampsPageSize(t *testing.T) {
	owner := uuid.New()
	repo := &fakeRepo{byID: map[uuid.UUID]media.Media{}}
	for i := 0; i < 150; i++ {
		id := uuid.New()
		repo.byID[id] = media.Media{ID: id, OwnerID: owner, Status: media.StatusCompleted}
	}
	svc := media.NewService(repo, &fakeSigner{}, 15*time.Minute)

	page, err := svc.ListMedia(context.Background(), owner, "", 1000, "")
	if err != nil {
		t.Fatalf("ListMedia: %v", err)
	}
	if len(page.Items) != 100 {
		t.Errorf("page size = %d, want capped at 100", len(page.Items))
	}
}

func TestSignPlaybackURL(t *testing.T) {
	id := uuid.New()
	repo := &fakeRepo{byID: map[uuid.UUID]media.Media{
		id: {ID: id, ObjectKey: "media/x/source", Status: media.StatusCompleted},
	}}
	svc := media.NewService(repo, &fakeSigner{url: "https://minio.local/media/x/source"}, 15*time.Minute)

	url, expiresAt, err := svc.SignPlaybackURL(context.Background(), id)
	if err != nil {
		t.Fatalf("SignPlaybackURL: %v", err)
	}
	if url == "" {
		t.Error("expected a non-empty URL")
	}
	if !expiresAt.After(time.Now()) {
		t.Error("expected expiresAt in the future")
	}
}

func TestApplyWorkflowStatus(t *testing.T) {
	id := uuid.New()
	repo := &fakeRepo{byID: map[uuid.UUID]media.Media{
		id: {ID: id, Status: media.StatusProcessing},
	}}
	svc := media.NewService(repo, &fakeSigner{}, 15*time.Minute)

	if err := svc.ApplyWorkflowStatus(context.Background(), id, media.StatusCompleted); err != nil {
		t.Fatalf("ApplyWorkflowStatus: %v", err)
	}
	if repo.byID[id].Status != media.StatusCompleted {
		t.Errorf("status = %v, want completed", repo.byID[id].Status)
	}
}

func TestUpdateMediaChangesOnlySetFields(t *testing.T) {
	id := uuid.New()
	repo := &fakeRepo{byID: map[uuid.UUID]media.Media{
		id: {ID: id, Title: "old title", Description: "old description", Status: media.StatusCompleted},
	}}
	svc := media.NewService(repo, &fakeSigner{}, 15*time.Minute)

	newTitle := "new title"
	m, err := svc.UpdateMedia(context.Background(), id, &newTitle, nil)
	if err != nil {
		t.Fatalf("UpdateMedia: %v", err)
	}
	if m.Title != "new title" {
		t.Errorf("title = %q, want %q", m.Title, "new title")
	}
	if m.Description != "old description" {
		t.Errorf("description = %q, want unchanged %q", m.Description, "old description")
	}
}

func TestRequestProcessingRejectsNonTerminalStatus(t *testing.T) {
	id := uuid.New()
	repo := &fakeRepo{byID: map[uuid.UUID]media.Media{
		id: {ID: id, Status: media.StatusProcessing},
	}}
	svc := media.NewService(repo, &fakeSigner{}, 15*time.Minute)

	_, err := svc.RequestProcessing(context.Background(), media.RequestProcessingCommand{
		MediaID: id, Options: []string{"summarize"},
	})
	if !errors.Is(err, media.ErrNotProcessable) {
		t.Fatalf("got %v, want ErrNotProcessable", err)
	}
}

func TestRequestProcessingAcceptsTerminalStatus(t *testing.T) {
	id := uuid.New()
	repo := &fakeRepo{byID: map[uuid.UUID]media.Media{
		id: {ID: id, Status: media.StatusFailed},
	}}
	svc := media.NewService(repo, &fakeSigner{}, 15*time.Minute)

	m, err := svc.RequestProcessing(context.Background(), media.RequestProcessingCommand{
		MediaID: id, Options: []string{"summarize"},
	})
	if err != nil {
		t.Fatalf("RequestProcessing: %v", err)
	}
	if m.Status != media.StatusProcessing {
		t.Errorf("status = %v, want processing", m.Status)
	}
}

func TestGetProgressOmitsUnauthorizedAndUnknownIDs(t *testing.T) {
	owner := uuid.New()
	owned := uuid.New()
	notOwned := uuid.New()
	unknown := uuid.New()
	repo := &fakeRepo{byID: map[uuid.UUID]media.Media{
		owned:    {ID: owned, OwnerID: owner, Status: media.StatusCompleted},
		notOwned: {ID: notOwned, OwnerID: uuid.New(), Status: media.StatusCompleted},
	}}
	svc := media.NewService(repo, &fakeSigner{}, 15*time.Minute)

	items, err := svc.GetProgress(context.Background(), owner, []uuid.UUID{owned, notOwned, unknown})
	if err != nil {
		t.Fatalf("GetProgress: %v", err)
	}
	if len(items) != 1 || items[0].MediaID != owned {
		t.Errorf("items = %+v, want only %v", items, owned)
	}
}
