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

	"github.com/nolannguyen1212/media-notes/services/conductor/internal/events"
	"github.com/nolannguyen1212/media-notes/services/conductor/internal/retry"
	"github.com/nolannguyen1212/media-notes/services/conductor/internal/timeout"
	"github.com/nolannguyen1212/media-notes/services/conductor/internal/workflow"
)

// WorkflowRepository implements workflow.Repository over PostgreSQL.
type WorkflowRepository struct {
	pool *pgxpool.Pool
}

// NewWorkflowRepository returns a WorkflowRepository.
func NewWorkflowRepository(pool *pgxpool.Pool) *WorkflowRepository {
	return &WorkflowRepository{pool: pool}
}

var _ workflow.Repository = (*WorkflowRepository)(nil)

const workflowColumns = `id, media_id, request_id, user_id, state, quote_id, version, started_at, completed_at, audio_voice`

type stepRow struct {
	ID             uuid.UUID
	WorkflowID     uuid.UUID
	StepType       string
	Required       bool
	State          workflow.StepState
	CurrentAttempt int
}

// --- CreateWorkflow ---

func (r *WorkflowRepository) CreateWorkflow(ctx context.Context, in workflow.NewWorkflow) (workflow.Workflow, error) {
	if existing, err := findWorkflowByRequestID(ctx, r.pool, in.RequestID); err == nil {
		return existing, nil
	} else if !errors.Is(err, workflow.ErrNotFound) {
		return workflow.Workflow{}, err
	}

	var result workflow.Workflow
	txErr := withTx(ctx, r.pool, func(ctx context.Context, tx pgx.Tx) error {
		row := tx.QueryRow(ctx, `
			INSERT INTO workflows (id, media_id, request_id, user_id, state, quote_id, version, started_at, audio_voice)
			VALUES ($1, $2, $3, $4, $5, $6, 0, now(), $7)
			ON CONFLICT (media_id) DO NOTHING
			RETURNING `+workflowColumns,
			uuid.New(), in.MediaID, in.RequestID, in.UserID, string(workflow.StateReservingCredit), in.QuoteID, in.AudioVoice)
		w, err := scanWorkflow(row)
		if err != nil {
			if errors.Is(err, workflow.ErrNotFound) {
				// ON CONFLICT DO NOTHING: media_id already has a workflow,
				// created by a redelivery of this same command under a
				// duplicate request_id our earlier lookup missed (or a
				// concurrent delivery). Return the existing row rather
				// than creating steps/dependencies/a second quote a
				// second time.
				existing, findErr := findWorkflowByMediaID(ctx, tx, in.MediaID)
				if findErr != nil {
					return findErr
				}
				result = existing
				return nil
			}
			return err
		}
		result = w

		stepIDs := make(map[string]uuid.UUID, len(in.Steps))
		for _, plan := range in.Steps {
			stepID := uuid.New()
			if _, err := tx.Exec(ctx, `
				INSERT INTO workflow_steps (id, workflow_id, step_type, required, state, current_attempt)
				VALUES ($1, $2, $3, $4, $5, 0)
			`, stepID, w.ID, plan.StepType, plan.Required, string(workflow.StepStatePending)); err != nil {
				return err
			}
			stepIDs[plan.StepType] = stepID
		}
		for _, plan := range in.Steps {
			for _, dep := range plan.DependsOn {
				depID, ok := stepIDs[dep]
				if !ok {
					continue
				}
				if _, err := tx.Exec(ctx, `
					INSERT INTO step_dependencies (step_id, depends_on_step_id) VALUES ($1, $2)
				`, stepIDs[plan.StepType], depID); err != nil {
					return err
				}
			}
		}

		// generate_thumbnail has no dependency, no billing item, and
		// does not wait on credit: dispatch it immediately.
		if thumbID, ok := stepIDs[workflow.StepThumbnail]; ok {
			if err := dispatchStep(ctx, tx, w.ID, thumbID, workflow.StepThumbnail, in.MediaID, 1, ""); err != nil {
				return err
			}
		}

		return publishReserveCommand(ctx, tx, w)
	})
	if txErr != nil {
		return workflow.Workflow{}, txErr
	}
	return result, nil
}

