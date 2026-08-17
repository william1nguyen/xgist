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

	"github.com/nolannguyen1212/media-notes/services/content/internal/audiojob"
	"github.com/nolannguyen1212/media-notes/services/content/internal/events"
)

// AudioJobRepository implements audiojob.Repository over PostgreSQL.
type AudioJobRepository struct {
	pool *pgxpool.Pool
}

// NewAudioJobRepository returns an AudioJobRepository.
func NewAudioJobRepository(pool *pgxpool.Pool) *AudioJobRepository {
	return &AudioJobRepository{pool: pool}
}

const audioJobColumns = `id, user_id, kind, status, input_text, COALESCE(output_text, ''), COALESCE(voice, ''), COALESCE(object_key, ''), COALESCE(mime_type, ''), COALESCE(duration_ms, 0), COALESCE(error_code, ''), created_at, updated_at`

func (r *AudioJobRepository) RequestScriptDraft(ctx context.Context, userID uuid.UUID, idempotencyKey, description string) (audiojob.Job, error) {
	return r.create(ctx, userID, audiojob.KindScript, idempotencyKey, description, "")
}

func (r *AudioJobRepository) RequestStandaloneAudio(ctx context.Context, userID uuid.UUID, idempotencyKey, text, voice string) (audiojob.Job, error) {
	return r.create(ctx, userID, audiojob.KindAudio, idempotencyKey, text, voice)
}

func (r *AudioJobRepository) create(ctx context.Context, userID uuid.UUID, kind audiojob.Kind, idempotencyKey, inputText, voice string) (audiojob.Job, error) {
	var result audiojob.Job
	txErr := withTx(ctx, r.pool, func(ctx context.Context, tx pgx.Tx) error {
		if existing, err := findAudioJobByIdempotencyKey(ctx, tx, idempotencyKey); err == nil {
			result = existing
			return nil
		} else if !errors.Is(err, audiojob.ErrNotFound) {
			return err
		}

		id := uuid.New()
		row := tx.QueryRow(ctx, `
			INSERT INTO standalone_audio_jobs (id, user_id, kind, status, input_text, voice, idempotency_key)
			VALUES ($1, $2, $3, 'generating', $4, $5, $6)
			RETURNING `+audioJobColumns,
			id, userID, string(kind), inputText, nullIfEmpty(voice), idempotencyKey)
		job, err := scanAudioJob(row)
		if err != nil {
			return err
		}
		result = job

		payload, err := json.Marshal(map[string]any{
			"event_id":    uuid.New(),
			"job_id":      job.ID,
			"kind":        string(kind),
			"input_text":  inputText,
			"voice":       voice,
		})
		if err != nil {
			return err
		}
		return insertOutboxEvent(ctx, tx, events.AudioJobRequestedTopic, job.ID.String(), payload)
	})
	return result, txErr
}

func (r *AudioJobRepository) CompleteScriptDraft(ctx context.Context, jobID uuid.UUID, scriptText string) (audiojob.Job, error) {
	row := r.pool.QueryRow(ctx, `
		UPDATE standalone_audio_jobs SET status = 'completed', output_text = $2, updated_at = now()
		WHERE id = $1 AND status = 'generating'
		RETURNING `+audioJobColumns, jobID, scriptText)
	job, err := scanAudioJob(row)
	if errors.Is(err, audiojob.ErrNotFound) {
		// Either the job doesn't exist, or it already left 'generating'
		// (a redelivered worker callback) — return the current row so
		// the caller can log/ignore without treating it as an error.
		if existing, findErr := r.FindByID(ctx, jobID); findErr == nil {
			return existing, audiojob.ErrNotGenerating
		}
	}
	return job, err
}

func (r *AudioJobRepository) CompleteStandaloneAudio(ctx context.Context, jobID uuid.UUID, objectKey, mimeType string, durationMs int64, voice string) (audiojob.Job, error) {
	row := r.pool.QueryRow(ctx, `
		UPDATE standalone_audio_jobs
		SET status = 'completed', object_key = $2, mime_type = $3, duration_ms = $4, voice = $5, updated_at = now()
		WHERE id = $1 AND status = 'generating'
		RETURNING `+audioJobColumns, jobID, objectKey, mimeType, durationMs, nullIfEmpty(voice))
	job, err := scanAudioJob(row)
	if errors.Is(err, audiojob.ErrNotFound) {
		if existing, findErr := r.FindByID(ctx, jobID); findErr == nil {
			return existing, audiojob.ErrNotGenerating
		}
	}
	return job, err
}

