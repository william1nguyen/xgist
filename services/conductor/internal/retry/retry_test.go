package retry_test

import (
	"testing"
	"time"

	"github.com/nolannguyen1212/media-notes/services/conductor/internal/retry"
)

func TestComputeIsAtLeastBaseDelay(t *testing.T) {
	for attempt := 0; attempt < 3; attempt++ {
		if got := retry.Compute(attempt); got < 5*time.Second {
			t.Errorf("Compute(%d) = %v, want >= 5s", attempt, got)
		}
	}
}

func TestComputeGrowsWithAttempt(t *testing.T) {
	// Jitter makes any single pair noisy, so compare across a wider gap.
	early := retry.Compute(1)
	later := retry.Compute(5)
	if later <= early {
		t.Errorf("Compute(5) = %v, want > Compute(1) = %v", later, early)
	}
}

func TestComputeIsCapped(t *testing.T) {
	got := retry.Compute(100)
	// 5m base cap plus up to 20% jitter.
	if got > 6*time.Minute {
		t.Errorf("Compute(100) = %v, want <= ~6m (5m cap + jitter)", got)
	}
}
