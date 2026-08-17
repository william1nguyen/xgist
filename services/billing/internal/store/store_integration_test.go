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

	"github.com/nolannguyen1212/media-notes/services/billing/internal/credit"
	"github.com/nolannguyen1212/media-notes/services/billing/internal/quote"
	"github.com/nolannguyen1212/media-notes/services/billing/internal/store"
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
		tcpostgres.WithDatabase("billing_test"),
		tcpostgres.WithUsername("billing_test"),
		tcpostgres.WithPassword("billing_test"),
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

	quotes := store.NewQuoteRepository(pool)
	credits := store.NewCreditRepository(pool, 24*time.Hour)
	outbox := store.NewOutboxRepository(pool)

	t.Run("ActiveCatalog returns the seeded launch-v1 catalog", func(t *testing.T) {
		catalog, err := quotes.ActiveCatalog(ctx)
		if err != nil {
			t.Fatalf("ActiveCatalog: %v", err)
		}
		if catalog.Version != "launch-v1" {
			t.Errorf("version = %q, want launch-v1", catalog.Version)
		}
		if catalog.Prices[quote.ItemTranscribe] != 10 {
			t.Errorf("transcribe price = %d, want 10", catalog.Prices[quote.ItemTranscribe])
		}
	})

	t.Run("Reserve moves credit from available to reserved and is idempotent", func(t *testing.T) {
		userID := uuid.New()
		if _, err := credits.ApplyPurchase(ctx, userID, 100, "purchase:"+userID.String(), nil); err != nil {
			t.Fatalf("ApplyPurchase: %v", err)
		}

		q, err := quotes.Create(ctx, quote.Quote{
			ID: uuid.New(), UserID: userID, CatalogVersion: "launch-v1",
			Items: []quote.Item{{ItemID: quote.ItemTranscribe, Credits: 10}}, TotalCredits: 10,
			ExpiresAt: time.Now().Add(15 * time.Minute), CreatedAt: time.Now(),
		})
		if err != nil {
			t.Fatalf("Create quote: %v", err)
		}

		workflowID := uuid.New()
		res, err := credits.Reserve(ctx, credit.ReserveCommand{UserID: userID, WorkflowID: workflowID, QuoteID: q.ID})
		if err != nil {
			t.Fatalf("Reserve: %v", err)
		}
		if res.Amount != 10 || res.Remaining != 10 {
			t.Errorf("reservation = %+v, want amount=10 remaining=10", res)
		}

		balance, err := credits.GetBalance(ctx, userID)
		if err != nil {
			t.Fatalf("GetBalance: %v", err)
		}
		if balance.Available != 90 || balance.Reserved != 10 {
			t.Errorf("balance = %+v, want available=90 reserved=10", balance)
		}

		again, err := credits.Reserve(ctx, credit.ReserveCommand{UserID: userID, WorkflowID: workflowID, QuoteID: q.ID})
		if err != nil {
			t.Fatalf("Reserve (duplicate): %v", err)
		}
		if again.ID != res.ID {
			t.Errorf("duplicate reserve created a new reservation: %v != %v", again.ID, res.ID)
		}

		balance, err = credits.GetBalance(ctx, userID)
		if err != nil {
			t.Fatalf("GetBalance (after duplicate): %v", err)
		}
		if balance.Available != 90 || balance.Reserved != 10 {
			t.Errorf("balance after duplicate reserve = %+v, want unchanged available=90 reserved=10", balance)
		}
	})

	t.Run("Reserve rejects insufficient credit without erroring the transaction", func(t *testing.T) {
		userID := uuid.New() // never purchased: available = 0

		q, err := quotes.Create(ctx, quote.Quote{
			ID: uuid.New(), UserID: userID, CatalogVersion: "launch-v1",
			Items: []quote.Item{{ItemID: quote.ItemTranscribe, Credits: 10}}, TotalCredits: 10,
			ExpiresAt: time.Now().Add(15 * time.Minute), CreatedAt: time.Now(),
		})
		if err != nil {
			t.Fatalf("Create quote: %v", err)
		}

		_, err = credits.Reserve(ctx, credit.ReserveCommand{UserID: userID, WorkflowID: uuid.New(), QuoteID: q.ID})
		if !errors.Is(err, credit.ErrInsufficientCredit) {
			t.Fatalf("got err %v, want ErrInsufficientCredit", err)
		}

		pending, err := outbox.ListPending(ctx, 100)
		if err != nil {
			t.Fatalf("ListPending: %v", err)
		}
		var found bool
		for _, rec := range pending {
			if rec.Key == userID.String() {
				found = true
			}
		}
		if !found {
			t.Fatal("rejected reservation did not publish a result event")
		}
	})

	t.Run("SettleItem then ReleaseRemainder reconciles available, reserved, and the ledger", func(t *testing.T) {
		userID := uuid.New()
		if _, err := credits.ApplyPurchase(ctx, userID, 100, "purchase:"+userID.String(), nil); err != nil {
			t.Fatalf("ApplyPurchase: %v", err)
		}

		q, err := quotes.Create(ctx, quote.Quote{
			ID: uuid.New(), UserID: userID, CatalogVersion: "launch-v1",
			Items: []quote.Item{
				{ItemID: quote.ItemTranscribe, Credits: 10},
				{ItemID: quote.ItemSummarize, Credits: 20},
			},
			TotalCredits: 30,
			ExpiresAt:    time.Now().Add(15 * time.Minute), CreatedAt: time.Now(),
		})
		if err != nil {
			t.Fatalf("Create quote: %v", err)
		}

		workflowID := uuid.New()
		if _, err := credits.Reserve(ctx, credit.ReserveCommand{UserID: userID, WorkflowID: workflowID, QuoteID: q.ID}); err != nil {
			t.Fatalf("Reserve: %v", err)
		}

		idemKey := "settle:" + workflowID.String() + ":" + quote.ItemTranscribe
		res, err := credits.SettleItem(ctx, workflowID, quote.ItemTranscribe, idemKey)
		if err != nil {
			t.Fatalf("SettleItem: %v", err)
		}
		if res.Remaining != 20 || res.Status != credit.ReservationActive {
			t.Errorf("after settling one of two items: remaining=%d status=%s, want remaining=20 status=active", res.Remaining, res.Status)
		}

		// Redelivery of the same settle command must not spend twice.
		res, err = credits.SettleItem(ctx, workflowID, quote.ItemTranscribe, idemKey)
		if err != nil {
			t.Fatalf("SettleItem (redelivery): %v", err)
		}
		if res.Remaining != 20 {
			t.Errorf("redelivered settle changed remaining to %d, want 20", res.Remaining)
		}

		res, err = credits.ReleaseRemainder(ctx, workflowID, "release:"+workflowID.String())
		if err != nil {
			t.Fatalf("ReleaseRemainder: %v", err)
		}
		if res.Remaining != 0 || res.Status != credit.ReservationReleased {
			t.Errorf("after release: remaining=%d status=%s, want remaining=0 status=released", res.Remaining, res.Status)
		}

		balance, err := credits.GetBalance(ctx, userID)
		if err != nil {
			t.Fatalf("GetBalance: %v", err)
		}
		// Purchased 100, reserved 30, settled (spent) 10, released 20 back.
		if balance.Available != 90 {
			t.Errorf("available = %d, want 90 (100 purchased - 10 settled)", balance.Available)
		}
		if balance.Reserved != 0 {
			t.Errorf("reserved = %d, want 0 after full release", balance.Reserved)
		}

		var ledgerSum int64
		if err := pool.QueryRow(ctx, `SELECT COALESCE(SUM(delta), 0) FROM billing.credit_ledger WHERE user_id = $1`, userID).Scan(&ledgerSum); err != nil {
			t.Fatalf("sum ledger: %v", err)
		}
		if ledgerSum != balance.Available {
			t.Errorf("ledger delta sum = %d, want it to reconcile with available balance %d", ledgerSum, balance.Available)
		}
	})
}