func (r *AudioJobRepository) FailJob(ctx context.Context, jobID uuid.UUID, errorCode string) (audiojob.Job, error) {
	row := r.pool.QueryRow(ctx, `
		UPDATE standalone_audio_jobs SET status = 'failed', error_code = $2, updated_at = now()
		WHERE id = $1 AND status = 'generating'
		RETURNING `+audioJobColumns, jobID, errorCode)
	job, err := scanAudioJob(row)
	if errors.Is(err, audiojob.ErrNotFound) {
		if existing, findErr := r.FindByID(ctx, jobID); findErr == nil {
			return existing, audiojob.ErrNotGenerating
		}
	}
	return job, err
}

func (r *AudioJobRepository) FindByID(ctx context.Context, jobID uuid.UUID) (audiojob.Job, error) {
	row := r.pool.QueryRow(ctx, `SELECT `+audioJobColumns+` FROM standalone_audio_jobs WHERE id = $1`, jobID)
	return scanAudioJob(row)
}

func findAudioJobByIdempotencyKey(ctx context.Context, tx pgx.Tx, idempotencyKey string) (audiojob.Job, error) {
	row := tx.QueryRow(ctx, `SELECT `+audioJobColumns+` FROM standalone_audio_jobs WHERE idempotency_key = $1`, idempotencyKey)
	return scanAudioJob(row)
}

type audioJobCursor struct {
	CreatedAt time.Time `json:"created_at"`
	ID        uuid.UUID `json:"id"`
}

func (r *AudioJobRepository) List(ctx context.Context, userID uuid.UUID, kind audiojob.Kind, cursor string, pageSize int) (audiojob.Page, error) {
	var (
		rows pgx.Rows
		err  error
	)
	if cursor == "" {
		rows, err = r.pool.Query(ctx, `
			SELECT `+audioJobColumns+`
			FROM standalone_audio_jobs
			WHERE user_id = $1 AND kind = $2
			ORDER BY created_at DESC, id DESC
			LIMIT $3
		`, userID, string(kind), pageSize+1)
	} else {
		var c audioJobCursor
		b, decErr := base64.URLEncoding.DecodeString(cursor)
		if decErr != nil {
			return audiojob.Page{}, decErr
		}
		if decErr := json.Unmarshal(b, &c); decErr != nil {
			return audiojob.Page{}, decErr
		}
		rows, err = r.pool.Query(ctx, `
			SELECT `+audioJobColumns+`
			FROM standalone_audio_jobs
			WHERE user_id = $1 AND kind = $2 AND (created_at, id) < ($3, $4)
			ORDER BY created_at DESC, id DESC
			LIMIT $5
		`, userID, string(kind), c.CreatedAt, c.ID, pageSize+1)
	}
	if err != nil {
		return audiojob.Page{}, err
	}
	defer rows.Close()

	var items []audiojob.Job
	for rows.Next() {
		job, err := scanAudioJob(rows)
		if err != nil {
			return audiojob.Page{}, err
		}
		items = append(items, job)
	}
	if err := rows.Err(); err != nil {
		return audiojob.Page{}, err
	}

	page := audiojob.Page{Items: items}
	if len(items) > pageSize {
		page.Items = items[:pageSize]
		last := page.Items[pageSize-1]
		b, _ := json.Marshal(audioJobCursor{CreatedAt: last.CreatedAt, ID: last.ID})
		page.NextCursor = base64.URLEncoding.EncodeToString(b)
	}
	return page, nil
}

func scanAudioJob(row rowScanner) (audiojob.Job, error) {
	var j audiojob.Job
	var kind, status string
	err := row.Scan(
		&j.ID, &j.UserID, &kind, &status, &j.InputText, &j.OutputText, &j.Voice,
		&j.ObjectKey, &j.MimeType, &j.DurationMs, &j.ErrorCode, &j.CreatedAt, &j.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return audiojob.Job{}, audiojob.ErrNotFound
		}
		return audiojob.Job{}, err
	}
	j.Kind = audiojob.Kind(kind)
	j.Status = audiojob.Status(status)
	return j, nil
}
