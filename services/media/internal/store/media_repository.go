package store

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/nolannguyen1212/media-notes/services/media/internal/events"
	"github.com/nolannguyen1212/media-notes/services/media/internal/media"
	"github.com/nolannguyen1212/media-notes/services/media/internal/processing"
)

const mediaColumns = `id, owner_id, title, media_type, object_key, mime_type, COALESCE(size_bytes, 0), COALESCE(duration_ms, 0), COALESCE(checksum, ''), status, created_at, updated_at, COALESCE(description, ''), trashed_at`

// MediaRepository implements media.Repository over PostgreSQL.
type MediaRepository struct {
	pool *pgxpool.Pool
}

// NewMediaRepository returns a MediaRepository.
func NewMediaRepository(pool *pgxpool.Pool) *MediaRepository {
	return &MediaRepository{pool: pool}
}

func (r *MediaRepository) FindByID(ctx context.Context, id uuid.UUID) (media.Media, error) {
	row := r.pool.QueryRow(ctx, `SELECT `+mediaColumns+` FROM media WHERE id = $1`, id)
	return scanMedia(row)
}

// cursorPayload is the opaque page cursor: the last row's (created_at, id)
// tuple, so ties on created_at still page deterministically.
type cursorPayload struct {
	CreatedAt time.Time `json:"created_at"`
	ID        uuid.UUID `json:"id"`
}

func (r *MediaRepository) List(ctx context.Context, ownerID uuid.UUID, cursor string, pageSize int, search string) (media.Page, error) {
	var (
		rows pgx.Rows
		err  error
	)
	if cursor == "" {
		rows, err = r.pool.Query(ctx, `
			SELECT `+mediaColumns+`
			FROM media
			WHERE owner_id = $1 AND status != 'deletion_pending' AND trashed_at IS NULL
			  AND ($3 = '' OR title ILIKE '%' || $3 || '%')
			ORDER BY created_at DESC, id DESC
			LIMIT $2
		`, ownerID, pageSize+1, search)
	} else {
		c, decodeErr := decodeCursor(cursor)
		if decodeErr != nil {
			return media.Page{}, decodeErr
		}
		rows, err = r.pool.Query(ctx, `
			SELECT `+mediaColumns+`
			FROM media
			WHERE owner_id = $1 AND status != 'deletion_pending' AND trashed_at IS NULL
			  AND (created_at, id) < ($2, $3)
			  AND ($5 = '' OR title ILIKE '%' || $5 || '%')
			ORDER BY created_at DESC, id DESC
			LIMIT $4
		`, ownerID, c.CreatedAt, c.ID, pageSize+1, search)
	}
	if err != nil {
		return media.Page{}, err
	}
	defer rows.Close()

	var items []media.Media
	for rows.Next() {
		m, err := scanMedia(rows)
		if err != nil {
			return media.Page{}, err
		}
		items = append(items, m)
	}
	if err := rows.Err(); err != nil {
		return media.Page{}, err
	}

	page := media.Page{Items: items}
	if len(items) > pageSize {
		page.Items = items[:pageSize]
		page.NextCursor = encodeCursor(items[pageSize-1])
	}
	return page, nil
}

func (r *MediaRepository) Update(ctx context.Context, id uuid.UUID, title, description *string) (media.Media, error) {
	row := r.pool.QueryRow(ctx, `
		UPDATE media
		SET title = COALESCE($2, title),
		    description = CASE WHEN $3::boolean THEN $4 ELSE description END,
		    updated_at = now()
		WHERE id = $1 AND status != 'deletion_pending' AND trashed_at IS NULL
		RETURNING `+mediaColumns,
		id, title, description != nil, description)
	return scanMedia(row)
}

// Trash sets trashed_at to now() unless already set, so a repeat call
// does not push the 30-day purge clock back out.
func (r *MediaRepository) Trash(ctx context.Context, id uuid.UUID) (media.Media, error) {
	row := r.pool.QueryRow(ctx, `
		UPDATE media SET trashed_at = COALESCE(trashed_at, now()), updated_at = now()
		WHERE id = $1 AND status != 'deletion_pending'
		RETURNING `+mediaColumns, id)
	return scanMedia(row)
}

