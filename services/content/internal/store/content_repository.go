package store

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/nolannguyen1212/media-notes/services/content/internal/content"
	"github.com/nolannguyen1212/media-notes/services/content/internal/events"
)

// ContentRepository implements content.Repository over PostgreSQL.
type ContentRepository struct {
	pool *pgxpool.Pool
}

// NewContentRepository returns a ContentRepository.
func NewContentRepository(pool *pgxpool.Pool) *ContentRepository {
	return &ContentRepository{pool: pool}
}

func (r *ContentRepository) StoreTranscript(ctx context.Context, cmd content.StoreTranscriptCommand) (content.Version, error) {
	var result content.Version
	txErr := withTx(ctx, r.pool, func(ctx context.Context, tx pgx.Tx) error {
		contentID, err := getOrCreateContent(ctx, tx, cmd.MediaID, cmd.WorkflowID)
		if err != nil {
			return err
		}

		applied, err := checkStepAttempt(ctx, tx, contentID, cmd.WorkflowID, content.StepTranscript, cmd.Attempt, cmd.IdempotencyKey)
		if err != nil {
			return err
		}
		if !applied {
			result, err = currentVersion(ctx, tx, cmd.MediaID)
			return err
		}

		if _, err := tx.Exec(ctx, `
			UPDATE contents SET language = $2, transcript_text = $3 WHERE id = $1
		`, contentID, nullIfEmpty(cmd.Language), nullIfEmpty(cmd.Text)); err != nil {
			return err
		}

		// Cascades to any summary_citations referencing the replaced
		// segments (ON DELETE CASCADE), which is correct: a
		// re-transcription invalidates citations against the old
		// segment set.
		if _, err := tx.Exec(ctx, `DELETE FROM transcript_segments WHERE content_id = $1`, contentID); err != nil {
			return err
		}
		for _, seg := range cmd.Segments {
			if _, err := tx.Exec(ctx, `
				INSERT INTO transcript_segments (id, content_id, segment_index, start_ms, end_ms, speaker, text)
				VALUES ($1, $2, $3, $4, $5, $6, $7)
			`, uuid.New(), contentID, seg.SegmentIndex, seg.StartMs, seg.EndMs, nullIfEmpty(seg.Speaker), seg.Text); err != nil {
				return err
			}
		}

		version, updatedAt, err := bumpVersion(ctx, tx, contentID)
		if err != nil {
			return err
		}
		if err := publishStepCompleted(ctx, tx, cmd.MediaID, cmd.WorkflowID, content.StepTranscript, "", version, cmd.Attempt); err != nil {
			return err
		}
		result = content.Version{MediaID: cmd.MediaID, Version: version, UpdatedAt: updatedAt}
		return nil
	})
	return result, txErr
}

func (r *ContentRepository) FindTranscript(ctx context.Context, mediaID uuid.UUID) (content.Transcript, error) {
	return findTranscript(ctx, r.pool, mediaID)
}

func findTranscript(ctx context.Context, q querier, mediaID uuid.UUID) (content.Transcript, error) {
	var contentID uuid.UUID
	var language, text *string
	var version int
	err := q.QueryRow(ctx, `
		SELECT id, language, transcript_text, version FROM contents WHERE media_id = $1
	`, mediaID).Scan(&contentID, &language, &text, &version)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return content.Transcript{}, content.ErrNotFound
		}
		return content.Transcript{}, err
	}

	t := content.Transcript{MediaID: mediaID, Version: version}
	if language != nil {
		t.Language = *language
	}
	if text != nil {
		t.Text = *text
	}

	rows, err := q.Query(ctx, `
		SELECT segment_index, start_ms, end_ms, speaker, text
		FROM transcript_segments WHERE content_id = $1 ORDER BY segment_index
	`, contentID)
	if err != nil {
		return content.Transcript{}, err
	}
	defer rows.Close()
	for rows.Next() {
		var seg content.TranscriptSegment
		var speaker *string
		if err := rows.Scan(&seg.SegmentIndex, &seg.StartMs, &seg.EndMs, &speaker, &seg.Text); err != nil {
			return content.Transcript{}, err
		}
		if speaker != nil {
			seg.Speaker = *speaker
		}
		t.Segments = append(t.Segments, seg)
	}
	return t, rows.Err()
}

