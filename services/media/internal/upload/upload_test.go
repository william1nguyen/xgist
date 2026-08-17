package upload_test

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/nolannguyen1212/media-notes/services/media/internal/media"
	"github.com/nolannguyen1212/media-notes/services/media/internal/objectstore"
	"github.com/nolannguyen1212/media-notes/services/media/internal/upload"
)

type fakeRepo struct {
	byID             map[uuid.UUID]upload.UploadSession
	byIdempotencyKey map[string]upload.UploadSession
	confirmedMedia   map[uuid.UUID]media.Media
	activeCount      int
}

func newFakeRepo() *fakeRepo {
	return &fakeRepo{
		byID:             map[uuid.UUID]upload.UploadSession{},
		byIdempotencyKey: map[string]upload.UploadSession{},
		confirmedMedia:   map[uuid.UUID]media.Media{},
	}
}

func (f *fakeRepo) Create(ctx context.Context, mediaID, sessionID uuid.UUID, in upload.NewUploadSession, mediaType media.Type, objectKey string, expiresAt time.Time, maxActiveSessions int) (upload.UploadSession, error) {
	if existing, ok := f.byIdempotencyKey[in.IdempotencyKey]; ok {
		return existing, nil
	}
	if f.activeCount >= maxActiveSessions {
		return upload.UploadSession{}, upload.ErrTooManyActiveSessions
	}
	f.activeCount++
	s := upload.UploadSession{
		ID:        sessionID,
		MediaID:   mediaID,
		OwnerID:   in.OwnerID,
		ObjectKey: objectKey,
		Status:    upload.StatusActive,
		ExpiresAt: expiresAt,
	}
	f.byID[sessionID] = s
	f.byIdempotencyKey[in.IdempotencyKey] = s
	return s, nil
}

func (f *fakeRepo) FindByID(ctx context.Context, id uuid.UUID) (upload.UploadSession, error) {
	s, ok := f.byID[id]
	if !ok {
		return upload.UploadSession{}, upload.ErrNotFound
	}
	return s, nil
}

func (f *fakeRepo) Confirm(ctx context.Context, sessionID uuid.UUID, sizeBytes int64, mimeType string, options []string, audioVoice string, promptOverrides map[string]string, idempotencyKey string) (media.Media, error) {
	s := f.byID[sessionID]
	s.Status = upload.StatusCompleted
	f.byID[sessionID] = s

	m := media.Media{
		ID:        s.MediaID,
		OwnerID:   s.OwnerID,
		SizeBytes: sizeBytes,
		MimeType:  mimeType,
		Status:    media.StatusProcessing,
	}
	f.confirmedMedia[s.MediaID] = m
	return m, nil
}

func (f *fakeRepo) FindConfirmedMedia(ctx context.Context, mediaID uuid.UUID) (media.Media, error) {
	m, ok := f.confirmedMedia[mediaID]
	if !ok {
		return media.Media{}, media.ErrNotFound
	}
	return m, nil
}

type fakeObjectStore struct {
	presignErr error
	statInfo   objectstore.ObjectInfo
	statErr    error
}

func (f *fakeObjectStore) PresignPutObject(ctx context.Context, objectKey string, expires time.Duration) (string, error) {
	if f.presignErr != nil {
		return "", f.presignErr
	}
	return "https://minio.local/" + objectKey, nil
}

func (f *fakeObjectStore) StatObject(ctx context.Context, objectKey string) (objectstore.ObjectInfo, error) {
	return f.statInfo, f.statErr
}

func TestCreateUploadSession(t *testing.T) {
	t.Run("rejects an unsupported mime type", func(t *testing.T) {
		svc := upload.NewService(newFakeRepo(), &fakeObjectStore{}, 500, 3, time.Hour)
		_, err := svc.CreateUploadSession(context.Background(), upload.NewUploadSession{
			OwnerID: uuid.New(), Title: "t", MimeType: "application/zip", DeclaredSizeBytes: 100, IdempotencyKey: "k1",
		})
		if !errors.Is(err, upload.ErrUnsupportedMimeType) {
			t.Fatalf("got %v, want ErrUnsupportedMimeType", err)
		}
	})

	t.Run("rejects a declared size over the maximum", func(t *testing.T) {
		svc := upload.NewService(newFakeRepo(), &fakeObjectStore{}, 500, 3, time.Hour)
		_, err := svc.CreateUploadSession(context.Background(), upload.NewUploadSession{
			OwnerID: uuid.New(), Title: "t", MimeType: "video/mp4", DeclaredSizeBytes: 501, IdempotencyKey: "k1",
		})
		if !errors.Is(err, upload.ErrDeclaredSizeExceeded) {
			t.Fatalf("got %v, want ErrDeclaredSizeExceeded", err)
		}
	})

	t.Run("returns a session with a presigned upload URL", func(t *testing.T) {
		svc := upload.NewService(newFakeRepo(), &fakeObjectStore{}, 500, 3, time.Hour)
		session, err := svc.CreateUploadSession(context.Background(), upload.NewUploadSession{
			OwnerID: uuid.New(), Title: "t", MimeType: "video/mp4", DeclaredSizeBytes: 100, IdempotencyKey: "k1",
		})
		if err != nil {
			t.Fatalf("CreateUploadSession: %v", err)
		}
		if session.UploadURL == "" {
			t.Error("expected a non-empty upload URL")
		}
		if session.Status != upload.StatusActive {
			t.Errorf("status = %v, want active", session.Status)
		}
	})

	t.Run("rejects a fourth active session", func(t *testing.T) {
		repo := newFakeRepo()
		svc := upload.NewService(repo, &fakeObjectStore{}, 500, 3, time.Hour)
		for i := 0; i < 3; i++ {
			if _, err := svc.CreateUploadSession(context.Background(), upload.NewUploadSession{
				OwnerID: uuid.New(), Title: "t", MimeType: "video/mp4", DeclaredSizeBytes: 100, IdempotencyKey: uuid.NewString(),
			}); err != nil {
				t.Fatalf("session %d: %v", i, err)
			}
		}
		_, err := svc.CreateUploadSession(context.Background(), upload.NewUploadSession{
			OwnerID: uuid.New(), Title: "t", MimeType: "video/mp4", DeclaredSizeBytes: 100, IdempotencyKey: uuid.NewString(),
		})
		if !errors.Is(err, upload.ErrTooManyActiveSessions) {
			t.Fatalf("got %v, want ErrTooManyActiveSessions", err)
		}
	})
}