// Restore clears trashed_at.
func (r *MediaRepository) Restore(ctx context.Context, id uuid.UUID) (media.Media, error) {
	row := r.pool.QueryRow(ctx, `
		UPDATE media SET trashed_at = NULL, updated_at = now()
		WHERE id = $1 AND status != 'deletion_pending'
		RETURNING `+mediaColumns, id)
	return scanMedia(row)
}

func (r *MediaRepository) ListTrashed(ctx context.Context, ownerID uuid.UUID, cursor string, pageSize int) (media.Page, error) {
	var (
		rows pgx.Rows
		err  error
	)
	if cursor == "" {
		rows, err = r.pool.Query(ctx, `
			SELECT `+mediaColumns+`
			FROM media
			WHERE owner_id = $1 AND status != 'deletion_pending' AND trashed_at IS NOT NULL
			ORDER BY trashed_at DESC, id DESC
			LIMIT $2
		`, ownerID, pageSize+1)
	} else {
		c, decodeErr := decodeCursor(cursor)
		if decodeErr != nil {
			return media.Page{}, decodeErr
		}
		rows, err = r.pool.Query(ctx, `
			SELECT `+mediaColumns+`
			FROM media
			WHERE owner_id = $1 AND status != 'deletion_pending' AND trashed_at IS NOT NULL
			  AND (trashed_at, id) < ($2, $3)
			ORDER BY trashed_at DESC, id DESC
			LIMIT $4
		`, ownerID, c.CreatedAt, c.ID, pageSize+1)
	}
	if err != nil {
		return media.Page{}, err
	}
	defer rows.Close()

	var items []media.Media
	for rows.Next() {
		m, err := scanMedia(rows)
		if err != nil {
			return media.Page{}, err
		}
		items = append(items, m)
	}
	if err := rows.Err(); err != nil {
		return media.Page{}, err
	}

	page := media.Page{Items: items}
	if len(items) > pageSize {
		page.Items = items[:pageSize]
		last := items[pageSize-1]
		// Reuses cursorPayload/encodeCursor's (timestamp, id) shape with
		// TrashedAt standing in for CreatedAt — ListTrashed orders by
		// trashed_at, not created_at, so the cursor must match.
		b, _ := json.Marshal(cursorPayload{CreatedAt: *last.TrashedAt, ID: last.ID})
		page.NextCursor = base64.URLEncoding.EncodeToString(b)
	}
	return page, nil
}