func (r *ContentRepository) StoreSummary(ctx context.Context, cmd content.StoreSummaryCommand) (content.Version, error) {
	var result content.Version
	step := content.StepKey(content.StepSummary, cmd.SummaryType)
	txErr := withTx(ctx, r.pool, func(ctx context.Context, tx pgx.Tx) error {
		contentID, err := getOrCreateContent(ctx, tx, cmd.MediaID, cmd.WorkflowID)
		if err != nil {
			return err
		}

		applied, err := checkStepAttempt(ctx, tx, contentID, cmd.WorkflowID, step, cmd.Attempt, cmd.IdempotencyKey)
		if err != nil {
			return err
		}
		if !applied {
			result, err = currentVersion(ctx, tx, cmd.MediaID)
			return err
		}

		var summaryID uuid.UUID
		if err := tx.QueryRow(ctx, `
			INSERT INTO summaries (id, content_id, summary_type, text, model, prompt_version)
			VALUES ($1, $2, $3, $4, $5, $6)
			ON CONFLICT (content_id, summary_type)
			DO UPDATE SET text = EXCLUDED.text, model = EXCLUDED.model, prompt_version = EXCLUDED.prompt_version
			RETURNING id
		`, uuid.New(), contentID, cmd.SummaryType, cmd.Text, nullIfEmpty(cmd.Model), nullIfEmpty(cmd.PromptVersion)).Scan(&summaryID); err != nil {
			return err
		}

		if _, err := tx.Exec(ctx, `DELETE FROM summary_sentences WHERE summary_id = $1`, summaryID); err != nil {
			return err
		}
		for _, sentence := range cmd.Sentences {
			var sentenceID uuid.UUID
			if err := tx.QueryRow(ctx, `
				INSERT INTO summary_sentences (id, summary_id, sentence_index, text)
				VALUES ($1, $2, $3, $4) RETURNING id
			`, uuid.New(), summaryID, sentence.SentenceIndex, sentence.Text).Scan(&sentenceID); err != nil {
				return err
			}
			for _, segIndex := range sentence.CitedSegmentIndexes {
				var segmentID uuid.UUID
				err := tx.QueryRow(ctx, `
					SELECT id FROM transcript_segments WHERE content_id = $1 AND segment_index = $2
				`, contentID, segIndex).Scan(&segmentID)
				if errors.Is(err, pgx.ErrNoRows) {
					return content.ErrUnknownSegment
				}
				if err != nil {
					return err
				}
				if _, err := tx.Exec(ctx, `
					INSERT INTO summary_citations (summary_sentence_id, transcript_segment_id) VALUES ($1, $2)
				`, sentenceID, segmentID); err != nil {
					return err
				}
			}
		}

		version, updatedAt, err := bumpVersion(ctx, tx, contentID)
		if err != nil {
			return err
		}
		if err := publishStepCompleted(ctx, tx, cmd.MediaID, cmd.WorkflowID, content.StepSummary, cmd.SummaryType, version, cmd.Attempt); err != nil {
			return err
		}
		result = content.Version{MediaID: cmd.MediaID, Version: version, UpdatedAt: updatedAt}
		return nil
	})
	return result, txErr
}

func (r *ContentRepository) StoreKeywords(ctx context.Context, cmd content.StoreKeywordsCommand) (content.Version, error) {
	var result content.Version
	txErr := withTx(ctx, r.pool, func(ctx context.Context, tx pgx.Tx) error {
		contentID, err := getOrCreateContent(ctx, tx, cmd.MediaID, cmd.WorkflowID)
		if err != nil {
			return err
		}

		applied, err := checkStepAttempt(ctx, tx, contentID, cmd.WorkflowID, content.StepKeywords, cmd.Attempt, cmd.IdempotencyKey)
		if err != nil {
			return err
		}
		if !applied {
			result, err = currentVersion(ctx, tx, cmd.MediaID)
			return err
		}

		if _, err := tx.Exec(ctx, `DELETE FROM keywords WHERE content_id = $1`, contentID); err != nil {
			return err
		}
		for _, kw := range cmd.Keywords {
			if _, err := tx.Exec(ctx, `
				INSERT INTO keywords (id, content_id, keyword, score, position) VALUES ($1, $2, $3, $4, $5)
			`, uuid.New(), contentID, kw.Keyword, kw.Score, kw.Position); err != nil {
				return err
			}
		}

		version, updatedAt, err := bumpVersion(ctx, tx, contentID)
		if err != nil {
			return err
		}
		if err := publishStepCompleted(ctx, tx, cmd.MediaID, cmd.WorkflowID, content.StepKeywords, "", version, cmd.Attempt); err != nil {
			return err
		}
		result = content.Version{MediaID: cmd.MediaID, Version: version, UpdatedAt: updatedAt}
		return nil
	})
	return result, txErr
}

