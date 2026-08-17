package store

import (
	"context"
	"encoding/json"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/nolannguyen1212/media-notes/services/media/internal/derivative"
	"github.com/nolannguyen1212/media-notes/services/media/internal/events"
)

const derivativeColumns = `id, media_id, derivative_type, version, object_key, mime_type, COALESCE(width, 0), COALESCE(height, 0), COALESCE(size_bytes, 0), status`

// DerivativeRepository implements derivative.Repository over PostgreSQL.
type DerivativeRepository struct {
	pool *pgxpool.Pool
}

// NewDerivativeRepository returns a DerivativeRepository.
func NewDerivativeRepository(pool *pgxpool.Pool) *DerivativeRepository {
	return &DerivativeRepository{pool: pool}
}

func (r *DerivativeRepository) Register(ctx context.Context, in derivative.NewDerivative) (derivative.Derivative, error) {
	var result derivative.Derivative
	txErr := withTx(ctx, r.pool, func(ctx context.Context, tx pgx.Tx) error {
		row := tx.QueryRow(ctx, `
			INSERT INTO derivatives (id, media_id, derivative_type, version, object_key, mime_type, width, height, size_bytes, status)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
			ON CONFLICT (media_id, derivative_type, version) DO NOTHING
			RETURNING `+derivativeColumns, uuid.New(), in.MediaID, string(in.DerivativeType), in.Version, in.ObjectKey, in.MimeType, in.Width, in.Height, in.SizeBytes, string(derivative.StatusReady))
		d, err := scanDerivative(row)
		if err != nil {
			if errors.Is(err, derivative.ErrNotFound) {
				// ON CONFLICT DO NOTHING: this (media_id, derivative_type,
				// version) was already registered. Return the existing
				// row without republishing the ready event.
				existing, findErr := findDerivative(ctx, tx, in.MediaID, in.DerivativeType, in.Version)
				if findErr != nil {
					return findErr
				}
				result = existing
				return nil
			}
			return err
		}
		result = d

		payload, err := json.Marshal(map[string]any{
			"event_id":        uuid.New(),
			"media_id":        d.MediaID,
			"derivative_id":   d.ID,
			"derivative_type": string(d.DerivativeType),
			"version":         d.Version,
			"object_key":      d.ObjectKey,
		})
		if err != nil {
			return err
		}
		return insertOutboxEvent(ctx, tx, events.DerivativeReadyTopic, d.MediaID.String(), payload)
	})
	if txErr != nil {
		if isForeignKeyViolation(txErr) {
			return derivative.Derivative{}, derivative.ErrMediaNotFound
		}
		return derivative.Derivative{}, txErr
	}
	return result, nil
}

func (r *DerivativeRepository) FindLatestReady(ctx context.Context, mediaID uuid.UUID, derivativeType derivative.Type) (derivative.Derivative, error) {
	row := r.pool.QueryRow(ctx, `
		SELECT `+derivativeColumns+`
		FROM derivatives
		WHERE media_id = $1 AND derivative_type = $2 AND status = 'ready'
		ORDER BY version DESC
		LIMIT 1
	`, mediaID, string(derivativeType))
	return scanDerivative(row)
}

func findDerivative(ctx context.Context, q querier, mediaID uuid.UUID, derivativeType derivative.Type, version int) (derivative.Derivative, error) {
	row := q.QueryRow(ctx, `
		SELECT `+derivativeColumns+`
		FROM derivatives WHERE media_id = $1 AND derivative_type = $2 AND version = $3
	`, mediaID, string(derivativeType), version)
	return scanDerivative(row)
}

func scanDerivative(row rowScanner) (derivative.Derivative, error) {
	var d derivative.Derivative
	var dType, status string
	err := row.Scan(&d.ID, &d.MediaID, &dType, &d.Version, &d.ObjectKey, &d.MimeType, &d.Width, &d.Height, &d.SizeBytes, &status)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return derivative.Derivative{}, derivative.ErrNotFound
		}
		return derivative.Derivative{}, err
	}
	d.DerivativeType = derivative.Type(dType)
	d.Status = derivative.Status(status)
	return d, nil
}
