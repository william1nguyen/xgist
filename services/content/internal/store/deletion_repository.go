package store

import (
	"context"
	"encoding/json"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/nolannguyen1212/media-notes/services/content/internal/events"
)

// DeletionRepository implements deletion.Repository over PostgreSQL.
type DeletionRepository struct {
	pool *pgxpool.Pool
}

// NewDeletionRepository returns a DeletionRepository.
func NewDeletionRepository(pool *pgxpool.Pool) *DeletionRepository {
	return &DeletionRepository{pool: pool}
}

func (r *DeletionRepository) DeleteOwnedRows(ctx context.Context, deletionID, mediaID uuid.UUID) error {
	return withTx(ctx, r.pool, func(ctx context.Context, tx pgx.Tx) error {
		tag, err := tx.Exec(ctx, `
			INSERT INTO content_deletions (media_id, deletion_id) VALUES ($1, $2)
			ON CONFLICT (media_id) DO NOTHING
		`, mediaID, deletionID)
		if err != nil {
			return err
		}
		if tag.RowsAffected() == 0 {
			// Already processed for this media item: redelivery or a
			// reconciler republish after content already reported
			// completion.
			return nil
		}

		// Cascades to every child row content owns for this media item
		// (transcript segments, summaries, sentences, citations,
		// keywords, keypoints, notes, summary-audio metadata, step
		// attempts). A media item with no content row is an idempotent
		// success — nothing to delete.
		if _, err := tx.Exec(ctx, `DELETE FROM contents WHERE media_id = $1`, mediaID); err != nil {
			return err
		}

		payload, err := json.Marshal(map[string]any{
			"event_id":    uuid.New(),
			"deletion_id": deletionID,
			"media_id":    mediaID,
			"owner":       "content",
			"status":      "completed",
		})
		if err != nil {
			return err
		}
		return insertOutboxEvent(ctx, tx, events.DeletionCompletedTopic, mediaID.String(), payload)
	})
}

func (r *DeletionRepository) IsDeletionPending(ctx context.Context, mediaID uuid.UUID) (bool, error) {
	var exists bool
	err := r.pool.QueryRow(ctx, `
		SELECT EXISTS(SELECT 1 FROM content_deletions WHERE media_id = $1)
	`, mediaID).Scan(&exists)
	return exists, err
}