func (r *ContentRepository) StoreKeypoints(ctx context.Context, cmd content.StoreKeypointsCommand) (content.Version, error) {
	var result content.Version
	txErr := withTx(ctx, r.pool, func(ctx context.Context, tx pgx.Tx) error {
		contentID, err := getOrCreateContent(ctx, tx, cmd.MediaID, cmd.WorkflowID)
		if err != nil {
			return err
		}

		applied, err := checkStepAttempt(ctx, tx, contentID, cmd.WorkflowID, content.StepKeypoints, cmd.Attempt, cmd.IdempotencyKey)
		if err != nil {
			return err
		}
		if !applied {
			result, err = currentVersion(ctx, tx, cmd.MediaID)
			return err
		}

		if _, err := tx.Exec(ctx, `DELETE FROM keypoints WHERE content_id = $1`, contentID); err != nil {
			return err
		}
		for _, kp := range cmd.Keypoints {
			if _, err := tx.Exec(ctx, `
				INSERT INTO keypoints (id, content_id, point_index, text, start_segment, end_segment)
				VALUES ($1, $2, $3, $4, $5, $6)
			`, uuid.New(), contentID, kp.PointIndex, kp.Text, kp.StartSegment, kp.EndSegment); err != nil {
				return err
			}
		}

		version, updatedAt, err := bumpVersion(ctx, tx, contentID)
		if err != nil {
			return err
		}
		if err := publishStepCompleted(ctx, tx, cmd.MediaID, cmd.WorkflowID, content.StepKeypoints, "", version, cmd.Attempt); err != nil {
			return err
		}
		result = content.Version{MediaID: cmd.MediaID, Version: version, UpdatedAt: updatedAt}
		return nil
	})
	return result, txErr
}

func (r *ContentRepository) StoreNotes(ctx context.Context, cmd content.StoreNotesCommand) (content.Version, error) {
	var result content.Version
	step := content.StepKey(content.StepNotes, cmd.Format)
	txErr := withTx(ctx, r.pool, func(ctx context.Context, tx pgx.Tx) error {
		contentID, err := getOrCreateContent(ctx, tx, cmd.MediaID, cmd.WorkflowID)
		if err != nil {
			return err
		}

		applied, err := checkStepAttempt(ctx, tx, contentID, cmd.WorkflowID, step, cmd.Attempt, cmd.IdempotencyKey)
		if err != nil {
			return err
		}
		if !applied {
			result, err = currentVersion(ctx, tx, cmd.MediaID)
			return err
		}

		if _, err := tx.Exec(ctx, `
			INSERT INTO notes (id, content_id, format, body)
			VALUES ($1, $2, $3, $4)
			ON CONFLICT (content_id, format) DO UPDATE SET body = EXCLUDED.body
		`, uuid.New(), contentID, cmd.Format, cmd.Body); err != nil {
			return err
		}

		version, updatedAt, err := bumpVersion(ctx, tx, contentID)
		if err != nil {
			return err
		}
		if err := publishStepCompleted(ctx, tx, cmd.MediaID, cmd.WorkflowID, content.StepNotes, cmd.Format, version, cmd.Attempt); err != nil {
			return err
		}
		result = content.Version{MediaID: cmd.MediaID, Version: version, UpdatedAt: updatedAt}
		return nil
	})
	return result, txErr
}

