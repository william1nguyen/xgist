package graphql_test

import (
	"context"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/nolannguyen1212/media-notes/services/hermes/internal/auth"
	"github.com/nolannguyen1212/media-notes/services/hermes/internal/clients"
	graphqlpkg "github.com/nolannguyen1212/media-notes/services/hermes/internal/graphql"
)

type fakeIdentity struct {
	users map[uuid.UUID]clients.User
}

func (f *fakeIdentity) Register(ctx context.Context, idempotencyKey, email, password, name string) (clients.User, error) {
	return clients.User{ID: uuid.New(), Email: email, Name: name}, nil
}
func (f *fakeIdentity) Authenticate(ctx context.Context, idempotencyKey, email, password string) (clients.Session, error) {
	return clients.Session{User: clients.User{Email: email}, Token: "tok"}, nil
}
func (f *fakeIdentity) ValidateSession(ctx context.Context, token string) (clients.Principal, error) {
	return clients.Principal{}, auth.ErrUnauthenticated
}
func (f *fakeIdentity) RevokeSession(ctx context.Context, sessionID uuid.UUID) error { return nil }
func (f *fakeIdentity) GetUser(ctx context.Context, userID uuid.UUID) (clients.User, error) {
	u, ok := f.users[userID]
	if !ok {
		return clients.User{}, graphqlpkg.ErrNotFound
	}
	return u, nil
}
func (f *fakeIdentity) RequestAccountDeletion(ctx context.Context, idempotencyKey string, userID uuid.UUID) (clients.DeletionOperation, error) {
	return clients.DeletionOperation{DeletionID: uuid.New(), UserID: userID, State: "pending"}, nil
}

type fakeBilling struct{}

func (f *fakeBilling) GetQuote(ctx context.Context, idempotencyKey string, userID uuid.UUID, options []string) (clients.Quote, error) {
	return clients.Quote{ID: uuid.New()}, nil
}
func (f *fakeBilling) GetBillingSummary(ctx context.Context, userID uuid.UUID) (clients.BillingSummary, error) {
	return clients.BillingSummary{}, nil
}

type fakeMedia struct {
	byID map[uuid.UUID]clients.Media
}

func (f *fakeMedia) CreateUploadSession(ctx context.Context, idempotencyKey string, ownerID uuid.UUID, title, mimeType string, declaredSizeBytes int64) (clients.UploadSession, error) {
	return clients.UploadSession{ID: uuid.New(), OwnerID: ownerID}, nil
}
func (f *fakeMedia) ConfirmUpload(ctx context.Context, idempotencyKey string, uploadSessionID uuid.UUID, options []string) (clients.Media, error) {
	return clients.Media{ID: uuid.New()}, nil
}
func (f *fakeMedia) GetMedia(ctx context.Context, mediaID uuid.UUID) (clients.Media, error) {
	m, ok := f.byID[mediaID]
	if !ok {
		return clients.Media{}, graphqlpkg.ErrNotFound
	}
	return m, nil
}
func (f *fakeMedia) ListMedia(ctx context.Context, ownerID uuid.UUID, cursor string, pageSize int32) (clients.MediaPage, error) {
	return clients.MediaPage{}, nil
}
func (f *fakeMedia) SignPlaybackURL(ctx context.Context, mediaID uuid.UUID) (string, time.Time, error) {
	return "https://example.test/signed", time.Now().Add(15 * time.Minute), nil
}
func (f *fakeMedia) GetMediaProgress(ctx context.Context, ownerID uuid.UUID, ids []uuid.UUID) ([]clients.MediaProgress, error) {
	return nil, nil
}

type fakeContent struct{}

func (f *fakeContent) GetContent(ctx context.Context, mediaID uuid.UUID) (clients.Content, error) {
	return clients.Content{MediaID: mediaID}, nil
}

func newTestResolver(t *testing.T, identity *fakeIdentity, media *fakeMedia) *graphqlpkg.Resolver {
	t.Helper()
	logger := slog.New(slog.NewTextHandler(io.Discard, nil))
	return graphqlpkg.NewResolver(identity, &fakeBilling{}, media, &fakeContent{}, nil, logger)
}

