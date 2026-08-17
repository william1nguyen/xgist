package store

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/nolannguyen1212/media-notes/services/media/internal/deletion"
	"github.com/nolannguyen1212/media-notes/services/media/internal/events"
	"github.com/nolannguyen1212/media-notes/services/media/internal/media"
)

const deletionColumns = `deletion_id, media_id, owner_id, state, participants, created_at, completed_at`

// DeletionRepository implements deletion.Repository over PostgreSQL.
type DeletionRepository struct {
	pool *pgxpool.Pool
}

// NewDeletionRepository returns a DeletionRepository.
func NewDeletionRepository(pool *pgxpool.Pool) *DeletionRepository {
	return &DeletionRepository{pool: pool}
}

func (r *DeletionRepository) RequestDeletion(ctx context.Context, mediaID uuid.UUID) (deletion.Operation, []string, error) {
	var op deletion.Operation
	var objectKeys []string

	txErr := withTx(ctx, r.pool, func(ctx context.Context, tx pgx.Tx) error {
		row := tx.QueryRow(ctx, `SELECT `+mediaColumns+` FROM media WHERE id = $1 FOR UPDATE`, mediaID)
		m, err := scanMedia(row)
		if err != nil {
			return err
		}

		if m.Status == media.StatusDeletionPending {
			d, err := findDeletionByMediaID(ctx, tx, mediaID)
			if err != nil {
				return err
			}
			op = d
		} else {
			if _, err := tx.Exec(ctx, `
				UPDATE media SET status = $2, updated_at = now() WHERE id = $1
			`, mediaID, string(media.StatusDeletionPending)); err != nil {
				return err
			}
			if _, err := tx.Exec(ctx, `
				UPDATE upload_sessions SET status = 'canceled' WHERE media_id = $1 AND status = 'active'
			`, mediaID); err != nil {
				return err
			}

			participants, err := json.Marshal(map[string]string{})
			if err != nil {
				return err
			}
			row := tx.QueryRow(ctx, `
				INSERT INTO media_deletions (deletion_id, media_id, owner_id, state, participants)
				VALUES ($1, $2, $3, 'pending', $4)
				RETURNING `+deletionColumns, uuid.New(), mediaID, m.OwnerID, participants)
			d, err := scanDeletionOperation(row)
			if err != nil {
				return err
			}
			op = d

			payload, err := json.Marshal(map[string]any{
				"event_id":    uuid.New(),
				"deletion_id": op.DeletionID,
				"media_id":    mediaID,
				"owner_id":    m.OwnerID,
			})
			if err != nil {
				return err
			}
			if err := insertOutboxEvent(ctx, tx, events.DeletionRequestedTopic, mediaID.String(), payload); err != nil {
				return err
			}
		}

		keys, err := ownedObjectKeys(ctx, tx, mediaID)
		if err != nil {
			return err
		}
		objectKeys = keys
		return nil
	})

	if txErr != nil {
		if errors.Is(txErr, media.ErrNotFound) {
			return deletion.Operation{}, nil, deletion.ErrNotFound
		}
		return deletion.Operation{}, nil, txErr
	}
	return op, objectKeys, nil
}

// ownedObjectKeys returns every object key media currently owns for
// mediaID: the source object and every registered derivative. Rows
// already removed by a prior MarkRowsDeleted call are naturally absent,
// so a retried RequestDeletion call only re-attempts objects it has not
// yet confirmed removed.
func ownedObjectKeys(ctx context.Context, q querier, mediaID uuid.UUID) ([]string, error) {
	var keys []string

	var sourceKey string
	if err := q.QueryRow(ctx, `SELECT object_key FROM media WHERE id = $1`, mediaID).Scan(&sourceKey); err != nil {
		return nil, err
	}
	if sourceKey != "" {
		keys = append(keys, sourceKey)
	}

	rows, err := q.Query(ctx, `SELECT object_key FROM derivatives WHERE media_id = $1`, mediaID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var key string
		if err := rows.Scan(&key); err != nil {
			return nil, err
		}
		keys = append(keys, key)
	}
	return keys, rows.Err()
}

func (r *DeletionRepository) MarkRowsDeleted(ctx context.Context, mediaID uuid.UUID) error {
	return withTx(ctx, r.pool, func(ctx context.Context, tx pgx.Tx) error {
		if _, err := tx.Exec(ctx, `DELETE FROM derivatives WHERE media_id = $1`, mediaID); err != nil {
			return err
		}
		if _, err := tx.Exec(ctx, `DELETE FROM processing_requests WHERE media_id = $1`, mediaID); err != nil {
			return err
		}
		if _, err := tx.Exec(ctx, `DELETE FROM upload_sessions WHERE media_id = $1`, mediaID); err != nil {
			return err
		}
		return nil
	})
}

