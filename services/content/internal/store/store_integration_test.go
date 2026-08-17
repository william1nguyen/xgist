package store_test

import (
	"context"
	"errors"
	"os"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	tcpostgres "github.com/testcontainers/testcontainers-go/modules/postgres"

	"github.com/nolannguyen1212/media-notes/services/content/internal/content"
	"github.com/nolannguyen1212/media-notes/services/content/internal/events"
	"github.com/nolannguyen1212/media-notes/services/content/internal/store"
)

// requireIntegration skips the test unless V2_INTEGRATION_TESTS is set,
// since it starts a real PostgreSQL container through Testcontainers and
// therefore requires a working Docker daemon.
func requireIntegration(t *testing.T) {
	t.Helper()
	if os.Getenv("V2_INTEGRATION_TESTS") == "" {
		t.Skip("set V2_INTEGRATION_TESTS=1 to run integration tests against a real PostgreSQL container")
	}
}

// newTestPool starts a disposable PostgreSQL container, applies
// migrations/V1__init.sql directly, and returns a connected pool. It
// applies the migration's SQL itself rather than shelling out to Flyway:
// this test exercises the repositories against real schema, not Flyway's
// CLI, and a plain container user can run DDL directly without the
// per-database role split deploy/postgres/init provisions for a shared
// server.
func newTestPool(t *testing.T) *pgxpool.Pool {
	t.Helper()
	ctx := context.Background()

	container, err := tcpostgres.Run(ctx, "postgres:16",
		tcpostgres.WithDatabase("content_test"),
		tcpostgres.WithUsername("content_test"),
		tcpostgres.WithPassword("content_test"),
	)
	if err != nil {
		t.Fatalf("start postgres container: %v", err)
	}
	t.Cleanup(func() {
		if err := container.Terminate(context.Background()); err != nil {
			t.Logf("terminate container: %v", err)
		}
	})

	connStr, err := container.ConnectionString(ctx, "sslmode=disable")
	if err != nil {
		t.Fatalf("connection string: %v", err)
	}

	var migration []byte
	for _, name := range []string{
		"V1__init.sql",
		"V2__scope_step_attempts_by_workflow.sql",
	} {
		b, err := os.ReadFile("../../migrations/" + name)
		if err != nil {
			t.Fatalf("read migration %s: %v", name, err)
		}
		migration = append(migration, b...)
	}

	// The postgres module reports ready after the log line that precedes
	// its internal init-then-restart cycle; connecting immediately can
	// race that restart. Retry briefly instead of failing on the first
	// reset connection.
	var setupPool *pgxpool.Pool
	for attempt := 0; ; attempt++ {
		setupPool, err = pgxpool.New(ctx, connStr)
		if err == nil {
			if _, execErr := setupPool.Exec(ctx, string(migration)); execErr == nil {
				break
			} else {
				err = execErr
			}
			setupPool.Close()
		}
		if attempt >= 10 {
			t.Fatalf("apply migration: %v", err)
		}
		time.Sleep(500 * time.Millisecond)
	}
	setupPool.Close()

	pool, err := store.NewPool(ctx, connStr)
	if err != nil {
		t.Fatalf("connect pool: %v", err)
	}
	t.Cleanup(pool.Close)
	return pool
}

func countOutbox(t *testing.T, pool *pgxpool.Pool, topic string) int {
	t.Helper()
	var n int
	if err := pool.QueryRow(context.Background(), `SELECT count(*) FROM outbox_events WHERE topic = $1`, topic).Scan(&n); err != nil {
		t.Fatalf("count outbox events: %v", err)
	}
	return n
}

