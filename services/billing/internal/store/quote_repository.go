package store

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/nolannguyen1212/media-notes/services/billing/internal/quote"
)

// QuoteRepository implements quote.Repository over PostgreSQL.
type QuoteRepository struct {
	pool *pgxpool.Pool
}

// NewQuoteRepository returns a QuoteRepository.
func NewQuoteRepository(pool *pgxpool.Pool) *QuoteRepository {
	return &QuoteRepository{pool: pool}
}

// ActiveCatalog returns the catalog version with the latest active_at not
// after now. Catalog rollout and rollback change which version this
// selects for new quotes only; already-issued quotes keep their stored
// catalog_version.
func (r *QuoteRepository) ActiveCatalog(ctx context.Context) (quote.Catalog, error) {
	row := r.pool.QueryRow(ctx, `
		SELECT id, items, active_at
		FROM billing.catalog_versions
		WHERE active_at <= now()
		ORDER BY active_at DESC
		LIMIT 1
	`)

	var version string
	var pricesJSON []byte
	var activeAt time.Time
	if err := row.Scan(&version, &pricesJSON, &activeAt); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return quote.Catalog{}, fmt.Errorf("store: no active catalog version")
		}
		return quote.Catalog{}, err
	}

	var prices map[string]int64
	if err := json.Unmarshal(pricesJSON, &prices); err != nil {
		return quote.Catalog{}, err
	}
	return quote.Catalog{Version: version, Prices: prices, ActiveAt: activeAt}, nil
}

func (r *QuoteRepository) Create(ctx context.Context, q quote.Quote) (quote.Quote, error) {
	itemsJSON, err := json.Marshal(q.Items)
	if err != nil {
		return quote.Quote{}, err
	}

	row := r.pool.QueryRow(ctx, `
		INSERT INTO billing.quotes (id, user_id, catalog_version, amount, options, expires_at)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, user_id, catalog_version, amount, options, expires_at, accepted_at, created_at
	`, q.ID, q.UserID, q.CatalogVersion, q.TotalCredits, itemsJSON, q.ExpiresAt)

	return scanQuote(row)
}

func (r *QuoteRepository) FindByID(ctx context.Context, id uuid.UUID) (quote.Quote, error) {
	row := r.pool.QueryRow(ctx, `
		SELECT id, user_id, catalog_version, amount, options, expires_at, accepted_at, created_at
		FROM billing.quotes WHERE id = $1
	`, id)
	return scanQuote(row)
}

// markQuoteAccepted stamps a quote's accepted_at once, as part of the
// caller's transaction, if it is not already accepted. Called from
// credit_repository.Reserve: reserving credit against a quote is what
// "accepts" it, per ADR 0008.
func markQuoteAccepted(ctx context.Context, q querier, id uuid.UUID) error {
	_, err := q.Exec(ctx, `
		UPDATE billing.quotes SET accepted_at = now() WHERE id = $1 AND accepted_at IS NULL
	`, id)
	return err
}

func findQuoteByID(ctx context.Context, q querier, id uuid.UUID) (quote.Quote, error) {
	row := q.QueryRow(ctx, `
		SELECT id, user_id, catalog_version, amount, options, expires_at, accepted_at, created_at
		FROM billing.quotes WHERE id = $1
		FOR UPDATE
	`, id)
	return scanQuote(row)
}

func scanQuote(row rowScanner) (quote.Quote, error) {
	var q quote.Quote
	var itemsJSON []byte
	err := row.Scan(&q.ID, &q.UserID, &q.CatalogVersion, &q.TotalCredits, &itemsJSON, &q.ExpiresAt, &q.AcceptedAt, &q.CreatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return quote.Quote{}, quote.ErrNotFound
		}
		return quote.Quote{}, err
	}
	if err := json.Unmarshal(itemsJSON, &q.Items); err != nil {
		return quote.Quote{}, err
	}
	return q, nil
}
