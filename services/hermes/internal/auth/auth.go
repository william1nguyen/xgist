// Package auth resolves the authenticated principal for one hermes
// request: bearer/cookie session-token extraction, delegation to
// identity.ValidateSession, and context propagation. Whether an operation
// requires a principal, and ownership checks on the results it returns,
// live in internal/graphql — this package only establishes who is
// calling.
package auth

import (
	"context"
	"errors"
	"net/http"
	"strings"

	"github.com/nolannguyen1212/media-notes/services/hermes/internal/clients"
)

type contextKey int

const principalKey contextKey = iota

// ErrUnauthenticated is returned by resolvers that require a principal
// FromContext did not find one for.
var ErrUnauthenticated = errors.New("authentication required")

// SessionValidator resolves a session token to its principal.
// *clients.IdentityClient implements it.
type SessionValidator interface {
	ValidateSession(ctx context.Context, token string) (clients.Principal, error)
}

// Middleware extracts a session token from the Authorization header or a
// fallback cookie, validates it through identity, and attaches the
// resolved principal to the request context. A missing or invalid token is
// not itself an HTTP error: unauthenticated requests still reach the
// GraphQL handler so public operations (register, login) keep working.
// Resolvers that require a principal read it back with FromContext and
// return ErrUnauthenticated themselves.
func Middleware(validator SessionValidator, cookieName string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if token := extractToken(r, cookieName); token != "" {
				if principal, err := validator.ValidateSession(r.Context(), token); err == nil {
					r = r.WithContext(context.WithValue(r.Context(), principalKey, principal))
				}
			}
			next.ServeHTTP(w, r)
		})
	}
}

// extractToken reads the session token from Authorization: Bearer, falling
// back to cookieName. A missing or malformed source returns "".
func extractToken(r *http.Request, cookieName string) string {
	if h := r.Header.Get("Authorization"); h != "" {
		if token, ok := strings.CutPrefix(h, "Bearer "); ok {
			token = strings.TrimSpace(token)
			if token != "" {
				return token
			}
		}
	}
	if cookieName == "" {
		return ""
	}
	c, err := r.Cookie(cookieName)
	if err != nil {
		return ""
	}
	return c.Value
}

// FromContext returns the principal Middleware attached to ctx, if the
// request carried a valid session.
func FromContext(ctx context.Context) (clients.Principal, bool) {
	p, ok := ctx.Value(principalKey).(clients.Principal)
	return p, ok
}