func TestContentRepository(t *testing.T) {
	requireIntegration(t)
	pool := newTestPool(t)
	repo := store.NewContentRepository(pool)
	ctx := context.Background()

	mediaID := uuid.New()
	workflowID := uuid.New()

	t.Run("StoreTranscript and FindTranscript round-trip ordered segments", func(t *testing.T) {
		v, err := repo.StoreTranscript(ctx, content.StoreTranscriptCommand{
			IdempotencyKey: "transcript-1", MediaID: mediaID, WorkflowID: workflowID, Attempt: 1,
			Language: "en", Text: "hello world",
			Segments: []content.TranscriptSegment{
				{SegmentIndex: 0, StartMs: 0, EndMs: 900, Speaker: "a", Text: "hello"},
				{SegmentIndex: 1, StartMs: 900, EndMs: 1800, Speaker: "b", Text: "world"},
			},
		})
		if err != nil {
			t.Fatalf("StoreTranscript: %v", err)
		}
		if v.Version != 1 {
			t.Errorf("version = %d, want 1", v.Version)
		}

		got, err := repo.FindTranscript(ctx, mediaID)
		if err != nil {
			t.Fatalf("FindTranscript: %v", err)
		}
		if len(got.Segments) != 2 || got.Segments[0].Text != "hello" || got.Segments[1].Text != "world" {
			t.Fatalf("unexpected segments: %+v", got.Segments)
		}
		if countOutbox(t, pool, events.StepCompletedTopic) != 1 {
			t.Error("expected exactly one step.completed outbox event after the first write")
		}
	})

	t.Run("idempotent replay does not bump version or republish", func(t *testing.T) {
		v, err := repo.StoreTranscript(ctx, content.StoreTranscriptCommand{
			IdempotencyKey: "transcript-1", MediaID: mediaID, WorkflowID: workflowID, Attempt: 1,
			Language: "en", Text: "hello world",
			Segments: []content.TranscriptSegment{{SegmentIndex: 0, StartMs: 0, EndMs: 900, Text: "hello"}},
		})
		if err != nil {
			t.Fatalf("StoreTranscript (replay): %v", err)
		}
		if v.Version != 1 {
			t.Errorf("replay bumped version to %d, want unchanged 1", v.Version)
		}
		if countOutbox(t, pool, events.StepCompletedTopic) != 1 {
			t.Error("replay must not publish a second outbox event")
		}
		// The segments from the first, non-replayed write must remain
		// untouched by the replay's (ignored) different segment list.
		got, err := repo.FindTranscript(ctx, mediaID)
		if err != nil {
			t.Fatalf("FindTranscript: %v", err)
		}
		if len(got.Segments) != 2 {
			t.Errorf("got %d segments, want the original 2 (replay must be a no-op)", len(got.Segments))
		}
	})

	t.Run("a stale attempt is rejected", func(t *testing.T) {
		_, err := repo.StoreTranscript(ctx, content.StoreTranscriptCommand{
			IdempotencyKey: "transcript-stale", MediaID: mediaID, WorkflowID: workflowID, Attempt: 0,
			Segments: []content.TranscriptSegment{{SegmentIndex: 0, StartMs: 0, EndMs: 100, Text: "x"}},
		})
		if !errors.Is(err, content.ErrStaleAttempt) {
			t.Fatalf("got %v, want ErrStaleAttempt", err)
		}
	})

	t.Run("a newer attempt with a new idempotency key re-applies", func(t *testing.T) {
		v, err := repo.StoreTranscript(ctx, content.StoreTranscriptCommand{
			IdempotencyKey: "transcript-2", MediaID: mediaID, WorkflowID: workflowID, Attempt: 2,
			Language: "en", Text: "revised",
			Segments: []content.TranscriptSegment{{SegmentIndex: 0, StartMs: 0, EndMs: 500, Text: "revised"}},
		})
		if err != nil {
			t.Fatalf("StoreTranscript (newer attempt): %v", err)
		}
		if v.Version != 2 {
			t.Errorf("version = %d, want 2", v.Version)
		}
		if countOutbox(t, pool, events.StepCompletedTopic) != 2 {
			t.Error("expected a second step.completed outbox event for the newer attempt")
		}
	})

	t.Run("StoreSummary commits citations against real segments", func(t *testing.T) {
		v, err := repo.StoreSummary(ctx, content.StoreSummaryCommand{
			IdempotencyKey: "summary-1", MediaID: mediaID, WorkflowID: workflowID, Attempt: 1,
			SummaryType: "short", Text: "a short summary", Model: "gemini", PromptVersion: "v1",
			Sentences: []content.SummarySentence{{SentenceIndex: 0, Text: "It happened.", CitedSegmentIndexes: []int{0}}},
		})
		if err != nil {
			t.Fatalf("StoreSummary: %v", err)
		}
		if v.Version != 3 {
			t.Errorf("version = %d, want 3", v.Version)
		}
	})

	t.Run("StoreSummary rejects a citation against an unknown segment", func(t *testing.T) {
		_, err := repo.StoreSummary(ctx, content.StoreSummaryCommand{
			IdempotencyKey: "summary-bad", MediaID: mediaID, WorkflowID: workflowID, Attempt: 1,
			SummaryType: "long",
			Sentences:   []content.SummarySentence{{SentenceIndex: 0, Text: "x", CitedSegmentIndexes: []int{999}}},
		})
		if !errors.Is(err, content.ErrUnknownSegment) {
			t.Fatalf("got %v, want ErrUnknownSegment", err)
		}
	})

	t.Run("StoreKeywords, StoreKeypoints, StoreNotes, StoreSummaryAudio and FindContent", func(t *testing.T) {
		if _, err := repo.StoreKeywords(ctx, content.StoreKeywordsCommand{
			IdempotencyKey: "keywords-1", MediaID: mediaID, WorkflowID: workflowID, Attempt: 1,
			Keywords: []content.Keyword{{Keyword: "topic", Score: 0.9, Position: 0}},
		}); err != nil {
			t.Fatalf("StoreKeywords: %v", err)
		}

		if _, err := repo.StoreKeypoints(ctx, content.StoreKeypointsCommand{
			IdempotencyKey: "keypoints-1", MediaID: mediaID, WorkflowID: workflowID, Attempt: 1,
			Keypoints: []content.Keypoint{{PointIndex: 0, Text: "point one", StartSegment: 0, EndSegment: 0}},
		}); err != nil {
			t.Fatalf("StoreKeypoints: %v", err)
		}

		if _, err := repo.StoreNotes(ctx, content.StoreNotesCommand{
			IdempotencyKey: "notes-1", MediaID: mediaID, WorkflowID: workflowID, Attempt: 1,
			Format: "markdown", Body: "# Notes",
		}); err != nil {
			t.Fatalf("StoreNotes: %v", err)
		}

		if _, err := repo.StoreSummaryAudio(ctx, content.StoreSummaryAudioCommand{
			IdempotencyKey: "audio-1", MediaID: mediaID, WorkflowID: workflowID, Attempt: 1,
			SummaryType: "short", ObjectKey: "content/" + mediaID.String() + "/summary-audio/short.mp3",
			MimeType: "audio/mpeg", DurationMs: 12000, Voice: "en-US-1",
		}); err != nil {
			t.Fatalf("StoreSummaryAudio: %v", err)
		}

		got, err := repo.FindContent(ctx, mediaID)
		if err != nil {
			t.Fatalf("FindContent: %v", err)
		}
		if got.Transcript == nil || len(got.Transcript.Segments) == 0 {
			t.Error("expected a transcript with segments")
		}
		if len(got.Summaries) != 1 || len(got.Summaries[0].Sentences) != 1 || len(got.Summaries[0].Sentences[0].CitedSegmentIndexes) != 1 {
			t.Fatalf("unexpected summaries: %+v", got.Summaries)
		}
		if len(got.Keywords) != 1 || got.Keywords[0].Keyword != "topic" {
			t.Fatalf("unexpected keywords: %+v", got.Keywords)
		}
		if len(got.Keypoints) != 1 || got.Keypoints[0].Text != "point one" {
			t.Fatalf("unexpected keypoints: %+v", got.Keypoints)
		}
		if len(got.Notes) != 1 || got.Notes[0].Format != "markdown" {
			t.Fatalf("unexpected notes: %+v", got.Notes)
		}
		if len(got.SummaryAudios) != 1 || got.SummaryAudios[0].Status != content.AudioStatusReady {
			t.Fatalf("unexpected summary audios: %+v", got.SummaryAudios)
		}
	})
}

