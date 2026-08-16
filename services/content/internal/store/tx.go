package store

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
)

// querier is the subset of pgx operations repositories use. Both
// *pgxpool.Pool and pgx.Tx satisfy it, so query helpers work identically
// inside or outside a transaction.
type querier interface {
	Exec(ctx context.Context, sql string, args ...any) (pgconn.CommandTag, error)
	Query(ctx context.Context, sql string, args ...any) (pgx.Rows, error)
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
}

// rowScanner is the subset of pgx.Row/pgx.Rows repositories scan from.
type rowScanner interface {
	Scan(dest ...any) error
}

// withTx runs fn inside a database transaction, committing on success and
// rolling back on error or panic.
func withTx(ctx context.Context, pool *pgxpool.Pool, fn func(ctx context.Context, tx pgx.Tx) error) (err error) {
	tx, err := pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin tx: %w", err)
	}
	defer func() {
		if p := recover(); p != nil {
			_ = tx.Rollback(ctx)
			panic(p)
		}
		if err != nil {
			_ = tx.Rollback(ctx)
		}
	}()

	if err = fn(ctx, tx); err != nil {
		return err
	}
	return tx.Commit(ctx)
}