// ListTrashedOlderThan returns trashed items (any owner) whose trashed_at
// predates olderThan, for the purge sweep.
func (r *MediaRepository) ListTrashedOlderThan(ctx context.Context, olderThan time.Duration, limit int) ([]media.Media, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT `+mediaColumns+`
		FROM media
		WHERE trashed_at IS NOT NULL AND trashed_at < $1
		ORDER BY trashed_at ASC
		LIMIT $2
	`, time.Now().Add(-olderThan), limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var items []media.Media
	for rows.Next() {
		m, err := scanMedia(rows)
		if err != nil {
			return nil, err
		}
		items = append(items, m)
	}
	return items, rows.Err()
}

// RequestProcessing atomically re-checks the media item's status under
// lock, transitions it back to processing, creates a new processing
// request row, and writes the outbox event.
func (r *MediaRepository) RequestProcessing(ctx context.Context, mediaID uuid.UUID, idempotencyKey string, options []string, audioVoice string, promptOverrides map[string]string) (media.Media, error) {
	if existing, err := findMediaByProcessingIdempotencyKey(ctx, r.pool, idempotencyKey); err == nil {
		return existing, nil
	} else if !errors.Is(err, media.ErrNotFound) {
		return media.Media{}, err
	}

	var result media.Media
	txErr := withTx(ctx, r.pool, func(ctx context.Context, tx pgx.Tx) error {
		row := tx.QueryRow(ctx, `SELECT `+mediaColumns+` FROM media WHERE id = $1 FOR UPDATE`, mediaID)
		m, err := scanMedia(row)
		if err != nil {
			return err
		}
		if !m.Status.IsTerminal() {
			return media.ErrNotProcessable
		}

		row = tx.QueryRow(ctx, `
			UPDATE media SET status = $2, version = version + 1, updated_at = now()
			WHERE id = $1
			RETURNING `+mediaColumns, mediaID, string(media.StatusProcessing))
		m, err = scanMedia(row)
		if err != nil {
			return err
		}
		result = m

		optionsJSON, err := json.Marshal(options)
		if err != nil {
			return err
		}
		if _, err := tx.Exec(ctx, `
			INSERT INTO processing_requests (id, media_id, requested_by, options, status, idempotency_key)
			VALUES ($1, $2, $3, $4, $5, $6)
		`, uuid.New(), mediaID, m.OwnerID, optionsJSON, string(processing.StatusRequested), idempotencyKey); err != nil {
			return err
		}

		payload, err := json.Marshal(map[string]any{
			"event_id":         uuid.New(),
			"media_id":         mediaID,
			"options":          options,
			"audio_voice":      audioVoice,
			"prompt_overrides": promptOverrides,
		})
		if err != nil {
			return err
		}
		return insertOutboxEvent(ctx, tx, events.ProcessingRequestedTopic, mediaID.String(), payload)
	})
	if txErr != nil {
		if isUniqueViolation(txErr) {
			existing, err := findMediaByProcessingIdempotencyKey(ctx, r.pool, idempotencyKey)
			if err != nil {
				return media.Media{}, err
			}
			return existing, nil
		}
		return media.Media{}, txErr
	}
	return result, nil
}

func findMediaByProcessingIdempotencyKey(ctx context.Context, q querier, key string) (media.Media, error) {
	row := q.QueryRow(ctx, `SELECT media_id FROM processing_requests WHERE idempotency_key = $1`, key)
	var mediaID uuid.UUID
	if err := row.Scan(&mediaID); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return media.Media{}, media.ErrNotFound
		}
		return media.Media{}, err
	}
	return findMediaByID(ctx, q, mediaID)
}

func (r *MediaRepository) ApplyWorkflowStatus(ctx context.Context, mediaID uuid.UUID, status media.Status) error {
	_, err := r.pool.Exec(ctx, `
		UPDATE media SET status = $2, updated_at = now(), version = version + 1
		WHERE id = $1 AND status != 'deletion_pending'
	`, mediaID, string(status))
	return err
}

func (r *MediaRepository) FindProgress(ctx context.Context, ownerID uuid.UUID, ids []uuid.UUID) ([]media.Progress, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT m.id, m.status, m.updated_at, m.version,
		       COALESCE(pr.status, ''), COALESCE(jsonb_array_length(pr.options), 0)
		FROM media m
		LEFT JOIN LATERAL (
			SELECT status, options FROM processing_requests
			WHERE media_id = m.id ORDER BY created_at DESC LIMIT 1
		) pr ON true
		WHERE m.owner_id = $1 AND m.id = ANY($2) AND m.status != 'deletion_pending'
	`, ownerID, ids)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []media.Progress
	for rows.Next() {
		var p media.Progress
		var status, processingStatus string
		if err := rows.Scan(&p.MediaID, &status, &p.UpdatedAt, &p.Version, &processingStatus, &p.TotalSteps); err != nil {
			return nil, err
		}
		p.Status = media.Status(status)
		p.ProcessingStatus = media.ProcessingStatus(processingStatus)
		if p.Status == media.StatusCompleted {
			p.CompletedSteps = p.TotalSteps
		}
		out = append(out, p)
	}
	return out, rows.Err()
}

func encodeCursor(m media.Media) string {
	b, _ := json.Marshal(cursorPayload{CreatedAt: m.CreatedAt, ID: m.ID})
	return base64.URLEncoding.EncodeToString(b)
}

func decodeCursor(cursor string) (cursorPayload, error) {
	var p cursorPayload
	b, err := base64.URLEncoding.DecodeString(cursor)
	if err != nil {
		return cursorPayload{}, err
	}
	if err := json.Unmarshal(b, &p); err != nil {
		return cursorPayload{}, err
	}
	return p, nil
}

func scanMedia(row rowScanner) (media.Media, error) {
	var m media.Media
	var mediaType, status string
	err := row.Scan(&m.ID, &m.OwnerID, &m.Title, &mediaType, &m.ObjectKey, &m.MimeType,
		&m.SizeBytes, &m.DurationMs, &m.Checksum, &status, &m.CreatedAt, &m.UpdatedAt, &m.Description, &m.TrashedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return media.Media{}, media.ErrNotFound
		}
		return media.Media{}, err
	}
	m.MediaType = media.Type(mediaType)
	m.Status = media.Status(status)
	return m, nil
}
