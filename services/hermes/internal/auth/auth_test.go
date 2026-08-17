package auth_test

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/google/uuid"

	"github.com/nolannguyen1212/media-notes/services/hermes/internal/auth"
	"github.com/nolannguyen1212/media-notes/services/hermes/internal/clients"
)

type fakeValidator struct {
	byToken map[string]clients.Principal
}

func (f *fakeValidator) ValidateSession(ctx context.Context, token string) (clients.Principal, error) {
	p, ok := f.byToken[token]
	if !ok {
		return clients.Principal{}, auth.ErrUnauthenticated
	}
	return p, nil
}

func TestMiddlewareAttachesPrincipalFromBearerHeader(t *testing.T) {
	principal := clients.Principal{User: clients.User{ID: uuid.New()}}
	validator := &fakeValidator{byToken: map[string]clients.Principal{"good-token": principal}}

	var gotOK bool
	var got clients.Principal
	handler := auth.Middleware(validator, "mn_session")(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		got, gotOK = auth.FromContext(r.Context())
	}))

	req := httptest.NewRequest(http.MethodPost, "/graphql", nil)
	req.Header.Set("Authorization", "Bearer good-token")
	handler.ServeHTTP(httptest.NewRecorder(), req)

	if !gotOK {
		t.Fatal("expected a principal in context")
	}
	if got.User.ID != principal.User.ID {
		t.Errorf("user id = %v, want %v", got.User.ID, principal.User.ID)
	}
}

func TestMiddlewareFallsBackToCookie(t *testing.T) {
	principal := clients.Principal{User: clients.User{ID: uuid.New()}}
	validator := &fakeValidator{byToken: map[string]clients.Principal{"cookie-token": principal}}

	var gotOK bool
	handler := auth.Middleware(validator, "mn_session")(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, gotOK = auth.FromContext(r.Context())
	}))

	req := httptest.NewRequest(http.MethodPost, "/graphql", nil)
	req.AddCookie(&http.Cookie{Name: "mn_session", Value: "cookie-token"})
	handler.ServeHTTP(httptest.NewRecorder(), req)

	if !gotOK {
		t.Fatal("expected a principal in context from the cookie")
	}
}

func TestMiddlewarePassesThroughUnauthenticatedRequests(t *testing.T) {
	validator := &fakeValidator{byToken: map[string]clients.Principal{}}

	var called bool
	var gotOK bool
	handler := auth.Middleware(validator, "mn_session")(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		called = true
		_, gotOK = auth.FromContext(r.Context())
	}))

	req := httptest.NewRequest(http.MethodPost, "/graphql", nil)
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if !called {
		t.Fatal("expected the next handler to run for an unauthenticated request")
	}
	if gotOK {
		t.Error("expected no principal in context")
	}
	if rec.Code != http.StatusOK {
		t.Errorf("status = %d, want 200 (handler default)", rec.Code)
	}
}

func TestMiddlewareIgnoresInvalidToken(t *testing.T) {
	validator := &fakeValidator{byToken: map[string]clients.Principal{}}

	var gotOK bool
	handler := auth.Middleware(validator, "mn_session")(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_, gotOK = auth.FromContext(r.Context())
	}))

	req := httptest.NewRequest(http.MethodPost, "/graphql", nil)
	req.Header.Set("Authorization", "Bearer expired-or-unknown")
	handler.ServeHTTP(httptest.NewRecorder(), req)

	if gotOK {
		t.Error("expected no principal for an invalid token")
	}
}