func (r *ContentRepository) StoreSummaryAudio(ctx context.Context, cmd content.StoreSummaryAudioCommand) (content.Version, error) {
	var result content.Version
	step := content.StepKey(content.StepSummaryAudio, cmd.SummaryType)
	txErr := withTx(ctx, r.pool, func(ctx context.Context, tx pgx.Tx) error {
		contentID, err := getOrCreateContent(ctx, tx, cmd.MediaID, cmd.WorkflowID)
		if err != nil {
			return err
		}

		applied, err := checkStepAttempt(ctx, tx, contentID, cmd.WorkflowID, step, cmd.Attempt, cmd.IdempotencyKey)
		if err != nil {
			return err
		}
		if !applied {
			result, err = currentVersion(ctx, tx, cmd.MediaID)
			return err
		}

		var summaryID *uuid.UUID
		var id uuid.UUID
		if err := tx.QueryRow(ctx, `
			SELECT id FROM summaries WHERE content_id = $1 AND summary_type = $2
		`, contentID, cmd.SummaryType).Scan(&id); err == nil {
			summaryID = &id
		} else if !errors.Is(err, pgx.ErrNoRows) {
			return err
		}

		if _, err := tx.Exec(ctx, `
			INSERT INTO audio_summaries (id, content_id, summary_id, summary_type, object_key, mime_type, duration_ms, voice, status)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'ready')
			ON CONFLICT (content_id, summary_type)
			DO UPDATE SET summary_id = EXCLUDED.summary_id, object_key = EXCLUDED.object_key,
				mime_type = EXCLUDED.mime_type, duration_ms = EXCLUDED.duration_ms,
				voice = EXCLUDED.voice, status = 'ready'
		`, uuid.New(), contentID, summaryID, cmd.SummaryType, cmd.ObjectKey, cmd.MimeType, cmd.DurationMs, nullIfEmpty(cmd.Voice)); err != nil {
			return err
		}

		version, updatedAt, err := bumpVersion(ctx, tx, contentID)
		if err != nil {
			return err
		}
		if err := publishStepCompleted(ctx, tx, cmd.MediaID, cmd.WorkflowID, content.StepSummaryAudio, cmd.SummaryType, version, cmd.Attempt); err != nil {
			return err
		}
		result = content.Version{MediaID: cmd.MediaID, Version: version, UpdatedAt: updatedAt}
		return nil
	})
	return result, txErr
}