// --- ApplyCreditDecision ---

func (r *WorkflowRepository) ApplyCreditDecision(ctx context.Context, eventID, workflowID uuid.UUID, accepted bool) error {
	return withTx(ctx, r.pool, func(ctx context.Context, tx pgx.Tx) error {
		w, err := findWorkflowByIDForUpdate(ctx, tx, workflowID)
		if err != nil {
			if errors.Is(err, workflow.ErrNotFound) {
				return nil
			}
			return err
		}
		if w.State != workflow.StateReservingCredit {
			return nil
		}

		if !accepted {
			return transitionWorkflowFailed(ctx, tx, w)
		}

		if _, err := tx.Exec(ctx, `UPDATE workflows SET state = $2, version = version + 1 WHERE id = $1`,
			w.ID, string(workflow.StateRunning)); err != nil {
			return err
		}

		transcribe, err := findStepByTypeForUpdate(ctx, tx, w.ID, workflow.StepTranscribe)
		if err != nil {
			return err
		}
		return dispatchStep(ctx, tx, w.ID, transcribe.ID, workflow.StepTranscribe, w.MediaID, 1, "")
	})
}

// --- CompleteStep ---

func (r *WorkflowRepository) CompleteStep(ctx context.Context, in workflow.StepCompletion) error {
	return withTx(ctx, r.pool, func(ctx context.Context, tx pgx.Tx) error {
		w, err := findWorkflowByIDForUpdate(ctx, tx, in.WorkflowID)
		if err != nil {
			if errors.Is(err, workflow.ErrNotFound) {
				return nil
			}
			return err
		}
		step, err := findStepByTypeForUpdate(ctx, tx, w.ID, in.StepType)
		if err != nil {
			if errors.Is(err, workflow.ErrNotFound) {
				return nil
			}
			return err
		}

		// Stale or already-applied: architecture.md requires completion
		// validate workflow/step/attempt and ignore anything that isn't
		// the currently outstanding attempt.
		if step.State == workflow.StepStateCompleted || in.Attempt != step.CurrentAttempt {
			return nil
		}

		if _, err := tx.Exec(ctx, `UPDATE workflow_steps SET state = $2 WHERE id = $1`,
			step.ID, string(workflow.StepStateCompleted)); err != nil {
			return err
		}
		if _, err := tx.Exec(ctx, `
			UPDATE step_attempts SET state = $3, completed_at = now() WHERE step_id = $1 AND attempt = $2
		`, step.ID, in.Attempt, string(workflow.StepStateCompleted)); err != nil {
			return err
		}

		if itemID, billable := workflow.BillingItemID(in.StepType); billable {
			if err := publishSettleCommand(ctx, tx, w, "settle_item", itemID); err != nil {
				return err
			}
		}

		dependents, err := findDependentSteps(ctx, tx, step.ID)
		if err != nil {
			return err
		}
		for _, dep := range dependents {
			if dep.State != workflow.StepStatePending {
				continue
			}
			ready, err := allDependenciesCompleted(ctx, tx, dep.ID)
			if err != nil {
				return err
			}
			if !ready {
				continue
			}
			if err := dispatchStep(ctx, tx, w.ID, dep.ID, dep.StepType, w.MediaID, 1, w.AudioVoice); err != nil {
				return err
			}
		}

		if w.State != workflow.StateRunning {
			return nil
		}
		allDone, err := allRequiredStepsCompleted(ctx, tx, w.ID)
		if err != nil {
			return err
		}
		if !allDone {
			return nil
		}

		if _, err := tx.Exec(ctx, `
			UPDATE workflows SET state = $2, version = version + 1, completed_at = now() WHERE id = $1
		`, w.ID, string(workflow.StateCompleted)); err != nil {
			return err
		}
		if err := publishStatusChanged(ctx, tx, w.MediaID, "completed"); err != nil {
			return err
		}
		return publishSettleCommand(ctx, tx, w, "release_remainder", "")
	})
}

// --- FailStep ---

