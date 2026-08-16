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

	"github.com/nolannguyen1212/media-notes/services/identity/internal/account"
	"github.com/nolannguyen1212/media-notes/services/identity/internal/events"
	"github.com/nolannguyen1212/media-notes/services/identity/internal/store"
)

// requireIntegration skips the test unless V2_INTEGRATION_TESTS is
// set, since it starts a real PostgreSQL container through Testcontainers
// and therefore requires a working Docker daemon.
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
		tcpostgres.WithDatabase("identity_test"),
		tcpostgres.WithUsername("identity_test"),
		tcpostgres.WithPassword("identity_test"),
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

	migration, err := os.ReadFile("../../migrations/V1__init.sql")
	if err != nil {
		t.Fatalf("read migration: %v", err)
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

	accounts := store.NewAccountRepository(pool)
	outbox := store.NewOutboxRepository(pool)
	inbox := store.NewInboxRepository(pool)

	t.Run("CreateWithCredential rejects a duplicate email", func(t *testing.T) {
		_, err := accounts.CreateWithCredential(ctx, account.NewAccount{Email: "dup@example.com", Name: "A"}, []byte("hash"), "dup@example.com")
		if err != nil {
			t.Fatalf("first create: %v", err)
		}
		_, err = accounts.CreateWithCredential(ctx, account.NewAccount{Email: "dup@example.com", Name: "B"}, []byte("hash"), "dup@example.com")
		if !errors.Is(err, account.ErrEmailTaken) {
			t.Fatalf("got err %v, want ErrEmailTaken", err)
		}
	})

	t.Run("RequestDeletion writes an outbox event and is idempotent", func(t *testing.T) {
		user, err := accounts.CreateWithCredential(ctx, account.NewAccount{Email: "delete-me@example.com", Name: "D"}, []byte("hash"), "delete-me@example.com")
		if err != nil {
			t.Fatalf("create: %v", err)
		}

		first, created, err := accounts.RequestDeletion(ctx, user.ID)
		if err != nil || !created {
			t.Fatalf("RequestDeletion: op=%v created=%v err=%v", first, created, err)
		}
		second, created2, err := accounts.RequestDeletion(ctx, user.ID)
		if err != nil {
			t.Fatalf("RequestDeletion (again): %v", err)
		}
		if created2 {
			t.Error("second RequestDeletion reported created=true")
		}
		if first.DeletionID != second.DeletionID {
			t.Errorf("deletion ids differ: %v != %v", first.DeletionID, second.DeletionID)
		}

		pending, err := outbox.ListPending(ctx, 100)
		if err != nil {
			t.Fatalf("ListPending: %v", err)
		}
		var found bool
		for _, rec := range pending {
			if rec.Key == user.ID.String() && rec.Topic == events.DeletionRequestedTopic {
				found = true
				if err := outbox.MarkPublished(ctx, rec.ID); err != nil {
					t.Fatalf("MarkPublished: %v", err)
				}
			}
		}
		if !found {
			t.Fatal("RequestDeletion did not write an outbox event")
		}

		reread, err := outbox.ListPending(ctx, 100)
		if err != nil {
			t.Fatalf("ListPending (after publish): %v", err)
		}
		for _, rec := range reread {
			if rec.Key == user.ID.String() {
				t.Fatal("published record is still listed as pending")
			}
		}
	})

	t.Run("RecordDeletionCompletion tombstones the account once every owner reports", func(t *testing.T) {
		user, err := accounts.CreateWithCredential(ctx, account.NewAccount{Email: "tombstone@example.com", Name: "T"}, []byte("hash"), "tombstone@example.com")
		if err != nil {
			t.Fatalf("create: %v", err)
		}
		op, _, err := accounts.RequestDeletion(ctx, user.ID)
		if err != nil {
			t.Fatalf("RequestDeletion: %v", err)
		}

		for _, owner := range account.RequiredDeletionParticipants {
			if _, err := accounts.RecordDeletionCompletion(ctx, op.DeletionID, owner); err != nil {
				t.Fatalf("RecordDeletionCompletion(%s): %v", owner, err)
			}
		}

		got, err := accounts.FindByID(ctx, user.ID)
		if err != nil {
			t.Fatalf("FindByID: %v", err)
		}
		if got.State != account.StateTombstoned {
			t.Errorf("state = %v, want tombstoned", got.State)
		}
	})

	t.Run("inbox Record deduplicates by consumer group and event id", func(t *testing.T) {
		eventID := uuid.New()
		inserted, err := inbox.Record(ctx, "test-consumer", eventID)
		if err != nil || !inserted {
			t.Fatalf("first Record: inserted=%v err=%v", inserted, err)
		}
		inserted, err = inbox.Record(ctx, "test-consumer", eventID)
		if err != nil {
			t.Fatalf("second Record: %v", err)
		}
		if inserted {
			t.Error("duplicate event id was reported as newly inserted")
		}
	})
}