func (r *DeletionRepository) FindOperation(ctx context.Context, deletionID uuid.UUID) (deletion.Operation, error) {
	row := r.pool.QueryRow(ctx, `SELECT `+deletionColumns+` FROM media_deletions WHERE deletion_id = $1`, deletionID)
	return scanDeletionOperation(row)
}

func (r *DeletionRepository) RecordCompletion(ctx context.Context, deletionID uuid.UUID, participant string) (deletion.Operation, error) {
	var result deletion.Operation
	txErr := withTx(ctx, r.pool, func(ctx context.Context, tx pgx.Tx) error {
		row := tx.QueryRow(ctx, `SELECT `+deletionColumns+` FROM media_deletions WHERE deletion_id = $1 FOR UPDATE`, deletionID)
		op, err := scanDeletionOperation(row)
		if err != nil {
			return err
		}

		if op.Participants == nil {
			op.Participants = map[string]string{}
		}
		op.Participants[participant] = "completed"

		newState := op.State
		var completedAt *time.Time
		if op.Done() {
			newState = deletion.StateCompleted
			now := time.Now()
			completedAt = &now
		}

		participantsJSON, err := json.Marshal(op.Participants)
		if err != nil {
			return err
		}

		row = tx.QueryRow(ctx, `
			UPDATE media_deletions
			SET participants = $2, state = $3, completed_at = $4
			WHERE deletion_id = $1
			RETURNING `+deletionColumns, deletionID, participantsJSON, string(newState), completedAt)
		result, err = scanDeletionOperation(row)
		return err
	})
	if txErr != nil {
		return deletion.Operation{}, txErr
	}
	return result, nil
}

func (r *DeletionRepository) ListOverduePending(ctx context.Context, olderThan time.Duration, limit int) ([]deletion.Operation, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT `+deletionColumns+`
		FROM media_deletions
		WHERE state = 'pending' AND created_at < $1
		ORDER BY created_at ASC
		LIMIT $2
	`, time.Now().Add(-olderThan), limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var ops []deletion.Operation
	for rows.Next() {
		op, err := scanDeletionOperation(rows)
		if err != nil {
			return nil, err
		}
		ops = append(ops, op)
	}
	return ops, rows.Err()
}

func (r *DeletionRepository) RepublishRequested(ctx context.Context, deletionID uuid.UUID) error {
	op, err := r.FindOperation(ctx, deletionID)
	if err != nil {
		return err
	}
	payload, err := json.Marshal(map[string]any{
		"event_id":    uuid.New(),
		"deletion_id": op.DeletionID,
		"media_id":    op.MediaID,
		"owner_id":    op.OwnerID,
	})
	if err != nil {
		return err
	}
	return insertOutboxEvent(ctx, r.pool, events.DeletionRequestedTopic, op.MediaID.String(), payload)
}

func (r *DeletionRepository) ListActiveMediaIDs(ctx context.Context, ownerID uuid.UUID) ([]uuid.UUID, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id FROM media WHERE owner_id = $1 AND status != 'deletion_pending'
	`, ownerID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var ids []uuid.UUID
	for rows.Next() {
		var id uuid.UUID
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		ids = append(ids, id)
	}
	return ids, rows.Err()
}

func (r *DeletionRepository) PublishAccountDeletionCompletion(ctx context.Context, accountDeletionID, ownerID uuid.UUID) error {
	payload, err := json.Marshal(map[string]any{
		"event_id":    uuid.New(),
		"deletion_id": accountDeletionID,
		"owner":       "media",
		"status":      "completed",
	})
	if err != nil {
		return err
	}
	return insertOutboxEvent(ctx, r.pool, events.DeletionCompletedTopic, ownerID.String(), payload)
}

func findDeletionByMediaID(ctx context.Context, q querier, mediaID uuid.UUID) (deletion.Operation, error) {
	row := q.QueryRow(ctx, `SELECT `+deletionColumns+` FROM media_deletions WHERE media_id = $1`, mediaID)
	return scanDeletionOperation(row)
}

func scanDeletionOperation(row rowScanner) (deletion.Operation, error) {
	var op deletion.Operation
	var state string
	var participants []byte
	err := row.Scan(&op.DeletionID, &op.MediaID, &op.OwnerID, &state, &participants, &op.CreatedAt, &op.CompletedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return deletion.Operation{}, deletion.ErrOperationNotFound
		}
		return deletion.Operation{}, err
	}
	op.State = deletion.State(state)
	if len(participants) > 0 {
		if err := json.Unmarshal(participants, &op.Participants); err != nil {
			return deletion.Operation{}, err
		}
	}
	return op, nil
}