func (r *WorkflowRepository) FailStep(ctx context.Context, in workflow.StepFailure, maxAttempts int) error {
	return withTx(ctx, r.pool, func(ctx context.Context, tx pgx.Tx) error {
		w, err := findWorkflowByIDForUpdate(ctx, tx, in.WorkflowID)
		if err != nil {
			if errors.Is(err, workflow.ErrNotFound) {
				return nil
			}
			return err
		}
		step, err := findStepByTypeForUpdate(ctx, tx, w.ID, in.StepType)
		if err != nil {
			if errors.Is(err, workflow.ErrNotFound) {
				return nil
			}
			return err
		}
		if step.State == workflow.StepStateCompleted || step.State == workflow.StepStateFailed || in.Attempt != step.CurrentAttempt {
			return nil
		}

		if _, err := tx.Exec(ctx, `
			UPDATE step_attempts SET state = $3, error_code = $4, completed_at = now() WHERE step_id = $1 AND attempt = $2
		`, step.ID, in.Attempt, string(workflow.StepStateFailed), in.ErrorCode); err != nil {
			return err
		}

		if in.Retriable && in.Attempt < maxAttempts {
			retryAt := time.Now().Add(retry.Compute(in.Attempt))
			if _, err := tx.Exec(ctx, `UPDATE workflow_steps SET state = $2 WHERE id = $1`,
				step.ID, string(workflow.StepStateRetryScheduled)); err != nil {
				return err
			}
			_, err := tx.Exec(ctx, `
				UPDATE step_attempts SET retry_at = $3 WHERE step_id = $1 AND attempt = $2
			`, step.ID, in.Attempt, retryAt)
			return err
		}

		failure := in
		return failWorkflowStep(ctx, tx, w, step, in.ErrorCode, &failure)
	})
}

// --- CompleteThumbnail ---

func (r *WorkflowRepository) CompleteThumbnail(ctx context.Context, mediaID uuid.UUID) error {
	return withTx(ctx, r.pool, func(ctx context.Context, tx pgx.Tx) error {
		w, err := findWorkflowByMediaIDForUpdate(ctx, tx, mediaID)
		if err != nil {
			if errors.Is(err, workflow.ErrNotFound) {
				return nil
			}
			return err
		}
		step, err := findStepByTypeForUpdate(ctx, tx, w.ID, workflow.StepThumbnail)
		if err != nil {
			if errors.Is(err, workflow.ErrNotFound) {
				return nil
			}
			return err
		}
		if step.State == workflow.StepStateCompleted {
			return nil
		}
		_, err = tx.Exec(ctx, `UPDATE workflow_steps SET state = $2 WHERE id = $1`,
			step.ID, string(workflow.StepStateCompleted))
		return err
	})
}

// --- Retry scheduling ---

