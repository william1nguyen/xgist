package derivative_test

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/nolannguyen1212/media-notes/services/media/internal/derivative"
)

type derivativeKey struct {
	mediaID uuid.UUID
	dType   derivative.Type
	version int
}

type fakeRepo struct {
	byKey map[derivativeKey]derivative.Derivative
}

func newFakeRepo() *fakeRepo {
	return &fakeRepo{byKey: map[derivativeKey]derivative.Derivative{}}
}

func (f *fakeRepo) Register(ctx context.Context, in derivative.NewDerivative) (derivative.Derivative, error) {
	key := derivativeKey{in.MediaID, in.DerivativeType, in.Version}
	if existing, ok := f.byKey[key]; ok {
		return existing, nil
	}
	d := derivative.Derivative{
		ID:             uuid.New(),
		MediaID:        in.MediaID,
		DerivativeType: in.DerivativeType,
		Version:        in.Version,
		ObjectKey:      in.ObjectKey,
		MimeType:       in.MimeType,
		Width:          in.Width,
		Height:         in.Height,
		SizeBytes:      in.SizeBytes,
		Status:         derivative.StatusReady,
	}
	f.byKey[key] = d
	return d, nil
}

func (f *fakeRepo) FindLatestReady(ctx context.Context, mediaID uuid.UUID, derivativeType derivative.Type) (derivative.Derivative, error) {
	var best derivative.Derivative
	found := false
	for _, d := range f.byKey {
		if d.MediaID == mediaID && d.DerivativeType == derivativeType && d.Status == derivative.StatusReady {
			if !found || d.Version > best.Version {
				best = d
				found = true
			}
		}
	}
	if !found {
		return derivative.Derivative{}, derivative.ErrNotFound
	}
	return best, nil
}

type fakeSigner struct{ url string }

func (f *fakeSigner) PresignGetObject(ctx context.Context, objectKey string, expires time.Duration) (string, error) {
	return f.url, nil
}

func TestRegisterDerivativeIsIdempotent(t *testing.T) {
	repo := newFakeRepo()
	svc := derivative.NewService(repo, &fakeSigner{}, 15*time.Minute)
	mediaID := uuid.New()

	first, err := svc.RegisterDerivative(context.Background(), derivative.NewDerivative{
		MediaID: mediaID, DerivativeType: derivative.TypeThumbnail, Version: 1, ObjectKey: "media/x/thumbnail/v1.webp",
	})
	if err != nil {
		t.Fatalf("RegisterDerivative: %v", err)
	}

	second, err := svc.RegisterDerivative(context.Background(), derivative.NewDerivative{
		MediaID: mediaID, DerivativeType: derivative.TypeThumbnail, Version: 1, ObjectKey: "media/x/thumbnail/v1.webp",
	})
	if err != nil {
		t.Fatalf("RegisterDerivative (again): %v", err)
	}
	if first.ID != second.ID {
		t.Error("duplicate registration created a second row")
	}
}

func TestSignThumbnailURL(t *testing.T) {
	repo := newFakeRepo()
	svc := derivative.NewService(repo, &fakeSigner{url: "https://minio.local/thumb"}, 15*time.Minute)
	mediaID := uuid.New()

	t.Run("returns ok=false when no ready thumbnail exists", func(t *testing.T) {
		url, ok, err := svc.SignThumbnailURL(context.Background(), mediaID)
		if err != nil {
			t.Fatalf("SignThumbnailURL: %v", err)
		}
		if ok || url != "" {
			t.Errorf("got ok=%v url=%q, want ok=false and empty url", ok, url)
		}
	})

	t.Run("signs a URL once a thumbnail is ready", func(t *testing.T) {
		if _, err := svc.RegisterDerivative(context.Background(), derivative.NewDerivative{
			MediaID: mediaID, DerivativeType: derivative.TypeThumbnail, Version: 1, ObjectKey: "media/x/thumbnail/v1.webp",
		}); err != nil {
			t.Fatalf("RegisterDerivative: %v", err)
		}

		url, ok, err := svc.SignThumbnailURL(context.Background(), mediaID)
		if err != nil {
			t.Fatalf("SignThumbnailURL: %v", err)
		}
		if !ok || url == "" {
			t.Errorf("got ok=%v url=%q, want ok=true and a non-empty url", ok, url)
		}
	})
}
