// Package store implements identity's PostgreSQL repositories: the
// account, session, outbox, and inbox persistence boundaries defined by
// internal/account, internal/session, and internal/events.
package store

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"
)

// NewPool opens a pgx connection pool for databaseURL and verifies
// connectivity.
func NewPool(ctx context.Context, databaseURL string) (*pgxpool.Pool, error) {
	pool, err := pgxpool.New(ctx, databaseURL)
	if err != nil {
		return nil, fmt.Errorf("open pool: %w", err)
	}
	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("ping database: %w", err)
	}
	return pool, nil
}

// CheckMigrated fails fast if Flyway migrations have not been applied.
// identity does not migrate itself at boot: migrations run externally
// through `make db:migrate:identity` (see migrations/), the same way a
// deployment would run them as a release step. This only verifies that
// step already happened.
func CheckMigrated(ctx context.Context, pool *pgxpool.Pool) error {
	var exists bool
	err := pool.QueryRow(ctx, `SELECT to_regclass('public.flyway_schema_history') IS NOT NULL`).Scan(&exists)
	if err != nil {
		return fmt.Errorf("check flyway_schema_history: %w", err)
	}
	if !exists {
		return fmt.Errorf("no flyway_schema_history table found; run `make db:migrate:identity` before starting the service")
	}
	return nil
}