func TestMeRequiresAuthentication(t *testing.T) {
	r := newTestResolver(t, &fakeIdentity{users: map[uuid.UUID]clients.User{}}, &fakeMedia{})
	_, err := r.Query().Me(context.Background())
	if err == nil {
		t.Fatal("expected an error for an unauthenticated request")
	}
}

func TestMeReturnsAuthenticatedUser(t *testing.T) {
	userID := uuid.New()
	identity := &fakeIdentity{users: map[uuid.UUID]clients.User{userID: {ID: userID, Email: "a@example.test"}}}
	r := newTestResolver(t, identity, &fakeMedia{})

	ctx := withPrincipal(t, clients.Principal{User: clients.User{ID: userID}})

	got, err := r.Query().Me(ctx)
	if err != nil {
		t.Fatalf("Me: %v", err)
	}
	if got.Email != "a@example.test" {
		t.Errorf("email = %q, want %q", got.Email, "a@example.test")
	}
}

func TestMediaDetailOmitsUnauthorizedMedia(t *testing.T) {
	owner := uuid.New()
	otherOwner := uuid.New()
	mediaID := uuid.New()
	media := &fakeMedia{byID: map[uuid.UUID]clients.Media{mediaID: {ID: mediaID, OwnerID: otherOwner}}}
	r := newTestResolver(t, &fakeIdentity{}, media)

	ctx := withPrincipal(t, clients.Principal{User: clients.User{ID: owner}})
	_, err := r.Query().MediaDetail(ctx, mediaID.String())
	if err != graphqlpkg.ErrNotFound {
		t.Fatalf("got %v, want ErrNotFound for a media item owned by another user", err)
	}
}

func TestMediaDetailReturnsOwnedMediaWithPlaybackURL(t *testing.T) {
	owner := uuid.New()
	mediaID := uuid.New()
	media := &fakeMedia{byID: map[uuid.UUID]clients.Media{mediaID: {ID: mediaID, OwnerID: owner, Title: "t"}}}
	r := newTestResolver(t, &fakeIdentity{}, media)

	ctx := withPrincipal(t, clients.Principal{User: clients.User{ID: owner}})
	got, err := r.Query().MediaDetail(ctx, mediaID.String())
	if err != nil {
		t.Fatalf("MediaDetail: %v", err)
	}
	if got.PlaybackURL == nil || *got.PlaybackURL == "" {
		t.Error("expected a non-empty playback URL for owned media")
	}
}

func TestMediaProgressRejectsTooManyIDs(t *testing.T) {
	owner := uuid.New()
	r := newTestResolver(t, &fakeIdentity{}, &fakeMedia{})
	ctx := withPrincipal(t, clients.Principal{User: clients.User{ID: owner}})

	ids := make([]string, 51)
	for i := range ids {
		ids[i] = uuid.New().String()
	}
	_, err := r.Query().MediaProgress(ctx, ids)
	if err == nil {
		t.Fatal("expected an error for more than 50 ids")
	}
}

// withPrincipal returns a context carrying p, by actually running a
// request through auth.Middleware — the only supported way to attach a
// principal, since FromContext reads back an unexported key.
func withPrincipal(t *testing.T, p clients.Principal) context.Context {
	t.Helper()
	validator := fakeValidatorFunc(func(ctx context.Context, token string) (clients.Principal, error) {
		return p, nil
	})

	var captured context.Context
	handler := auth.Middleware(validator, "")(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		captured = r.Context()
	}))

	req := httptest.NewRequest(http.MethodPost, "/graphql", nil)
	req.Header.Set("Authorization", "Bearer test-token")
	handler.ServeHTTP(httptest.NewRecorder(), req)
	return captured
}

type fakeValidatorFunc func(ctx context.Context, token string) (clients.Principal, error)

func (f fakeValidatorFunc) ValidateSession(ctx context.Context, token string) (clients.Principal, error) {
	return f(ctx, token)
}
