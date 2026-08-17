package store

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/nolannguyen1212/media-notes/services/media/internal/events"
	"github.com/nolannguyen1212/media-notes/services/media/internal/media"
	"github.com/nolannguyen1212/media-notes/services/media/internal/processing"
	"github.com/nolannguyen1212/media-notes/services/media/internal/upload"
)

const uploadSessionColumns = `id, media_id, owner_id, object_key, status, expires_at, completed_at`

// UploadRepository implements upload.Repository over PostgreSQL.
type UploadRepository struct {
	pool *pgxpool.Pool
}

// NewUploadRepository returns an UploadRepository.
func NewUploadRepository(pool *pgxpool.Pool) *UploadRepository {
	return &UploadRepository{pool: pool}
}

func (r *UploadRepository) Create(ctx context.Context, mediaID, sessionID uuid.UUID, in upload.NewUploadSession, mediaType media.Type, objectKey string, expiresAt time.Time, maxActiveSessions int) (upload.UploadSession, error) {
	// Idempotent: a duplicate create for the same idempotency_key returns
	// the existing session without recreating it or re-checking the
	// session count.
	if existing, err := findSessionByIdempotencyKey(ctx, r.pool, in.IdempotencyKey); err == nil {
		return existing, nil
	} else if !errors.Is(err, upload.ErrNotFound) {
		return upload.UploadSession{}, err
	}

	var result upload.UploadSession
	txErr := withTx(ctx, r.pool, func(ctx context.Context, tx pgx.Tx) error {
		// Locking every active session row for this owner serializes
		// concurrent CreateUploadSession calls, so the count-then-insert
		// below cannot race past the three-session cap (ADR 0004): a
		// partial unique index cannot express this limit by itself.
		// FOR UPDATE cannot be combined with an aggregate, so the rows are
		// locked first and counted in Go.
		rows, err := tx.Query(ctx, `
			SELECT id FROM upload_sessions
			WHERE owner_id = $1 AND status = 'active'
			FOR UPDATE
		`, in.OwnerID)
		if err != nil {
			return err
		}
		activeCount := 0
		for rows.Next() {
			activeCount++
		}
		rowsErr := rows.Err()
		rows.Close()
		if rowsErr != nil {
			return rowsErr
		}
		if activeCount >= maxActiveSessions {
			return upload.ErrTooManyActiveSessions
		}

		if _, err := tx.Exec(ctx, `
			INSERT INTO media (id, owner_id, title, media_type, object_key, mime_type, status)
			VALUES ($1, $2, $3, $4, $5, $6, $7)
		`, mediaID, in.OwnerID, in.Title, string(mediaType), objectKey, in.MimeType, string(media.StatusPendingUpload)); err != nil {
			return err
		}

		row := tx.QueryRow(ctx, `
			INSERT INTO upload_sessions (id, media_id, owner_id, object_key, status, expires_at, idempotency_key)
			VALUES ($1, $2, $3, $4, 'active', $5, $6)
			RETURNING `+uploadSessionColumns, sessionID, mediaID, in.OwnerID, objectKey, expiresAt, in.IdempotencyKey)
		s, err := scanUploadSession(row)
		if err != nil {
			return err
		}
		result = s
		return nil
	})

	if txErr != nil {
		if isUniqueViolation(txErr) {
			existing, err := findSessionByIdempotencyKey(ctx, r.pool, in.IdempotencyKey)
			if err != nil {
				return upload.UploadSession{}, err
			}
			return existing, nil
		}
		return upload.UploadSession{}, txErr
	}
	return result, nil
}

func (r *UploadRepository) FindByID(ctx context.Context, id uuid.UUID) (upload.UploadSession, error) {
	row := r.pool.QueryRow(ctx, `SELECT `+uploadSessionColumns+` FROM upload_sessions WHERE id = $1`, id)
	return scanUploadSession(row)
}

func (r *UploadRepository) Confirm(ctx context.Context, sessionID uuid.UUID, sizeBytes int64, mimeType string, options []string, audioVoice string, promptOverrides map[string]string, idempotencyKey string) (media.Media, error) {
	var result media.Media
	txErr := withTx(ctx, r.pool, func(ctx context.Context, tx pgx.Tx) error {
		row := tx.QueryRow(ctx, `SELECT `+uploadSessionColumns+` FROM upload_sessions WHERE id = $1 FOR UPDATE`, sessionID)
		session, err := scanUploadSession(row)
		if err != nil {
			return err
		}
		if session.Status != upload.StatusActive {
			// Lost a race with a concurrent Confirm for the same session:
			// it already committed, so return its result rather than
			// mutating anything again.
			m, err := findMediaByID(ctx, tx, session.MediaID)
			if err != nil {
				return err
			}
			result = m
			return nil
		}

		now := time.Now()
		if _, err := tx.Exec(ctx, `
			UPDATE upload_sessions SET status = 'completed', completed_at = $2 WHERE id = $1
		`, sessionID, now); err != nil {
			return err
		}

		row = tx.QueryRow(ctx, `
			UPDATE media
			SET size_bytes = $2, mime_type = $3, status = $4, updated_at = now()
			WHERE id = $1
			RETURNING `+mediaColumns, session.MediaID, sizeBytes, mimeType, string(media.StatusProcessing))
		m, err := scanMedia(row)
		if err != nil {
			return err
		}
		result = m

		optionsJSON, err := json.Marshal(options)
		if err != nil {
			return err
		}
		if _, err := tx.Exec(ctx, `
			INSERT INTO processing_requests (id, media_id, requested_by, options, status)
			VALUES ($1, $2, $3, $4, $5)
		`, uuid.New(), session.MediaID, session.OwnerID, optionsJSON, string(processing.StatusRequested)); err != nil {
			return err
		}

		payload, err := json.Marshal(map[string]any{
			"event_id":         uuid.New(),
			"media_id":         session.MediaID,
			"options":          options,
			"audio_voice":      audioVoice,
			"prompt_overrides": promptOverrides,
		})
		if err != nil {
			return err
		}
		return insertOutboxEvent(ctx, tx, events.ProcessingRequestedTopic, session.MediaID.String(), payload)
	})
	if txErr != nil {
		return media.Media{}, txErr
	}
	return result, nil
}

func (r *UploadRepository) FindConfirmedMedia(ctx context.Context, mediaID uuid.UUID) (media.Media, error) {
	return findMediaByID(ctx, r.pool, mediaID)
}

func findSessionByIdempotencyKey(ctx context.Context, q querier, key string) (upload.UploadSession, error) {
	row := q.QueryRow(ctx, `SELECT `+uploadSessionColumns+` FROM upload_sessions WHERE idempotency_key = $1`, key)
	return scanUploadSession(row)
}

func findMediaByID(ctx context.Context, q querier, id uuid.UUID) (media.Media, error) {
	row := q.QueryRow(ctx, `SELECT `+mediaColumns+` FROM media WHERE id = $1`, id)
	return scanMedia(row)
}

func scanUploadSession(row rowScanner) (upload.UploadSession, error) {
	var s upload.UploadSession
	var status string
	err := row.Scan(&s.ID, &s.MediaID, &s.OwnerID, &s.ObjectKey, &status, &s.ExpiresAt, &s.CompletedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return upload.UploadSession{}, upload.ErrNotFound
		}
		return upload.UploadSession{}, err
	}
	s.Status = upload.Status(status)
	return s, nil
}
