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

	"github.com/nolannguyen1212/media-notes/services/media/internal/media"
)

const mediaColumns = `id, owner_id, title, media_type, object_key, mime_type, COALESCE(size_bytes, 0), COALESCE(duration_ms, 0), COALESCE(checksum, ''), status, created_at, updated_at`

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

func (r *MediaRepository) List(ctx context.Context, ownerID uuid.UUID, cursor string, pageSize int) (media.Page, error) {
	var (
		rows pgx.Rows
		err  error
	)
	if cursor == "" {
		rows, err = r.pool.Query(ctx, `
			SELECT `+mediaColumns+`
			FROM media
			WHERE owner_id = $1 AND status != 'deletion_pending'
			ORDER BY created_at DESC, id DESC
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
			WHERE owner_id = $1 AND status != 'deletion_pending'
			  AND (created_at, id) < ($2, $3)
			ORDER BY created_at DESC, id DESC
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
		page.NextCursor = encodeCursor(items[pageSize-1])
	}
	return page, nil
}

func (r *MediaRepository) ApplyWorkflowStatus(ctx context.Context, mediaID uuid.UUID, status media.Status) error {
	_, err := r.pool.Exec(ctx, `
		UPDATE media SET status = $2, updated_at = now()
		WHERE id = $1 AND status != 'deletion_pending'
	`, mediaID, string(status))
	return err
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
		&m.SizeBytes, &m.DurationMs, &m.Checksum, &status, &m.CreatedAt, &m.UpdatedAt)
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
