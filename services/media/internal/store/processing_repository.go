package store

import (
	"context"
	"encoding/json"
	"errors"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/nolannguyen1212/media-notes/services/media/internal/processing"
)

// ProcessingRepository implements processing.Repository over PostgreSQL.
// Processing requests are created inside internal/store's
// UploadRepository.Confirm transaction; this repository only reads them.
type ProcessingRepository struct {
	pool *pgxpool.Pool
}

// NewProcessingRepository returns a ProcessingRepository.
func NewProcessingRepository(pool *pgxpool.Pool) *ProcessingRepository {
	return &ProcessingRepository{pool: pool}
}

func (r *ProcessingRepository) FindByMediaID(ctx context.Context, mediaID uuid.UUID) (processing.Request, error) {
	row := r.pool.QueryRow(ctx, `
		SELECT id, media_id, requested_by, options, workflow_id, status, created_at
		FROM processing_requests WHERE media_id = $1
	`, mediaID)
	return scanProcessingRequest(row)
}

func scanProcessingRequest(row rowScanner) (processing.Request, error) {
	var req processing.Request
	var optionsJSON []byte
	var status string
	err := row.Scan(&req.ID, &req.MediaID, &req.RequestedBy, &optionsJSON, &req.WorkflowID, &status, &req.CreatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return processing.Request{}, processing.ErrNotFound
		}
		return processing.Request{}, err
	}
	req.Status = processing.Status(status)
	if len(optionsJSON) > 0 {
		if err := json.Unmarshal(optionsJSON, &req.Options); err != nil {
			return processing.Request{}, err
		}
	}
	return req, nil
}
