package graphql_test

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	gqlhandler "github.com/99designs/gqlgen/graphql/handler"
	"github.com/google/uuid"

	"github.com/nolannguyen1212/media-notes/services/hermes/internal/auth"
	"github.com/nolannguyen1212/media-notes/services/hermes/internal/clients"
	graphqlpkg "github.com/nolannguyen1212/media-notes/services/hermes/internal/graphql"
)

// This file exercises the real GraphQL executor (gqlgen's generated
// dispatch/marshal code), not just resolver methods directly: the
// resolvers, args-collection funcs, complexity dispatch, and field
// marshalers in generated.go are hand-patched rather than regenerated
// (see resolver.go's header comment), so a compile-clean patch can still
// panic at runtime (e.g. an "unknown field" dispatch miss) or silently
// drop a field it never wires into a marshaler. These tests catch that
// class of bug for the newest hand-patched surface: description,
// updateMedia, requestProcessing.

type graphqlRequest struct {
	Query     string         `json:"query"`
	Variables map[string]any `json:"variables,omitempty"`
}

func execGraphQL(t *testing.T, handler http.Handler, principal clients.Principal, query string, variables map[string]any) map[string]any {
	t.Helper()

	validator := fakeValidatorFunc(func(ctx context.Context, token string) (clients.Principal, error) {
		return principal, nil
	})
	wrapped := auth.Middleware(validator, "")(handler)

	body, err := json.Marshal(graphqlRequest{Query: query, Variables: variables})
	if err != nil {
		t.Fatalf("marshal request: %v", err)
	}
	req := httptest.NewRequest(http.MethodPost, "/graphql", bytes.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer test-token")
	rec := httptest.NewRecorder()
	wrapped.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", rec.Code, rec.Body.String())
	}
	var resp map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
		t.Fatalf("unmarshal response: %v (body: %s)", err, rec.Body.String())
	}
	if errs, ok := resp["errors"]; ok {
		t.Fatalf("graphql errors: %v (body: %s)", errs, rec.Body.String())
	}
	return resp
}

func TestGraphQLExecutionUpdateMediaAndRequestProcessing(t *testing.T) {
	owner := uuid.New()
	mediaID := uuid.New()
	media := &fakeMedia{byID: map[uuid.UUID]clients.Media{
		mediaID: {ID: mediaID, OwnerID: owner, Title: "old title", Status: "completed"},
	}}
	resolver := newTestResolver(t, &fakeIdentity{}, media)
	schema := graphqlpkg.NewExecutableSchema(graphqlpkg.Config{Resolvers: resolver})
	srv := gqlhandler.NewDefaultServer(schema)
	principal := clients.Principal{User: clients.User{ID: owner}}

	t.Run("updateMedia changes title and description is selectable", func(t *testing.T) {
		resp := execGraphQL(t, srv, principal, `
			mutation($id: ID!, $title: String, $description: String) {
				updateMedia(id: $id, title: $title, description: $description) {
					id
					title
					description
				}
			}
		`, map[string]any{"id": mediaID.String(), "title": "new title", "description": "a description"})

		data := resp["data"].(map[string]any)
		got := data["updateMedia"].(map[string]any)
		if got["title"] != "new title" {
			t.Errorf("title = %v, want %q", got["title"], "new title")
		}
		if got["description"] != "a description" {
			t.Errorf("description = %v, want %q", got["description"], "a description")
		}
	})

	t.Run("requestProcessing starts processing", func(t *testing.T) {
		resp := execGraphQL(t, srv, principal, `
			mutation($mediaId: ID!, $options: [String!]!) {
				requestProcessing(mediaId: $mediaId, options: $options) {
					id
					status
				}
			}
		`, map[string]any{"mediaId": mediaID.String(), "options": []string{"summarize"}})

		data := resp["data"].(map[string]any)
		got := data["requestProcessing"].(map[string]any)
		if got["status"] != "PROCESSING" {
			t.Errorf("status = %v, want PROCESSING", got["status"])
		}
	})

	t.Run("mediaDetail selects description alongside every other field", func(t *testing.T) {
		resp := execGraphQL(t, srv, principal, `
			query($id: ID!) {
				mediaDetail(id: $id) {
					id
					title
					mediaType
					mimeType
					sizeBytes
					durationMs
					status
					thumbnailUrl
					playbackUrl
					playbackUrlExpiresAt
					createdAt
					updatedAt
					description
				}
			}
		`, map[string]any{"id": mediaID.String()})

		data := resp["data"].(map[string]any)
		if data["mediaDetail"] == nil {
			t.Fatal("expected a non-nil mediaDetail")
		}
	})
}