func TestConfirmUpload(t *testing.T) {
	newActiveSession := func(t *testing.T, repo *fakeRepo, store *fakeObjectStore) upload.UploadSession {
		t.Helper()
		svc := upload.NewService(repo, store, 500, 3, time.Hour)
		s, err := svc.CreateUploadSession(context.Background(), upload.NewUploadSession{
			OwnerID: uuid.New(), Title: "t", MimeType: "video/mp4", DeclaredSizeBytes: 100, IdempotencyKey: uuid.NewString(),
		})
		if err != nil {
			t.Fatalf("CreateUploadSession: %v", err)
		}
		return s
	}

	t.Run("rejects a missing object", func(t *testing.T) {
		repo := newFakeRepo()
		store := &fakeObjectStore{statErr: objectstore.ErrObjectMissing}
		session := newActiveSession(t, repo, store)
		svc := upload.NewService(repo, store, 500, 3, time.Hour)

		_, err := svc.ConfirmUpload(context.Background(), upload.ConfirmUploadCommand{SessionID: session.ID, IdempotencyKey: "c1"})
		if !errors.Is(err, upload.ErrObjectMissing) {
			t.Fatalf("got %v, want ErrObjectMissing", err)
		}
	})

	t.Run("rejects an empty object", func(t *testing.T) {
		repo := newFakeRepo()
		store := &fakeObjectStore{statInfo: objectstore.ObjectInfo{SizeBytes: 0}}
		session := newActiveSession(t, repo, store)
		svc := upload.NewService(repo, store, 500, 3, time.Hour)

		_, err := svc.ConfirmUpload(context.Background(), upload.ConfirmUploadCommand{SessionID: session.ID, IdempotencyKey: "c1"})
		if !errors.Is(err, upload.ErrObjectEmpty) {
			t.Fatalf("got %v, want ErrObjectEmpty", err)
		}
	})

	t.Run("rejects an oversized object", func(t *testing.T) {
		repo := newFakeRepo()
		store := &fakeObjectStore{statInfo: objectstore.ObjectInfo{SizeBytes: 1000}}
		session := newActiveSession(t, repo, store)
		svc := upload.NewService(repo, store, 500, 3, time.Hour)

		_, err := svc.ConfirmUpload(context.Background(), upload.ConfirmUploadCommand{SessionID: session.ID, IdempotencyKey: "c1"})
		if !errors.Is(err, upload.ErrObjectOversize) {
			t.Fatalf("got %v, want ErrObjectOversize", err)
		}
	})

	t.Run("confirms a valid object and is idempotent on replay", func(t *testing.T) {
		repo := newFakeRepo()
		store := &fakeObjectStore{statInfo: objectstore.ObjectInfo{SizeBytes: 200, ContentType: "video/mp4"}}
		session := newActiveSession(t, repo, store)
		svc := upload.NewService(repo, store, 500, 3, time.Hour)

		m, err := svc.ConfirmUpload(context.Background(), upload.ConfirmUploadCommand{SessionID: session.ID, Options: []string{"transcribe"}, IdempotencyKey: "c1"})
		if err != nil {
			t.Fatalf("ConfirmUpload: %v", err)
		}
		if m.SizeBytes != 200 {
			t.Errorf("size_bytes = %d, want 200", m.SizeBytes)
		}

		again, err := svc.ConfirmUpload(context.Background(), upload.ConfirmUploadCommand{SessionID: session.ID, IdempotencyKey: "c1"})
		if err != nil {
			t.Fatalf("ConfirmUpload (replay): %v", err)
		}
		if again.ID != m.ID {
			t.Errorf("replay returned a different media id")
		}
	})
}
