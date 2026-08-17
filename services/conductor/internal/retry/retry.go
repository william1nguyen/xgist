// Package retry computes conductor's retry backoff schedule: bounded
// exponential backoff with jitter, per docs/architecture.md's "Delivery
// and consistency" section. It holds no state; internal/store persists
// the computed retry_at.
package retry

import (
	"math/rand/v2"
	"time"
)

const (
	baseDelay = 5 * time.Second
	maxDelay  = 5 * time.Minute
)

// Compute returns the delay to wait before redispatching a step whose
// attempt-numbered attempt just failed (attempt is the attempt that
// failed, so the first retry is Compute(1)). Delay doubles per attempt,
// capped at maxDelay, with up to 20% jitter to avoid synchronized
// redelivery across steps that failed at the same time.
func Compute(attempt int) time.Duration {
	if attempt < 1 {
		attempt = 1
	}

	delay := baseDelay
	for i := 1; i < attempt; i++ {
		delay *= 2
		if delay >= maxDelay {
			delay = maxDelay
			break
		}
	}

	jitter := time.Duration(rand.Int64N(int64(delay) / 5)) // up to 20%
	return delay + jitter
}