func (r *ContentRepository) FindContent(ctx context.Context, mediaID uuid.UUID) (content.Content, error) {
	transcript, err := findTranscript(ctx, r.pool, mediaID)
	if err != nil {
		return content.Content{}, err
	}

	var contentID uuid.UUID
	if err := r.pool.QueryRow(ctx, `SELECT id FROM contents WHERE media_id = $1`, mediaID).Scan(&contentID); err != nil {
		return content.Content{}, err
	}

	out := content.Content{MediaID: mediaID, Transcript: &transcript, Version: transcript.Version}

	summaryRows, err := r.pool.Query(ctx, `
		SELECT id, summary_type, text, model, prompt_version, created_at
		FROM summaries WHERE content_id = $1 ORDER BY summary_type
	`, contentID)
	if err != nil {
		return content.Content{}, err
	}
	type summaryRow struct {
		id  uuid.UUID
		sum content.Summary
	}
	var summaryRowsOut []summaryRow
	for summaryRows.Next() {
		var sr summaryRow
		var model, promptVersion *string
		if err := summaryRows.Scan(&sr.id, &sr.sum.SummaryType, &sr.sum.Text, &model, &promptVersion, &sr.sum.CreatedAt); err != nil {
			summaryRows.Close()
			return content.Content{}, err
		}
		if model != nil {
			sr.sum.Model = *model
		}
		if promptVersion != nil {
			sr.sum.PromptVersion = *promptVersion
		}
		summaryRowsOut = append(summaryRowsOut, sr)
	}
	summaryRows.Close()
	if err := summaryRows.Err(); err != nil {
		return content.Content{}, err
	}
	for _, sr := range summaryRowsOut {
		sentences, err := summarySentencesForSummary(ctx, r.pool, sr.id)
		if err != nil {
			return content.Content{}, err
		}
		sr.sum.Sentences = sentences
		out.Summaries = append(out.Summaries, sr.sum)
	}

	keywordRows, err := r.pool.Query(ctx, `
		SELECT keyword, score, position FROM keywords WHERE content_id = $1 ORDER BY position
	`, contentID)
	if err != nil {
		return content.Content{}, err
	}
	for keywordRows.Next() {
		var kw content.Keyword
		var score *float64
		if err := keywordRows.Scan(&kw.Keyword, &score, &kw.Position); err != nil {
			keywordRows.Close()
			return content.Content{}, err
		}
		if score != nil {
			kw.Score = *score
		}
		out.Keywords = append(out.Keywords, kw)
	}
	keywordRows.Close()
	if err := keywordRows.Err(); err != nil {
		return content.Content{}, err
	}

	keypointRows, err := r.pool.Query(ctx, `
		SELECT point_index, text, start_segment, end_segment
		FROM keypoints WHERE content_id = $1 ORDER BY point_index
	`, contentID)
	if err != nil {
		return content.Content{}, err
	}
	for keypointRows.Next() {
		var kp content.Keypoint
		var start, end *int
		if err := keypointRows.Scan(&kp.PointIndex, &kp.Text, &start, &end); err != nil {
			keypointRows.Close()
			return content.Content{}, err
		}
		if start != nil {
			kp.StartSegment = *start
		}
		if end != nil {
			kp.EndSegment = *end
		}
		out.Keypoints = append(out.Keypoints, kp)
	}
	keypointRows.Close()
	if err := keypointRows.Err(); err != nil {
		return content.Content{}, err
	}

	noteRows, err := r.pool.Query(ctx, `
		SELECT format, body, created_at FROM notes WHERE content_id = $1 ORDER BY format
	`, contentID)
	if err != nil {
		return content.Content{}, err
	}
	for noteRows.Next() {
		var n content.Note
		if err := noteRows.Scan(&n.Format, &n.Body, &n.CreatedAt); err != nil {
			noteRows.Close()
			return content.Content{}, err
		}
		out.Notes = append(out.Notes, n)
	}
	noteRows.Close()
	if err := noteRows.Err(); err != nil {
		return content.Content{}, err
	}

	audioRows, err := r.pool.Query(ctx, `
		SELECT summary_type, object_key, mime_type, duration_ms, voice, status
		FROM audio_summaries WHERE content_id = $1 ORDER BY summary_type
	`, contentID)
	if err != nil {
		return content.Content{}, err
	}
	for audioRows.Next() {
		var a content.SummaryAudio
		var duration *int64
		var voice *string
		var status string
		if err := audioRows.Scan(&a.SummaryType, &a.ObjectKey, &a.MimeType, &duration, &voice, &status); err != nil {
			audioRows.Close()
			return content.Content{}, err
		}
		if duration != nil {
			a.DurationMs = *duration
		}
		if voice != nil {
			a.Voice = *voice
		}
		a.Status = content.AudioStatus(status)
		out.SummaryAudios = append(out.SummaryAudios, a)
	}
	audioRows.Close()
	if err := audioRows.Err(); err != nil {
		return content.Content{}, err
	}

	return out, nil
}

