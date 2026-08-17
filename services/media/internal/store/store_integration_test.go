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

	"github.com/nolannguyen1212/media-notes/services/media/internal/deletion"
	"github.com/nolannguyen1212/media-notes/services/media/internal/derivative"
	"github.com/nolannguyen1212/media-notes/services/media/internal/events"
	"github.com/nolannguyen1212/media-notes/services/media/internal/media"
	"github.com/nolannguyen1212/media-notes/services/media/internal/store"
	"github.com/nolannguyen1212/media-notes/services/media/internal/upload"
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
		tcpostgres.WithDatabase("media_test"),
		tcpostgres.WithUsername("media_test"),
		tcpostgres.WithPassword("media_test"),
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
		"V2__add_media_progress_version.sql",
		"V3__add_media_description.sql",
		"V4__loosen_processing_requests_unique.sql",
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
		t.Fatalf("new pool: %v", err)
	}
	t.Cleanup(pool.Close)
	return pool
}

func TestStoreIntegration(t *testing.T) {
	requireIntegration(t)
	pool := newTestPool(t)
	ctx := context.Background()

	uploads := store.NewUploadRepository(pool)
	derivatives := store.NewDerivativeRepository(pool)
	deletions := store.NewDeletionRepository(pool)
	outbox := store.NewOutboxRepository(pool)
	inbox := store.NewInboxRepository(pool)
	medias := store.NewMediaRepository(pool)

	t.Run("Create rejects a fourth active upload session", func(t *testing.T) {
		owner := uuid.New()
		for i := 0; i < 3; i++ {
			mediaID, sessionID := uuid.New(), uuid.New()
			_, err := uploads.Create(ctx, mediaID, sessionID, upload.NewUploadSession{
				OwnerID: owner, Title: "t", MimeType: "video/mp4", DeclaredSizeBytes: 100, IdempotencyKey: uuid.NewString(),
			}, media.TypeVideo, "media/"+mediaID.String()+"/source", time.Now().Add(time.Hour), 3)
			if err != nil {
				t.Fatalf("session %d: %v", i, err)
			}
		}

		mediaID, sessionID := uuid.New(), uuid.New()
		_, err := uploads.Create(ctx, mediaID, sessionID, upload.NewUploadSession{
			OwnerID: owner, Title: "t", MimeType: "video/mp4", DeclaredSizeBytes: 100, IdempotencyKey: uuid.NewString(),
		}, media.TypeVideo, "media/"+mediaID.String()+"/source", time.Now().Add(time.Hour), 3)
		if !errors.Is(err, upload.ErrTooManyActiveSessions) {
			t.Fatalf("got %v, want ErrTooManyActiveSessions", err)
		}
	})

	t.Run("Create is idempotent by idempotency_key", func(t *testing.T) {
		owner := uuid.New()
		key := uuid.NewString()
		mediaID, sessionID := uuid.New(), uuid.New()
		first, err := uploads.Create(ctx, mediaID, sessionID, upload.NewUploadSession{
			OwnerID: owner, Title: "t", MimeType: "video/mp4", DeclaredSizeBytes: 100, IdempotencyKey: key,
		}, media.TypeVideo, "media/"+mediaID.String()+"/source", time.Now().Add(time.Hour), 3)
		if err != nil {
			t.Fatalf("first create: %v", err)
		}

		second, err := uploads.Create(ctx, uuid.New(), uuid.New(), upload.NewUploadSession{
			OwnerID: owner, Title: "t", MimeType: "video/mp4", DeclaredSizeBytes: 100, IdempotencyKey: key,
		}, media.TypeVideo, "media/other/source", time.Now().Add(time.Hour), 3)
		if err != nil {
			t.Fatalf("second create: %v", err)
		}
		if first.ID != second.ID {
			t.Error("duplicate idempotency_key created a second session")
		}
	})

	t.Run("Confirm atomically transitions media and writes the outbox event", func(t *testing.T) {
		owner := uuid.New()
		mediaID, sessionID := uuid.New(), uuid.New()
		session, err := uploads.Create(ctx, mediaID, sessionID, upload.NewUploadSession{
			OwnerID: owner, Title: "t", MimeType: "video/mp4", DeclaredSizeBytes: 100, IdempotencyKey: uuid.NewString(),
		}, media.TypeVideo, "media/"+mediaID.String()+"/source", time.Now().Add(time.Hour), 3)
		if err != nil {
			t.Fatalf("create: %v", err)
		}

		m, err := uploads.Confirm(ctx, session.ID, 12345, "video/mp4", []string{"transcribe"}, "", nil, "confirm-1")
		if err != nil {
			t.Fatalf("confirm: %v", err)
		}
		if m.Status != media.StatusProcessing {
			t.Errorf("status = %v, want processing", m.Status)
		}
		if m.SizeBytes != 12345 {
			t.Errorf("size_bytes = %d, want 12345", m.SizeBytes)
		}

		pending, err := outbox.ListPending(ctx, 100)
		if err != nil {
			t.Fatalf("ListPending: %v", err)
		}
		var found bool
		for _, rec := range pending {
			if rec.Key == mediaID.String() && rec.Topic == events.ProcessingRequestedTopic {
				found = true
			}
		}
		if !found {
			t.Fatal("Confirm did not write a processing.requested outbox event")
		}

		again, err := uploads.Confirm(ctx, session.ID, 999, "audio/mpeg", nil, "", nil, "confirm-2")
		if err != nil {
			t.Fatalf("confirm (replay): %v", err)
		}
		if again.SizeBytes != 12345 {
			t.Error("replayed confirm mutated the media a second time")
		}
	})

	t.Run("Register is idempotent and writes the derivative-ready outbox event", func(t *testing.T) {
		owner := uuid.New()
		mediaID, sessionID := uuid.New(), uuid.New()
		if _, err := uploads.Create(ctx, mediaID, sessionID, upload.NewUploadSession{
			OwnerID: owner, Title: "t", MimeType: "video/mp4", DeclaredSizeBytes: 100, IdempotencyKey: uuid.NewString(),
		}, media.TypeVideo, "media/"+mediaID.String()+"/source", time.Now().Add(time.Hour), 3); err != nil {
			t.Fatalf("create: %v", err)
		}

		in := derivative.NewDerivative{
			MediaID: mediaID, DerivativeType: derivative.TypeThumbnail, Version: 1,
			ObjectKey: "media/" + mediaID.String() + "/thumbnail/v1.webp", MimeType: "image/webp",
		}
		first, err := derivatives.Register(ctx, in)
		if err != nil {
			t.Fatalf("register: %v", err)
		}
		second, err := derivatives.Register(ctx, in)
		if err != nil {
			t.Fatalf("register (again): %v", err)
		}
		if first.ID != second.ID {
			t.Error("duplicate registration created a second row")
		}

		ready, err := derivatives.FindLatestReady(ctx, mediaID, derivative.TypeThumbnail)
		if err != nil {
			t.Fatalf("FindLatestReady: %v", err)
		}
		if ready.ID != first.ID {
			t.Error("FindLatestReady returned an unexpected derivative")
		}
	})

	t.Run("Register rejects a nonexistent media id", func(t *testing.T) {
		_, err := derivatives.Register(ctx, derivative.NewDerivative{
			MediaID: uuid.New(), DerivativeType: derivative.TypeThumbnail, Version: 1, ObjectKey: "media/missing/thumbnail/v1.webp",
		})
		if !errors.Is(err, derivative.ErrMediaNotFound) {
			t.Fatalf("got %v, want ErrMediaNotFound", err)
		}
	})

	t.Run("RequestDeletion writes an outbox event, cancels sessions, and is idempotent", func(t *testing.T) {
		owner := uuid.New()
		mediaID, sessionID := uuid.New(), uuid.New()
		if _, err := uploads.Create(ctx, mediaID, sessionID, upload.NewUploadSession{
			OwnerID: owner, Title: "t", MimeType: "video/mp4", DeclaredSizeBytes: 100, IdempotencyKey: uuid.NewString(),
		}, media.TypeVideo, "media/"+mediaID.String()+"/source", time.Now().Add(time.Hour), 3); err != nil {
			t.Fatalf("create: %v", err)
		}

		first, keys, err := deletions.RequestDeletion(ctx, mediaID)
		if err != nil {
			t.Fatalf("RequestDeletion: %v", err)
		}
		if len(keys) == 0 {
			t.Fatal("expected at least the source object key")
		}

		second, _, err := deletions.RequestDeletion(ctx, mediaID)
		if err != nil {
			t.Fatalf("RequestDeletion (again): %v", err)
		}
		if first.DeletionID != second.DeletionID {
			t.Error("deletion ids differ across idempotent calls")
		}

		pending, err := outbox.ListPending(ctx, 100)
		if err != nil {
			t.Fatalf("ListPending: %v", err)
		}
		var found bool
		for _, rec := range pending {
			if rec.Key == mediaID.String() && rec.Topic == events.DeletionRequestedTopic {
				found = true
			}
		}
		if !found {
			t.Fatal("RequestDeletion did not write a deletion.requested outbox event")
		}

		if err := deletions.MarkRowsDeleted(ctx, mediaID); err != nil {
			t.Fatalf("MarkRowsDeleted: %v", err)
		}
	})

	t.Run("RecordCompletion completes once every required participant reports", func(t *testing.T) {
		owner := uuid.New()
		mediaID, sessionID := uuid.New(), uuid.New()
		if _, err := uploads.Create(ctx, mediaID, sessionID, upload.NewUploadSession{
			OwnerID: owner, Title: "t", MimeType: "video/mp4", DeclaredSizeBytes: 100, IdempotencyKey: uuid.NewString(),
		}, media.TypeVideo, "media/"+mediaID.String()+"/source", time.Now().Add(time.Hour), 3); err != nil {
			t.Fatalf("create: %v", err)
		}
		op, _, err := deletions.RequestDeletion(ctx, mediaID)
		if err != nil {
			t.Fatalf("RequestDeletion: %v", err)
		}

		for _, participant := range deletion.RequiredParticipants {
			if _, err := deletions.RecordCompletion(ctx, op.DeletionID, participant); err != nil {
				t.Fatalf("RecordCompletion(%s): %v", participant, err)
			}
		}

		final, err := deletions.FindOperation(ctx, op.DeletionID)
		if err != nil {
			t.Fatalf("FindOperation: %v", err)
		}
		if final.State != deletion.StateCompleted {
			t.Errorf("state = %v, want completed", final.State)
		}
	})

	t.Run("FindProgress derives steps from options and omits other owners", func(t *testing.T) {
		owner := uuid.New()
		mediaID, sessionID := uuid.New(), uuid.New()
		session, err := uploads.Create(ctx, mediaID, sessionID, upload.NewUploadSession{
			OwnerID: owner, Title: "t", MimeType: "video/mp4", DeclaredSizeBytes: 100, IdempotencyKey: uuid.NewString(),
		}, media.TypeVideo, "media/"+mediaID.String()+"/source", time.Now().Add(time.Hour), 3)
		if err != nil {
			t.Fatalf("create: %v", err)
		}
		if _, err := uploads.Confirm(ctx, session.ID, 12345, "video/mp4", []string{"transcribe", "summarize"}, "", nil, uuid.NewString()); err != nil {
			t.Fatalf("confirm: %v", err)
		}

		otherOwnerID := uuid.New()
		otherSession, err := uploads.Create(ctx, uuid.New(), uuid.New(), upload.NewUploadSession{
			OwnerID: otherOwnerID, Title: "t", MimeType: "video/mp4", DeclaredSizeBytes: 100, IdempotencyKey: uuid.NewString(),
		}, media.TypeVideo, "media/other/source", time.Now().Add(time.Hour), 3)
		if err != nil {
			t.Fatalf("create (other owner): %v", err)
		}
		if _, err := uploads.Confirm(ctx, otherSession.ID, 100, "video/mp4", nil, "", nil, uuid.NewString()); err != nil {
			t.Fatalf("confirm (other owner): %v", err)
		}

		items, err := medias.FindProgress(ctx, owner, []uuid.UUID{mediaID, otherSession.MediaID, uuid.New()})
		if err != nil {
			t.Fatalf("FindProgress: %v", err)
		}
		if len(items) != 1 {
			t.Fatalf("items = %+v, want exactly one owned item", items)
		}
		got := items[0]
		if got.MediaID != mediaID {
			t.Errorf("media id = %v, want %v", got.MediaID, mediaID)
		}
		if got.TotalSteps != 2 {
			t.Errorf("total steps = %d, want 2 (options count)", got.TotalSteps)
		}
		if got.CompletedSteps != 0 {
			t.Errorf("completed steps = %d, want 0 while processing", got.CompletedSteps)
		}
		if got.Version != 1 {
			t.Errorf("version = %d, want 1 before any workflow-status transition", got.Version)
		}

		if err := medias.ApplyWorkflowStatus(ctx, mediaID, media.StatusCompleted); err != nil {
			t.Fatalf("ApplyWorkflowStatus: %v", err)
		}
		items, err = medias.FindProgress(ctx, owner, []uuid.UUID{mediaID})
		if err != nil {
			t.Fatalf("FindProgress (after completion): %v", err)
		}
		if len(items) != 1 {
			t.Fatalf("items = %+v, want exactly one item", items)
		}
		if items[0].Version != 2 {
			t.Errorf("version = %d, want 2 after one workflow-status transition", items[0].Version)
		}
		if items[0].CompletedSteps != items[0].TotalSteps {
			t.Errorf("completed steps = %d, want %d once completed", items[0].CompletedSteps, items[0].TotalSteps)
		}
	})

	t.Run("Update changes only the set fields", func(t *testing.T) {
		owner := uuid.New()
		mediaID, sessionID := uuid.New(), uuid.New()
		session, err := uploads.Create(ctx, mediaID, sessionID, upload.NewUploadSession{
			OwnerID: owner, Title: "original title", MimeType: "video/mp4", DeclaredSizeBytes: 100, IdempotencyKey: uuid.NewString(),
		}, media.TypeVideo, "media/"+mediaID.String()+"/source", time.Now().Add(time.Hour), 3)
		if err != nil {
			t.Fatalf("create: %v", err)
		}
		if _, err := uploads.Confirm(ctx, session.ID, 12345, "video/mp4", []string{"transcribe"}, "", nil, uuid.NewString()); err != nil {
			t.Fatalf("confirm: %v", err)
		}

		newTitle := "updated title"
		m, err := medias.Update(ctx, mediaID, &newTitle, nil)
		if err != nil {
			t.Fatalf("Update: %v", err)
		}
		if m.Title != "updated title" {
			t.Errorf("title = %q, want %q", m.Title, "updated title")
		}
		if m.Description != "" {
			t.Errorf("description = %q, want unchanged empty", m.Description)
		}

		newDescription := "now with a description"
		m, err = medias.Update(ctx, mediaID, nil, &newDescription)
		if err != nil {
			t.Fatalf("Update (description): %v", err)
		}
		if m.Title != "updated title" {
			t.Errorf("title = %q, want unchanged %q", m.Title, "updated title")
		}
		if m.Description != "now with a description" {
			t.Errorf("description = %q, want %q", m.Description, "now with a description")
		}
	})

	t.Run("RequestProcessing rejects a non-terminal media item and accepts a terminal one", func(t *testing.T) {
		owner := uuid.New()
		mediaID, sessionID := uuid.New(), uuid.New()
		session, err := uploads.Create(ctx, mediaID, sessionID, upload.NewUploadSession{
			OwnerID: owner, Title: "t", MimeType: "video/mp4", DeclaredSizeBytes: 100, IdempotencyKey: uuid.NewString(),
		}, media.TypeVideo, "media/"+mediaID.String()+"/source", time.Now().Add(time.Hour), 3)
		if err != nil {
			t.Fatalf("create: %v", err)
		}
		if _, err := uploads.Confirm(ctx, session.ID, 12345, "video/mp4", []string{"transcribe"}, "", nil, uuid.NewString()); err != nil {
			t.Fatalf("confirm: %v", err)
		}

		if _, err := medias.RequestProcessing(ctx, mediaID, uuid.NewString(), []string{"summarize"}, "", nil); !errors.Is(err, media.ErrNotProcessable) {
			t.Fatalf("got %v, want ErrNotProcessable while still processing", err)
		}

		if err := medias.ApplyWorkflowStatus(ctx, mediaID, media.StatusCompleted); err != nil {
			t.Fatalf("ApplyWorkflowStatus: %v", err)
		}

		key := uuid.NewString()
		m, err := medias.RequestProcessing(ctx, mediaID, key, []string{"summarize"}, "", nil)
		if err != nil {
			t.Fatalf("RequestProcessing: %v", err)
		}
		if m.Status != media.StatusProcessing {
			t.Errorf("status = %v, want processing", m.Status)
		}

		pending, err := outbox.ListPending(ctx, 100)
		if err != nil {
			t.Fatalf("ListPending: %v", err)
		}
		var found bool
		for _, rec := range pending {
			if rec.Key == mediaID.String() && rec.Topic == events.ProcessingRequestedTopic {
				found = true
			}
		}
		if !found {
			t.Fatal("RequestProcessing did not write a processing.requested outbox event")
		}

		again, err := medias.RequestProcessing(ctx, mediaID, key, []string{"summarize"}, "", nil)
		if err != nil {
			t.Fatalf("RequestProcessing (replay): %v", err)
		}
		if again.ID != m.ID {
			t.Error("replayed RequestProcessing returned a different media item")
		}
	})

	t.Run("inbox Record deduplicates by dedup key and topic", func(t *testing.T) {
		eventID := uuid.New()
		inserted, err := inbox.Record(ctx, eventID, events.StatusChangedTopic)
		if err != nil || !inserted {
			t.Fatalf("first Record: inserted=%v err=%v", inserted, err)
		}
		inserted, err = inbox.Record(ctx, eventID, events.StatusChangedTopic)
		if err != nil {
			t.Fatalf("second Record: %v", err)
		}
		if inserted {
			t.Error("duplicate event id was reported as newly inserted")
		}
	})
}
