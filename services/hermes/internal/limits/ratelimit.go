// Package limits enforces ADR 0004's request guardrails: a per-key,
// per-operation-class token bucket backed by Redis, and a GraphQL request
// body size cap. hermes is stateless and horizontally scaled, so limiter
// state cannot live in process memory — every instance must see the same
// bucket.
package limits

import (
	"context"
	_ "embed"
	"fmt"
	"strconv"
	"time"

	"github.com/redis/go-redis/v9"
)

//go:embed token_bucket.lua
var tokenBucketScript string

// Class is a rate-limited operation class from ADR 0004's traffic
// guardrail table.
type Class struct {
	Name      string
	PerMinute float64
	Burst     float64
}

// Classes from ADR 0004's "API traffic guardrails" table.
var (
	ClassUploadSession = Class{Name: "upload_session", PerMinute: 10, Burst: 3}
	ClassSignURL       = Class{Name: "sign_url", PerMinute: 60, Burst: 10}
	ClassMediaRead     = Class{Name: "media_read", PerMinute: 120, Burst: 20}
	ClassOther         = Class{Name: "other", PerMinute: 120, Burst: 20}
	// ClassAuthAttempt is "10/15 minutes per account and IP" expressed as
	// a per-minute rate for the shared token-bucket model.
	ClassAuthAttempt = Class{Name: "auth_attempt", PerMinute: 10.0 / 15, Burst: 5}
)

// Limiter enforces per-key, per-class token buckets in Redis.
type Limiter struct {
	rdb *redis.Client
}

// NewLimiter returns a Limiter backed by rdb.
func NewLimiter(rdb *redis.Client) *Limiter {
	return &Limiter{rdb: rdb}
}

// Result is the outcome of one Allow check.
type Result struct {
	Allowed    bool
	RetryAfter time.Duration
}

// Allow consumes one token from key's bucket for class. key is typically
// "user:<id>" for authenticated operation classes, or "ip:<addr>" /
// "account:<email>" for pre-authentication classes like ClassAuthAttempt.
func (l *Limiter) Allow(ctx context.Context, class Class, key string) (Result, error) {
	refillPerSec := class.PerMinute / 60
	now := float64(time.Now().UnixNano()) / 1e9

	reply, err := l.rdb.Eval(ctx, tokenBucketScript,
		[]string{"ratelimit:" + class.Name + ":" + key},
		class.Burst, refillPerSec, now, 1,
	).Result()
	if err != nil {
		return Result{}, fmt.Errorf("rate limit eval: %w", err)
	}

	vals, ok := reply.([]interface{})
	if !ok || len(vals) != 2 {
		return Result{}, fmt.Errorf("rate limit eval: unexpected reply %#v", reply)
	}
	allowed, ok := vals[0].(int64)
	if !ok {
		return Result{}, fmt.Errorf("rate limit eval: unexpected allowed value %#v", vals[0])
	}
	tokensStr, ok := vals[1].(string)
	if !ok {
		return Result{}, fmt.Errorf("rate limit eval: unexpected tokens value %#v", vals[1])
	}
	tokensLeft, err := strconv.ParseFloat(tokensStr, 64)
	if err != nil {
		return Result{}, fmt.Errorf("rate limit eval: parse tokens remaining: %w", err)
	}

	if allowed == 1 {
		return Result{Allowed: true}, nil
	}

	var retryAfter time.Duration
	if refillPerSec > 0 {
		deficit := 1 - tokensLeft
		if deficit < 0 {
			deficit = 0
		}
		retryAfter = time.Duration(deficit / refillPerSec * float64(time.Second))
	}
	return Result{Allowed: false, RetryAfter: retryAfter}, nil
}