func summarySentencesForSummary(ctx context.Context, q querier, summaryID uuid.UUID) ([]content.SummarySentence, error) {
	rows, err := q.Query(ctx, `
		SELECT ss.sentence_index, ss.text, ts.segment_index
		FROM summary_sentences ss
		LEFT JOIN summary_citations sc ON sc.summary_sentence_id = ss.id
		LEFT JOIN transcript_segments ts ON ts.id = sc.transcript_segment_id
		WHERE ss.summary_id = $1
		ORDER BY ss.sentence_index, ts.segment_index
	`, summaryID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	bySentence := map[int]*content.SummarySentence{}
	var order []int
	for rows.Next() {
		var index int
		var text string
		var segIndex *int
		if err := rows.Scan(&index, &text, &segIndex); err != nil {
			return nil, err
		}
		sentence, ok := bySentence[index]
		if !ok {
			sentence = &content.SummarySentence{SentenceIndex: index, Text: text}
			bySentence[index] = sentence
			order = append(order, index)
		}
		if segIndex != nil {
			sentence.CitedSegmentIndexes = append(sentence.CitedSegmentIndexes, *segIndex)
		}
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	sentences := make([]content.SummarySentence, 0, len(order))
	for _, idx := range order {
		sentences = append(sentences, *bySentence[idx])
	}
	return sentences, nil
}

func getOrCreateContent(ctx context.Context, tx pgx.Tx, mediaID, workflowID uuid.UUID) (uuid.UUID, error) {
	var id uuid.UUID
	err := tx.QueryRow(ctx, `SELECT id FROM contents WHERE media_id = $1 FOR UPDATE`, mediaID).Scan(&id)
	if err == nil {
		return id, nil
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return uuid.Nil, err
	}
	id = uuid.New()
	if _, err := tx.Exec(ctx, `
		INSERT INTO contents (id, media_id, workflow_id) VALUES ($1, $2, $3)
	`, id, mediaID, workflowID); err != nil {
		return uuid.Nil, err
	}
	return id, nil
}

// checkStepAttempt reports whether the caller's write should be applied.
// It returns (true, nil) for a first-time or newer-attempt call — after
// recording the attempt — (false, nil) when idempotencyKey exactly matches
// the last recorded call for this step (a pure replay, safe to skip), and
// (false, ErrStaleAttempt) when attempt is older than the last recorded
// attempt.
//
// Attempt monotonicity is scoped to (contentID, step, workflowID), not just
// (contentID, step): a regenerate request starts a brand new workflow whose
// own step attempts count from 1 again, which would otherwise compare as
// stale against a previous, unrelated workflow's higher attempt count for
// the same step (for example if that step needed a retry the first time).
func checkStepAttempt(ctx context.Context, tx pgx.Tx, contentID, workflowID uuid.UUID, step string, attempt int, idempotencyKey string) (bool, error) {
	var existingAttempt int
	var existingKey string
	err := tx.QueryRow(ctx, `
		SELECT attempt, idempotency_key FROM content_step_attempts
		WHERE content_id = $1 AND step = $2 AND workflow_id = $3 FOR UPDATE
	`, contentID, step, workflowID).Scan(&existingAttempt, &existingKey)
	if errors.Is(err, pgx.ErrNoRows) {
		if _, err := tx.Exec(ctx, `
			INSERT INTO content_step_attempts (content_id, step, workflow_id, attempt, idempotency_key) VALUES ($1, $2, $3, $4, $5)
		`, contentID, step, workflowID, attempt, idempotencyKey); err != nil {
			return false, err
		}
		return true, nil
	}
	if err != nil {
		return false, err
	}
	if idempotencyKey == existingKey {
		return false, nil
	}
	if attempt < existingAttempt {
		return false, content.ErrStaleAttempt
	}
	if _, err := tx.Exec(ctx, `
		UPDATE content_step_attempts SET attempt = $4, idempotency_key = $5, updated_at = now()
		WHERE content_id = $1 AND step = $2 AND workflow_id = $3
	`, contentID, step, workflowID, attempt, idempotencyKey); err != nil {
		return false, err
	}
	return true, nil
}

func bumpVersion(ctx context.Context, tx pgx.Tx, contentID uuid.UUID) (int, time.Time, error) {
	var version int
	var updatedAt time.Time
	err := tx.QueryRow(ctx, `
		UPDATE contents SET version = version + 1, updated_at = now() WHERE id = $1
		RETURNING version, updated_at
	`, contentID).Scan(&version, &updatedAt)
	return version, updatedAt, err
}

func currentVersion(ctx context.Context, q querier, mediaID uuid.UUID) (content.Version, error) {
	var v content.Version
	v.MediaID = mediaID
	err := q.QueryRow(ctx, `SELECT version, updated_at FROM contents WHERE media_id = $1`, mediaID).Scan(&v.Version, &v.UpdatedAt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return content.Version{}, content.ErrNotFound
		}
		return content.Version{}, err
	}
	return v, nil
}

// publishStepCompleted writes the mn.processing.step.completed.v1 outbox
// event as part of the caller's transaction. Events carry IDs, step,
// output kind, durable version, and attempt — never generated text, per
// docs/services/content.md.
func publishStepCompleted(ctx context.Context, tx pgx.Tx, mediaID, workflowID uuid.UUID, step, subtype string, version, attempt int) error {
	payload, err := json.Marshal(map[string]any{
		"event_id":    uuid.New(),
		"media_id":    mediaID,
		"workflow_id": workflowID,
		"step":        step,
		"subtype":     subtype,
		"version":     version,
		"attempt":     attempt,
	})
	if err != nil {
		return err
	}
	return insertOutboxEvent(ctx, tx, events.StepCompletedTopic, mediaID.String(), payload)
}

func nullIfEmpty(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}
