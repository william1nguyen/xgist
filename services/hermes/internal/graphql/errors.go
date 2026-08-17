package graphql

import (
	"errors"
	"fmt"
	"time"
)

// ErrNotFound is returned for an unknown resource, or one the caller does
// not own. Both cases map to the same error so hermes never reveals
// whether another user's resource exists, per docs/services/hermes.md.
var ErrNotFound = errors.New("not found")

// RateLimitError signals ADR 0004's 429 Too Many Requests outcome. The
// HTTP layer (internal/http) maps it to a real 429 status with
// Retry-After, per ADR 0004 and ADR 0005's "429 responses honor
// Retry-After" client contract.
type RateLimitError struct {
	RetryAfter time.Duration
}

func (e *RateLimitError) Error() string {
	return fmt.Sprintf("rate limit exceeded, retry after %s", e.RetryAfter)
}
