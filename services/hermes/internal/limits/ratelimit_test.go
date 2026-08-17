package limits_test

import (
	"context"
	"testing"

	"github.com/alicebob/miniredis/v2"
	"github.com/redis/go-redis/v9"

	"github.com/nolannguyen1212/media-notes/services/hermes/internal/limits"
)

func newTestLimiter(t *testing.T) *limits.Limiter {
	t.Helper()
	mr := miniredis.RunT(t)
	rdb := redis.NewClient(&redis.Options{Addr: mr.Addr()})
	t.Cleanup(func() { rdb.Close() })
	return limits.NewLimiter(rdb)
}

func TestLimiterAllowsUpToBurstThenRejects(t *testing.T) {
	limiter := newTestLimiter(t)
	class := limits.Class{Name: "test", PerMinute: 60, Burst: 3}
	ctx := context.Background()

	for i := 0; i < 3; i++ {
		res, err := limiter.Allow(ctx, class, "user:1")
		if err != nil {
			t.Fatalf("Allow #%d: %v", i, err)
		}
		if !res.Allowed {
			t.Fatalf("Allow #%d: got denied, want allowed (within burst)", i)
		}
	}

	res, err := limiter.Allow(ctx, class, "user:1")
	if err != nil {
		t.Fatalf("Allow (over burst): %v", err)
	}
	if res.Allowed {
		t.Fatal("expected the request beyond burst capacity to be denied")
	}
	if res.RetryAfter <= 0 {
		t.Error("expected a positive RetryAfter once denied")
	}
}

func TestLimiterKeysAreIndependent(t *testing.T) {
	limiter := newTestLimiter(t)
	class := limits.Class{Name: "test", PerMinute: 60, Burst: 1}
	ctx := context.Background()

	if res, err := limiter.Allow(ctx, class, "user:1"); err != nil || !res.Allowed {
		t.Fatalf("user:1 first request: allowed=%v err=%v", res.Allowed, err)
	}
	if res, err := limiter.Allow(ctx, class, "user:1"); err != nil || res.Allowed {
		t.Fatalf("user:1 second request: allowed=%v err=%v, want denied", res.Allowed, err)
	}
	if res, err := limiter.Allow(ctx, class, "user:2"); err != nil || !res.Allowed {
		t.Fatalf("user:2 first request: allowed=%v err=%v, want allowed", res.Allowed, err)
	}
}
