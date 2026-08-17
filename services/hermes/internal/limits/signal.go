package limits

import (
	"context"
	"sync/atomic"
	"time"
)

// Signal carries a rate-limit denial from a resolver back to the HTTP
// transport. gqlgen decouples resolver execution from the transport that
// writes the HTTP response, so there is no other channel for a resolver
// to make the transport send a true 429 (ADR 0004) instead of GraphQL's
// usual 200-with-errors.
type Signal struct {
	hit        atomic.Bool
	retryAfter atomic.Int64 // nanoseconds
}

// Hit reports whether any resolver marked this request rate-limited, and
// the RetryAfter it reported. A nil Signal (no HTTP layer attached one,
// e.g. a resolver unit test) reports false.
func (s *Signal) Hit() (bool, time.Duration) {
	if s == nil || !s.hit.Load() {
		return false, 0
	}
	return true, time.Duration(s.retryAfter.Load())
}

func (s *Signal) mark(retryAfter time.Duration) {
	s.hit.Store(true)
	s.retryAfter.Store(int64(retryAfter))
}

type signalKey struct{}

// ContextWithSignal attaches a fresh Signal to ctx and returns both, so
// the HTTP layer can create one per request and inspect it once
// resolution reaches the point of writing a response.
func ContextWithSignal(ctx context.Context) (context.Context, *Signal) {
	sig := &Signal{}
	return context.WithValue(ctx, signalKey{}, sig), sig
}

// MarkRateLimited records a denial on the Signal attached to ctx, if any.
// A resolver calls this when Allow denies a request; it is a no-op if the
// HTTP layer never attached a Signal.
func MarkRateLimited(ctx context.Context, retryAfter time.Duration) {
	if sig, ok := ctx.Value(signalKey{}).(*Signal); ok {
		sig.mark(retryAfter)
	}
}
