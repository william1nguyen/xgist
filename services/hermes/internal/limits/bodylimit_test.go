package limits_test

import (
	"bytes"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/nolannguyen1212/media-notes/services/hermes/internal/limits"
)

func TestBodyLimitMiddlewareAllowsBodyUnderLimit(t *testing.T) {
	var gotBody string
	handler := limits.BodyLimitMiddleware(10)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		b, _ := io.ReadAll(r.Body)
		gotBody = string(b)
		w.WriteHeader(http.StatusOK)
	}))

	req := httptest.NewRequest(http.MethodPost, "/graphql", strings.NewReader("short"))
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", rec.Code)
	}
	if gotBody != "short" {
		t.Errorf("body = %q, want %q", gotBody, "short")
	}
}

func TestBodyLimitMiddlewareRejectsOversizedBody(t *testing.T) {
	var called bool
	handler := limits.BodyLimitMiddleware(4)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		called = true
	}))

	req := httptest.NewRequest(http.MethodPost, "/graphql", bytes.NewReader([]byte("way too long")))
	rec := httptest.NewRecorder()
	handler.ServeHTTP(rec, req)

	if called {
		t.Error("expected the next handler not to run for an oversized body")
	}
	if rec.Code != http.StatusRequestEntityTooLarge {
		t.Errorf("status = %d, want 413", rec.Code)
	}
}