func (r *WorkflowRepository) DueRetries(ctx context.Context, now time.Time, limit int) ([]workflow.DueRetry, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT sa.step_id, ws.workflow_id, w.media_id, ws.step_type, sa.attempt
		FROM step_attempts sa
		JOIN workflow_steps ws ON ws.id = sa.step_id
		JOIN workflows w ON w.id = ws.workflow_id
		WHERE ws.state = $1 AND sa.retry_at IS NOT NULL AND sa.retry_at <= $2
		ORDER BY sa.retry_at ASC
		LIMIT $3
	`, string(workflow.StepStateRetryScheduled), now, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var due []workflow.DueRetry
	for rows.Next() {
		var d workflow.DueRetry
		var attempt int
		if err := rows.Scan(&d.StepID, &d.WorkflowID, &d.MediaID, &d.StepType, &attempt); err != nil {
			return nil, err
		}
		d.NextAttempt = attempt + 1
		due = append(due, d)
	}
	return due, rows.Err()
}

func (r *WorkflowRepository) DispatchRetry(ctx context.Context, due workflow.DueRetry, maxAttempts int) error {
	return withTx(ctx, r.pool, func(ctx context.Context, tx pgx.Tx) error {
		step, err := findStepByIDForUpdate(ctx, tx, due.StepID)
		if err != nil {
			if errors.Is(err, workflow.ErrNotFound) {
				return nil
			}
			return err
		}
		if step.State != workflow.StepStateRetryScheduled {
			// Already redispatched or otherwise resolved by a concurrent
			// tick or a since-arrived completion.
			return nil
		}

		if due.NextAttempt > maxAttempts {
			// Defensive: FailStep already checks attempt < maxAttempts
			// before scheduling a retry, so this should not normally
			// happen; treat it as exhausted rather than dispatching an
			// attempt past the configured bound.
			w, err := findWorkflowByIDForUpdate(ctx, tx, due.WorkflowID)
			if err != nil {
				if errors.Is(err, workflow.ErrNotFound) {
					return nil
				}
				return err
			}
			return failWorkflowStep(ctx, tx, w, step, "retries_exhausted", nil)
		}

		voice := ""
		if due.StepType == workflow.StepSummaryAudio {
			w, err := findWorkflowByIDForUpdate(ctx, tx, due.WorkflowID)
			if err != nil {
				if errors.Is(err, workflow.ErrNotFound) {
					return nil
				}
				return err
			}
			voice = w.AudioVoice
		}
		return dispatchStep(ctx, tx, due.WorkflowID, due.StepID, due.StepType, due.MediaID, due.NextAttempt, voice)
	})
}

// --- Timeout sweeping ---

func (r *WorkflowRepository) TimedOutSteps(ctx context.Context, now time.Time, limit int) ([]workflow.TimedOutStep, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT w.id, w.media_id, ws.step_type, ws.current_attempt
		FROM workflow_steps ws
		JOIN workflows w ON w.id = ws.workflow_id
		WHERE ws.state = $1 AND ws.deadline_at IS NOT NULL AND ws.deadline_at <= $2
		ORDER BY ws.deadline_at ASC
		LIMIT $3
	`, string(workflow.StepStateDispatched), now, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []workflow.TimedOutStep
	for rows.Next() {
		var t workflow.TimedOutStep
		if err := rows.Scan(&t.WorkflowID, &t.MediaID, &t.StepType, &t.Attempt); err != nil {
			return nil, err
		}
		out = append(out, t)
	}
	return out, rows.Err()
}

// --- Deletion ---

func (r *WorkflowRepository) CancelForDeletion(ctx context.Context, deletionID, mediaID uuid.UUID) error {
	return withTx(ctx, r.pool, func(ctx context.Context, tx pgx.Tx) error {
		var existingState string
		err := tx.QueryRow(ctx, `SELECT state FROM deletion_operations WHERE deletion_id = $1`, deletionID).Scan(&existingState)
		if err == nil {
			return nil // already processed
		}
		if !errors.Is(err, pgx.ErrNoRows) {
			return err
		}

		w, findErr := findWorkflowByMediaIDForUpdate(ctx, tx, mediaID)
		if findErr != nil && !errors.Is(findErr, workflow.ErrNotFound) {
			return findErr
		}
		if findErr == nil {
			switch w.State {
			case workflow.StateRunning:
				if _, err := tx.Exec(ctx, `
					UPDATE workflows SET state = $2, version = version + 1, completed_at = now() WHERE id = $1
				`, w.ID, string(workflow.StateCanceled)); err != nil {
					return err
				}
				if err := publishSettleCommand(ctx, tx, w, "release_remainder", ""); err != nil {
					return err
				}
			case workflow.StateReservingCredit:
				// Credit may not be reserved yet, and may still be
				// confirmed later by a now-stale mn.billing.credit.reserved.v1
				// (ApplyCreditDecision's state guard makes that a no-op).
				// billing.ReleaseRemainder errors on an unknown
				// reservation rather than treating it as a harmless
				// no-op, so we cannot safely release here; a reservation
				// confirmed after this point is reclaimed by billing's
				// reservation-expiry sweep (ADR 0008), not yet
				// implemented per docs/services/billing.md's "Deferred"
				// section.
				if _, err := tx.Exec(ctx, `
					UPDATE workflows SET state = $2, version = version + 1, completed_at = now() WHERE id = $1
				`, w.ID, string(workflow.StateCanceled)); err != nil {
					return err
				}
			}
		}

		if _, err := tx.Exec(ctx, `
			INSERT INTO deletion_operations (deletion_id, media_id, state, completed_at)
			VALUES ($1, $2, 'completed', now())
			ON CONFLICT (deletion_id) DO NOTHING
		`, deletionID, mediaID); err != nil {
			return err
		}

		payload, err := json.Marshal(map[string]any{
			"event_id":    uuid.New(),
			"deletion_id": deletionID,
			"media_id":    mediaID,
		})
		if err != nil {
			return err
		}
		return insertOutboxEvent(ctx, tx, events.DeletionCompletedTopic, mediaID.String(), payload)
	})
}