func TestStepAttemptsAreScopedPerWorkflow(t *testing.T) {
	requireIntegration(t)
	pool := newTestPool(t)
	repo := store.NewContentRepository(pool)
	ctx := context.Background()

	mediaID := uuid.New()
	firstWorkflowID := uuid.New()

	// Advance the first workflow's transcribe step to attempt 2, the same
	// way TestContentRepository does, so there is a higher recorded
	// attempt to potentially collide with.
	if _, err := repo.StoreTranscript(ctx, content.StoreTranscriptCommand{
		IdempotencyKey: "w1-attempt-1", MediaID: mediaID, WorkflowID: firstWorkflowID, Attempt: 1,
		Segments: []content.TranscriptSegment{{SegmentIndex: 0, StartMs: 0, EndMs: 100, Text: "first"}},
	}); err != nil {
		t.Fatalf("StoreTranscript (workflow 1, attempt 1): %v", err)
	}
	if _, err := repo.StoreTranscript(ctx, content.StoreTranscriptCommand{
		IdempotencyKey: "w1-attempt-2", MediaID: mediaID, WorkflowID: firstWorkflowID, Attempt: 2,
		Segments: []content.TranscriptSegment{{SegmentIndex: 0, StartMs: 0, EndMs: 100, Text: "first retried"}},
	}); err != nil {
		t.Fatalf("StoreTranscript (workflow 1, attempt 2): %v", err)
	}

	// A regenerate starts a brand new workflow whose own step attempts
	// count from 1 again — lower than the first workflow's attempt 2 for
	// the same step, but for a different workflow_id, so it must apply
	// rather than being rejected as stale.
	secondWorkflowID := uuid.New()
	v, err := repo.StoreTranscript(ctx, content.StoreTranscriptCommand{
		IdempotencyKey: "w2-attempt-1", MediaID: mediaID, WorkflowID: secondWorkflowID, Attempt: 1,
		Segments: []content.TranscriptSegment{{SegmentIndex: 0, StartMs: 0, EndMs: 200, Text: "regenerated"}},
	})
	if err != nil {
		t.Fatalf("StoreTranscript (workflow 2, attempt 1): %v", err)
	}
	if v.Version != 3 {
		t.Errorf("version = %d, want 3 (each write bumps content's shared version)", v.Version)
	}

	got, err := repo.FindTranscript(ctx, mediaID)
	if err != nil {
		t.Fatalf("FindTranscript: %v", err)
	}
	if len(got.Segments) != 1 || got.Segments[0].Text != "regenerated" {
		t.Fatalf("unexpected segments after regenerate: %+v", got.Segments)
	}
}