// --- shared helpers ---

// dispatchStep transitions step to dispatched for attempt, persists the
// attempt row, and publishes mn.processing.step.requested.v1 — all as
// part of the caller's transaction. idempotency_key is deterministic
// ("<step_id>:<attempt>"), so a crash between commit and the outbox relay
// publishing it is safe: the same key is used if this path is ever
// re-entered for the same (step, attempt).
// dispatchStep's voice parameter is only meaningful for
// workflow.StepSummaryAudio; every other caller passes the workflow's
// AudioVoice through unconditionally since it's harmless — it's simply
// omitted from the payload below unless both the step type matches and a
// voice was actually selected.
func dispatchStep(ctx context.Context, tx pgx.Tx, workflowID, stepID uuid.UUID, stepType string, mediaID uuid.UUID, attempt int, voice string) error {
	deadline := time.Now().Add(timeout.DeadlineFor(stepType))
	if _, err := tx.Exec(ctx, `
		UPDATE workflow_steps SET state = $2, current_attempt = $3, deadline_at = $4 WHERE id = $1
	`, stepID, string(workflow.StepStateDispatched), attempt, deadline); err != nil {
		return err
	}

	idempotencyKey := fmt.Sprintf("%s:%d", stepID, attempt)
	if _, err := tx.Exec(ctx, `
		INSERT INTO step_attempts (id, step_id, attempt, idempotency_key, state, created_at)
		VALUES ($1, $2, $3, $4, $5, now())
	`, uuid.New(), stepID, attempt, idempotencyKey, string(workflow.StepStateDispatched)); err != nil {
		return err
	}

	fields := map[string]any{
		"event_id":        uuid.New(),
		"media_id":        mediaID,
		"workflow_id":     workflowID,
		"step_id":         stepID,
		"step":            stepType,
		"attempt":         attempt,
		"idempotency_key": idempotencyKey,
	}
	if stepType == workflow.StepSummaryAudio && voice != "" {
		fields["voice"] = voice
	}
	payload, err := json.Marshal(fields)
	if err != nil {
		return err
	}
	return insertOutboxEvent(ctx, tx, events.StepRequestedTopic, mediaID.String(), payload)
}

// failWorkflowStep marks step failed, copies the record to the DLQ, and,
// if step is required and the workflow is still running, fails the
// workflow: publishes status.changed(failed) and releases the credit
// reservation remainder. src carries the original Kafka record's
// coordinates for the DLQ entry when the failure came from a real
// message (nil for a timeout or a defensive exhaustion with no backing
// message).
func failWorkflowStep(ctx context.Context, tx pgx.Tx, w workflow.Workflow, step stepRow, errorCode string, src *workflow.StepFailure) error {
	if _, err := tx.Exec(ctx, `UPDATE workflow_steps SET state = $2 WHERE id = $1`,
		step.ID, string(workflow.StepStateFailed)); err != nil {
		return err
	}
	if err := publishDLQRecord(ctx, tx, w, step, errorCode, src); err != nil {
		return err
	}

	if !step.Required || w.State != workflow.StateRunning {
		return nil
	}
	if _, err := tx.Exec(ctx, `
		UPDATE workflows SET state = $2, version = version + 1, completed_at = now() WHERE id = $1
	`, w.ID, string(workflow.StateFailed)); err != nil {
		return err
	}
	if err := publishStatusChanged(ctx, tx, w.MediaID, "failed"); err != nil {
		return err
	}
	return publishSettleCommand(ctx, tx, w, "release_remainder", "")
}

func publishDLQRecord(ctx context.Context, tx pgx.Tx, w workflow.Workflow, step stepRow, errorCode string, src *workflow.StepFailure) error {
	eventID := uuid.New()
	key := w.MediaID.String()
	fields := map[string]any{
		"event_id":    eventID,
		"media_id":    w.MediaID,
		"workflow_id": w.ID,
		"step":        step.StepType,
		"attempt":     step.CurrentAttempt,
		"error_code":  errorCode,
		"failed_at":   time.Now(),
	}
	if src != nil {
		fields["event_id"] = src.EventID
		fields["original_topic"] = src.SourceTopic
		fields["original_partition"] = src.SourcePartition
		fields["original_offset"] = src.SourceOffset
		fields["original_key"] = src.SourceKey
		if src.SourceKey != "" {
			key = src.SourceKey
		}
	}
	payload, err := json.Marshal(fields)
	if err != nil {
		return err
	}
	return insertOutboxEvent(ctx, tx, events.DLQTopic, key, payload)
}

func transitionWorkflowFailed(ctx context.Context, tx pgx.Tx, w workflow.Workflow) error {
	if _, err := tx.Exec(ctx, `
		UPDATE workflows SET state = $2, version = version + 1, completed_at = now() WHERE id = $1
	`, w.ID, string(workflow.StateFailed)); err != nil {
		return err
	}
	return publishStatusChanged(ctx, tx, w.MediaID, "failed")
}

func publishStatusChanged(ctx context.Context, tx pgx.Tx, mediaID uuid.UUID, status string) error {
	payload, err := json.Marshal(map[string]any{
		"event_id": uuid.New(),
		"media_id": mediaID,
		"status":   status,
	})
	if err != nil {
		return err
	}
	return insertOutboxEvent(ctx, tx, events.StatusChangedTopic, mediaID.String(), payload)
}

// publishReserveCommand requests billing's credit reservation for w's
// already-priced quote, matching billing's reserveEnvelope shape
// (services/billing/internal/events/consumer.go).
func publishReserveCommand(ctx context.Context, tx pgx.Tx, w workflow.Workflow) error {
	payload, err := json.Marshal(map[string]any{
		"event_id":    uuid.New(),
		"user_id":     w.UserID,
		"workflow_id": w.ID,
		"quote_id":    w.QuoteID,
	})
	if err != nil {
		return err
	}
	return insertOutboxEvent(ctx, tx, events.CreditReserveCommandTopic, w.UserID.String(), payload)
}

// publishSettleCommand matches billing's settleEnvelope shape
// (services/billing/internal/events/consumer.go): action is
// "settle_item" (with itemID) or "release_remainder" (itemID empty).
func publishSettleCommand(ctx context.Context, tx pgx.Tx, w workflow.Workflow, action, itemID string) error {
	fields := map[string]any{
		"event_id":    uuid.New(),
		"workflow_id": w.ID,
		"action":      action,
	}
	if itemID != "" {
		fields["item_id"] = itemID
	}
	payload, err := json.Marshal(fields)
	if err != nil {
		return err
	}
	return insertOutboxEvent(ctx, tx, events.CreditSettleCommandTopic, w.UserID.String(), payload)
}

// --- lookups ---

func scanWorkflow(row rowScanner) (workflow.Workflow, error) {
	var w workflow.Workflow
	var state string
	err := row.Scan(&w.ID, &w.MediaID, &w.RequestID, &w.UserID, &state, &w.QuoteID, &w.Version, &w.StartedAt, &w.CompletedAt, &w.AudioVoice)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return workflow.Workflow{}, workflow.ErrNotFound
		}
		return workflow.Workflow{}, err
	}
	w.State = workflow.State(state)
	return w, nil
}

func findWorkflowByRequestID(ctx context.Context, q querier, requestID uuid.UUID) (workflow.Workflow, error) {
	row := q.QueryRow(ctx, `SELECT `+workflowColumns+` FROM workflows WHERE request_id = $1`, requestID)
	return scanWorkflow(row)
}