func TestDeletionRepository(t *testing.T) {
	requireIntegration(t)
	pool := newTestPool(t)
	contentRepo := store.NewContentRepository(pool)
	deletionRepo := store.NewDeletionRepository(pool)
	ctx := context.Background()

	mediaID := uuid.New()
	workflowID := uuid.New()
	if _, err := contentRepo.StoreTranscript(ctx, content.StoreTranscriptCommand{
		IdempotencyKey: "t1", MediaID: mediaID, WorkflowID: workflowID, Attempt: 1,
		Segments: []content.TranscriptSegment{{SegmentIndex: 0, StartMs: 0, EndMs: 100, Text: "x"}},
	}); err != nil {
		t.Fatalf("StoreTranscript: %v", err)
	}

	t.Run("not deletion pending before a delete request", func(t *testing.T) {
		pending, err := deletionRepo.IsDeletionPending(ctx, mediaID)
		if err != nil {
			t.Fatalf("IsDeletionPending: %v", err)
		}
		if pending {
			t.Error("expected not pending before any deletion request")
		}
	})

	deletionID := uuid.New()
	t.Run("DeleteOwnedRows removes content and reports completion", func(t *testing.T) {
		if err := deletionRepo.DeleteOwnedRows(ctx, deletionID, mediaID); err != nil {
			t.Fatalf("DeleteOwnedRows: %v", err)
		}
		if _, err := contentRepo.FindTranscript(ctx, mediaID); !errors.Is(err, content.ErrNotFound) {
			t.Fatalf("FindTranscript after delete: got %v, want ErrNotFound", err)
		}
		if countOutbox(t, pool, events.DeletionCompletedTopic) != 1 {
			t.Error("expected exactly one deletion.completed outbox event")
		}
		pending, err := deletionRepo.IsDeletionPending(ctx, mediaID)
		if err != nil {
			t.Fatalf("IsDeletionPending: %v", err)
		}
		if !pending {
			t.Error("expected pending after DeleteOwnedRows")
		}
	})

	t.Run("redelivery is a no-op and does not republish", func(t *testing.T) {
		if err := deletionRepo.DeleteOwnedRows(ctx, deletionID, mediaID); err != nil {
			t.Fatalf("DeleteOwnedRows (redelivery): %v", err)
		}
		if countOutbox(t, pool, events.DeletionCompletedTopic) != 1 {
			t.Error("redelivery must not publish a second completion event")
		}
	})

	t.Run("a media item with no content row is an idempotent success", func(t *testing.T) {
		neverStored := uuid.New()
		if err := deletionRepo.DeleteOwnedRows(ctx, uuid.New(), neverStored); err != nil {
			t.Fatalf("DeleteOwnedRows on unknown media: %v", err)
		}
	})
}