func findWorkflowByMediaID(ctx context.Context, q querier, mediaID uuid.UUID) (workflow.Workflow, error) {
	row := q.QueryRow(ctx, `SELECT `+workflowColumns+` FROM workflows WHERE media_id = $1`, mediaID)
	return scanWorkflow(row)
}

func findWorkflowByMediaIDForUpdate(ctx context.Context, tx pgx.Tx, mediaID uuid.UUID) (workflow.Workflow, error) {
	row := tx.QueryRow(ctx, `SELECT `+workflowColumns+` FROM workflows WHERE media_id = $1 FOR UPDATE`, mediaID)
	return scanWorkflow(row)
}

func findWorkflowByIDForUpdate(ctx context.Context, tx pgx.Tx, id uuid.UUID) (workflow.Workflow, error) {
	row := tx.QueryRow(ctx, `SELECT `+workflowColumns+` FROM workflows WHERE id = $1 FOR UPDATE`, id)
	return scanWorkflow(row)
}

const stepColumns = `id, workflow_id, step_type, required, state, current_attempt`

func scanStep(row rowScanner) (stepRow, error) {
	var s stepRow
	var state string
	err := row.Scan(&s.ID, &s.WorkflowID, &s.StepType, &s.Required, &state, &s.CurrentAttempt)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return stepRow{}, workflow.ErrNotFound
		}
		return stepRow{}, err
	}
	s.State = workflow.StepState(state)
	return s, nil
}

func findStepByTypeForUpdate(ctx context.Context, tx pgx.Tx, workflowID uuid.UUID, stepType string) (stepRow, error) {
	row := tx.QueryRow(ctx, `
		SELECT `+stepColumns+` FROM workflow_steps WHERE workflow_id = $1 AND step_type = $2 FOR UPDATE
	`, workflowID, stepType)
	return scanStep(row)
}

func findStepByIDForUpdate(ctx context.Context, tx pgx.Tx, id uuid.UUID) (stepRow, error) {
	row := tx.QueryRow(ctx, `SELECT `+stepColumns+` FROM workflow_steps WHERE id = $1 FOR UPDATE`, id)
	return scanStep(row)
}

const stepColumnsQualified = `ws.id, ws.workflow_id, ws.step_type, ws.required, ws.state, ws.current_attempt`

// findDependentSteps returns every step (locked FOR UPDATE) that depends
// directly on stepID.
func findDependentSteps(ctx context.Context, tx pgx.Tx, stepID uuid.UUID) ([]stepRow, error) {
	rows, err := tx.Query(ctx, `
		SELECT `+stepColumnsQualified+`
		FROM step_dependencies sd
		JOIN workflow_steps ws ON ws.id = sd.step_id
		WHERE sd.depends_on_step_id = $1
		FOR UPDATE OF ws
	`, stepID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []stepRow
	for rows.Next() {
		s, err := scanStep(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, s)
	}
	return out, rows.Err()
}

// allDependenciesCompleted reports whether every step stepID depends on
// is completed.
func allDependenciesCompleted(ctx context.Context, tx pgx.Tx, stepID uuid.UUID) (bool, error) {
	var incomplete int
	err := tx.QueryRow(ctx, `
		SELECT count(*)
		FROM step_dependencies sd
		JOIN workflow_steps dep ON dep.id = sd.depends_on_step_id
		WHERE sd.step_id = $1 AND dep.state <> $2
	`, stepID, string(workflow.StepStateCompleted)).Scan(&incomplete)
	if err != nil {
		return false, err
	}
	return incomplete == 0, nil
}

// allRequiredStepsCompleted reports whether every required step of
// workflowID is completed.
func allRequiredStepsCompleted(ctx context.Context, tx pgx.Tx, workflowID uuid.UUID) (bool, error) {
	var incomplete int
	err := tx.QueryRow(ctx, `
		SELECT count(*) FROM workflow_steps WHERE workflow_id = $1 AND required AND state <> $2
	`, workflowID, string(workflow.StepStateCompleted)).Scan(&incomplete)
	if err != nil {
		return false, err
	}
	return incomplete == 0, nil
}
