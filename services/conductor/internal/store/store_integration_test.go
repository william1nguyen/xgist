package store_test

import (
	"context"
	"os"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	tcpostgres "github.com/testcontainers/testcontainers-go/modules/postgres"

	"github.com/nolannguyen1212/media-notes/services/conductor/internal/events"
	"github.com/nolannguyen1212/media-notes/services/conductor/internal/store"
	"github.com/nolannguyen1212/media-notes/services/conductor/internal/workflow"
)

// requireIntegration skips the test unless V2_INTEGRATION_TESTS is set,
// since it starts a real PostgreSQL container through Testcontainers and
// therefore requires a working Docker daemon.
func requireIntegration(t *testing.T) {
	t.Helper()
	if os.Getenv("V2_INTEGRATION_TESTS") == "" {
		t.Skip("set V2_INTEGRATION_TESTS=1 to run integration tests against a real PostgreSQL container")
	}
}

// newTestPool starts a disposable PostgreSQL container, applies
// migrations/V1__init.sql directly, and returns a connected pool.
func newTestPool(t *testing.T) *pgxpool.Pool {
	t.Helper()
	ctx := context.Background()

	container, err := tcpostgres.Run(ctx, "postgres:16",
		tcpostgres.WithDatabase("conductor_test"),
		tcpostgres.WithUsername("conductor_test"),
		tcpostgres.WithPassword("conductor_test"),
	)
	if err != nil {
		t.Fatalf("start postgres container: %v", err)
	}
	t.Cleanup(func() {
		if err := container.Terminate(context.Background()); err != nil {
			t.Logf("terminate container: %v", err)
		}
	})

	connStr, err := container.ConnectionString(ctx, "sslmode=disable")
	if err != nil {
		t.Fatalf("connection string: %v", err)
	}

	var migration []byte
	for _, name := range []string{
		"V1__init.sql",
		"V2__add_audio_voice.sql",
		"V3__loosen_workflows_media_id_unique.sql",
	} {
		b, err := os.ReadFile("../../migrations/" + name)
		if err != nil {
			t.Fatalf("read migration %s: %v", name, err)
		}
		migration = append(migration, b...)
	}

	// The postgres module reports ready after the log line that precedes
	// its internal init-then-restart cycle; connecting immediately can
	// race that restart. Retry briefly instead of failing on the first
	// reset connection.
	var setupPool *pgxpool.Pool
	for attempt := 0; ; attempt++ {
		setupPool, err = pgxpool.New(ctx, connStr)
		if err == nil {
			if _, execErr := setupPool.Exec(ctx, string(migration)); execErr == nil {
				break
			} else {
				err = execErr
			}
			setupPool.Close()
		}
		if attempt >= 10 {
			t.Fatalf("apply migration: %v", err)
		}
		time.Sleep(500 * time.Millisecond)
	}
	setupPool.Close()

	pool, err := store.NewPool(ctx, connStr)
	if err != nil {
		t.Fatalf("connect pool: %v", err)
	}
	t.Cleanup(pool.Close)
	return pool
}

func countOutbox(t *testing.T, pool *pgxpool.Pool, topic string) int {
	t.Helper()
	var n int
	if err := pool.QueryRow(context.Background(), `SELECT count(*) FROM outbox_events WHERE topic = $1`, topic).Scan(&n); err != nil {
		t.Fatalf("count outbox events: %v", err)
	}
	return n
}

func stepState(t *testing.T, pool *pgxpool.Pool, workflowID uuid.UUID, stepType string) string {
	t.Helper()
	var state string
	err := pool.QueryRow(context.Background(),
		`SELECT state FROM workflow_steps WHERE workflow_id = $1 AND step_type = $2`, workflowID, stepType).Scan(&state)
	if err != nil {
		t.Fatalf("read step state (%s): %v", stepType, err)
	}
	return state
}

func workflowState(t *testing.T, pool *pgxpool.Pool, workflowID uuid.UUID) string {
	t.Helper()
	var state string
	if err := pool.QueryRow(context.Background(), `SELECT state FROM workflows WHERE id = $1`, workflowID).Scan(&state); err != nil {
		t.Fatalf("read workflow state: %v", err)
	}
	return state
}

func TestWorkflowLifecycle(t *testing.T) {
	requireIntegration(t)
	pool := newTestPool(t)
	repo := store.NewWorkflowRepository(pool)
	ctx := context.Background()

	mediaID := uuid.New()
	userID := uuid.New()
	quoteID := uuid.New()
	requestID := uuid.New()

	var w workflow.Workflow

	t.Run("CreateWorkflow persists steps, dependencies, dispatches thumbnail, requests credit", func(t *testing.T) {
		var err error
		w, err = repo.CreateWorkflow(ctx, workflow.NewWorkflow{
			RequestID: requestID,
			MediaID:   mediaID,
			UserID:    userID,
			QuoteID:   quoteID,
			Steps:     workflow.PlanSteps([]string{"summarize", "generate_audio_summary"}, "video"),
		})
		if err != nil {
			t.Fatalf("CreateWorkflow: %v", err)
		}
		if w.State != workflow.StateReservingCredit {
			t.Errorf("workflow state = %s, want reserving_credit", w.State)
		}
		if stepState(t, pool, w.ID, workflow.StepThumbnail) != string(workflow.StepStateDispatched) {
			t.Error("generate_thumbnail must be dispatched immediately, independent of credit")
		}
		if stepState(t, pool, w.ID, workflow.StepTranscribe) != string(workflow.StepStatePending) {
			t.Error("transcribe must wait for credit reservation")
		}
		if countOutbox(t, pool, events.CreditReserveCommandTopic) != 1 {
			t.Error("expected exactly one credit reserve command")
		}
		if countOutbox(t, pool, events.StepRequestedTopic) != 1 {
			t.Error("expected exactly one step.requested (generate_thumbnail)")
		}
	})

	t.Run("a duplicate CreateWorkflow call for the same request_id is a no-op", func(t *testing.T) {
		again, err := repo.CreateWorkflow(ctx, workflow.NewWorkflow{
			RequestID: requestID, MediaID: mediaID, UserID: userID, QuoteID: quoteID,
			Steps: workflow.PlanSteps([]string{"summarize", "generate_audio_summary"}, "video"),
		})
		if err != nil {
			t.Fatalf("CreateWorkflow (duplicate): %v", err)
		}
		if again.ID != w.ID {
			t.Error("duplicate request_id must return the existing workflow")
		}
		if countOutbox(t, pool, events.CreditReserveCommandTopic) != 1 {
			t.Error("duplicate CreateWorkflow must not republish the reserve command")
		}
	})

	t.Run("ApplyCreditDecision(accepted) dispatches transcribe", func(t *testing.T) {
		if err := repo.ApplyCreditDecision(ctx, uuid.New(), w.ID, true); err != nil {
			t.Fatalf("ApplyCreditDecision: %v", err)
		}
		if workflowState(t, pool, w.ID) != string(workflow.StateRunning) {
			t.Error("workflow must be running after credit is accepted")
		}
		if stepState(t, pool, w.ID, workflow.StepTranscribe) != string(workflow.StepStateDispatched) {
			t.Error("transcribe must be dispatched after credit is accepted")
		}
	})

	t.Run("a redelivered ApplyCreditDecision is a no-op", func(t *testing.T) {
		if err := repo.ApplyCreditDecision(ctx, uuid.New(), w.ID, true); err != nil {
			t.Fatalf("ApplyCreditDecision (redelivery): %v", err)
		}
		// Still exactly one dispatched transcribe attempt.
		var attempts int
		if err := pool.QueryRow(ctx, `
			SELECT count(*) FROM step_attempts sa JOIN workflow_steps ws ON ws.id = sa.step_id
			WHERE ws.workflow_id = $1 AND ws.step_type = $2
		`, w.ID, workflow.StepTranscribe).Scan(&attempts); err != nil {
			t.Fatalf("count attempts: %v", err)
		}
		if attempts != 1 {
			t.Errorf("transcribe attempts = %d, want 1 (redelivered decision must not redispatch)", attempts)
		}
	})

	t.Run("CompleteStep(transcribe) dispatches its dependent (summary) and settles billing", func(t *testing.T) {
		if err := repo.CompleteStep(ctx, workflow.StepCompletion{
			EventID: uuid.New(), WorkflowID: w.ID, MediaID: mediaID, StepType: workflow.StepTranscribe, Attempt: 1,
		}); err != nil {
			t.Fatalf("CompleteStep(transcribe): %v", err)
		}
		if stepState(t, pool, w.ID, workflow.StepTranscribe) != string(workflow.StepStateCompleted) {
			t.Error("transcribe must be completed")
		}
		if stepState(t, pool, w.ID, workflow.StepSummary) != string(workflow.StepStateDispatched) {
			t.Error("summary must be dispatched once its dependency (transcribe) completes")
		}
		if countOutbox(t, pool, events.CreditSettleCommandTopic) != 1 {
			t.Error("expected one settle_item command for the billable transcribe step")
		}
	})

	t.Run("a stale (lower) attempt is ignored", func(t *testing.T) {
		if err := repo.CompleteStep(ctx, workflow.StepCompletion{
			EventID: uuid.New(), WorkflowID: w.ID, MediaID: mediaID, StepType: workflow.StepTranscribe, Attempt: 1,
		}); err != nil {
			t.Fatalf("CompleteStep (stale replay): %v", err)
		}
		// Still exactly one settle_item command from the first completion.
		if countOutbox(t, pool, events.CreditSettleCommandTopic) != 1 {
			t.Error("a stale/duplicate completion must not re-settle billing")
		}
	})

	t.Run("CompleteStep(summary) dispatches summary_audio and settles it too", func(t *testing.T) {
		if err := repo.CompleteStep(ctx, workflow.StepCompletion{
			EventID: uuid.New(), WorkflowID: w.ID, MediaID: mediaID, StepType: workflow.StepSummary, Attempt: 1,
		}); err != nil {
			t.Fatalf("CompleteStep(summary): %v", err)
		}
		if stepState(t, pool, w.ID, workflow.StepSummaryAudio) != string(workflow.StepStateDispatched) {
			t.Error("summary_audio must be dispatched once its dependency (summary) completes")
		}
		if countOutbox(t, pool, events.CreditSettleCommandTopic) != 2 {
			t.Error("expected a second settle_item command for the billable summary step")
		}
	})

	t.Run("completing the last required step completes the workflow and releases the remainder", func(t *testing.T) {
		if err := repo.CompleteStep(ctx, workflow.StepCompletion{
			EventID: uuid.New(), WorkflowID: w.ID, MediaID: mediaID, StepType: workflow.StepSummaryAudio, Attempt: 1,
		}); err != nil {
			t.Fatalf("CompleteStep(summary_audio): %v", err)
		}
		if workflowState(t, pool, w.ID) != string(workflow.StateCompleted) {
			t.Error("workflow must be completed once every required step is done")
		}
		if countOutbox(t, pool, events.StatusChangedTopic) != 1 {
			t.Error("expected one status.changed(completed) event")
		}
		if countOutbox(t, pool, events.CreditSettleCommandTopic) != 4 {
			// 3 settle_item (transcribe, summary, summary_audio) + 1 release_remainder.
			t.Errorf("settle command count = %d, want 4", countOutbox(t, pool, events.CreditSettleCommandTopic))
		}
	})

	t.Run("generate_thumbnail does not gate workflow completion and is unaffected", func(t *testing.T) {
		if err := repo.CompleteThumbnail(ctx, mediaID); err != nil {
			t.Fatalf("CompleteThumbnail: %v", err)
		}
		if stepState(t, pool, w.ID, workflow.StepThumbnail) != string(workflow.StepStateCompleted) {
			t.Error("generate_thumbnail must be completed")
		}
	})
}

func TestCreateWorkflowStartsAnotherAfterTheFirstCompletes(t *testing.T) {
	requireIntegration(t)
	pool := newTestPool(t)
	repo := store.NewWorkflowRepository(pool)
	ctx := context.Background()

	mediaID := uuid.New()
	userID := uuid.New()

	first, err := repo.CreateWorkflow(ctx, workflow.NewWorkflow{
		RequestID: uuid.New(), MediaID: mediaID, UserID: userID, QuoteID: uuid.New(),
		Steps: workflow.PlanSteps([]string{"summarize"}, "audio"),
	})
	if err != nil {
		t.Fatalf("CreateWorkflow (first): %v", err)
	}

	// Drive the first workflow to completion the same way TestWorkflowLifecycle
	// does, via ApplyCreditDecision/CompleteStep, rather than writing state
	// directly: this exercises the same code path RequestProcessing's
	// second call needs to interoperate with.
	if err := repo.ApplyCreditDecision(ctx, uuid.New(), first.ID, true); err != nil {
		t.Fatalf("ApplyCreditDecision: %v", err)
	}
	if err := repo.CompleteStep(ctx, workflow.StepCompletion{
		EventID: uuid.New(), WorkflowID: first.ID, MediaID: mediaID, StepType: workflow.StepTranscribe, Attempt: 1,
	}); err != nil {
		t.Fatalf("CompleteStep(transcribe): %v", err)
	}
	if err := repo.CompleteStep(ctx, workflow.StepCompletion{
		EventID: uuid.New(), WorkflowID: first.ID, MediaID: mediaID, StepType: workflow.StepSummary, Attempt: 1,
	}); err != nil {
		t.Fatalf("CompleteStep(summary): %v", err)
	}
	if workflowState(t, pool, first.ID) != string(workflow.StateCompleted) {
		t.Fatal("first workflow must be completed before starting a second one")
	}

	// A second CreateWorkflow call for the same media_id, once the first
	// workflow is terminal, must start a genuinely new workflow rather than
	// silently returning the first one (the ON CONFLICT ... WHERE state NOT
	// IN (...) clause must not fire here).
	second, err := repo.CreateWorkflow(ctx, workflow.NewWorkflow{
		RequestID: uuid.New(), MediaID: mediaID, UserID: userID, QuoteID: uuid.New(),
		Steps: workflow.PlanSteps([]string{"extract_keywords"}, "audio"),
	})
	if err != nil {
		t.Fatalf("CreateWorkflow (second): %v", err)
	}
	if second.ID == first.ID {
		t.Fatal("a second request after the first workflow completed must create a new workflow, not reuse the old one")
	}
	if second.State != workflow.StateReservingCredit {
		t.Errorf("second workflow state = %s, want reserving_credit", second.State)
	}

	// The first (terminal) workflow's steps are untouched by the second.
	if stepState(t, pool, first.ID, workflow.StepSummary) != string(workflow.StepStateCompleted) {
		t.Error("the first workflow's steps must be unaffected by the second workflow")
	}
}

func TestFailStepRetryThenExhaust(t *testing.T) {
	requireIntegration(t)
	pool := newTestPool(t)
	repo := store.NewWorkflowRepository(pool)
	ctx := context.Background()

	w, err := repo.CreateWorkflow(ctx, workflow.NewWorkflow{
		RequestID: uuid.New(), MediaID: uuid.New(), UserID: uuid.New(), QuoteID: uuid.New(),
		Steps: workflow.PlanSteps(nil, "video"),
	})
	if err != nil {
		t.Fatalf("CreateWorkflow: %v", err)
	}
	if err := repo.ApplyCreditDecision(ctx, uuid.New(), w.ID, true); err != nil {
		t.Fatalf("ApplyCreditDecision: %v", err)
	}

	t.Run("a retriable failure with attempts remaining schedules a retry", func(t *testing.T) {
		err := repo.FailStep(ctx, workflow.StepFailure{
			EventID: uuid.New(), WorkflowID: w.ID, MediaID: w.MediaID, StepType: workflow.StepTranscribe,
			Attempt: 1, ErrorCode: "provider_timeout", Retriable: true,
			SourceTopic: events.StepFailedTopic, SourcePartition: 0, SourceOffset: 1, SourceKey: w.MediaID.String(),
		}, 3)
		if err != nil {
			t.Fatalf("FailStep: %v", err)
		}
		if stepState(t, pool, w.ID, workflow.StepTranscribe) != string(workflow.StepStateRetryScheduled) {
			t.Error("a retriable failure under the attempt cap must schedule a retry, not fail the step")
		}
		if workflowState(t, pool, w.ID) != string(workflow.StateRunning) {
			t.Error("the workflow must remain running while a retry is scheduled")
		}
	})

	t.Run("ScheduleDueRetries dispatches the next attempt", func(t *testing.T) {
		due, err := repo.DueRetries(ctx, time.Now().Add(24*time.Hour), 10)
		if err != nil {
			t.Fatalf("DueRetries: %v", err)
		}
		if len(due) != 1 || due[0].NextAttempt != 2 {
			t.Fatalf("DueRetries = %+v, want one entry with NextAttempt=2", due)
		}
		if err := repo.DispatchRetry(ctx, due[0], 3); err != nil {
			t.Fatalf("DispatchRetry: %v", err)
		}
		if stepState(t, pool, w.ID, workflow.StepTranscribe) != string(workflow.StepStateDispatched) {
			t.Error("the retried attempt must be dispatched")
		}
	})

	t.Run("exhausting retries fails the step, the workflow, and DLQs the record", func(t *testing.T) {
		err := repo.FailStep(ctx, workflow.StepFailure{
			EventID: uuid.New(), WorkflowID: w.ID, MediaID: w.MediaID, StepType: workflow.StepTranscribe,
			Attempt: 2, ErrorCode: "provider_timeout", Retriable: true,
			SourceTopic: events.StepFailedTopic, SourcePartition: 0, SourceOffset: 2, SourceKey: w.MediaID.String(),
		}, 2) // maxAttempts=2: attempt 2 is not < 2, so this is terminal.
		if err != nil {
			t.Fatalf("FailStep (exhausted): %v", err)
		}
		if stepState(t, pool, w.ID, workflow.StepTranscribe) != string(workflow.StepStateFailed) {
			t.Error("an exhausted step must be failed")
		}
		if workflowState(t, pool, w.ID) != string(workflow.StateFailed) {
			t.Error("a required step's exhausted failure must fail the workflow")
		}
		if countOutbox(t, pool, events.DLQTopic) != 1 {
			t.Error("expected exactly one DLQ record")
		}
		if countOutbox(t, pool, events.CreditSettleCommandTopic) != 1 {
			t.Error("expected one release_remainder command after the terminal failure")
		}
	})
}

func TestExpireTimedOutStep(t *testing.T) {
	requireIntegration(t)
	pool := newTestPool(t)
	repo := store.NewWorkflowRepository(pool)
	ctx := context.Background()

	w, err := repo.CreateWorkflow(ctx, workflow.NewWorkflow{
		RequestID: uuid.New(), MediaID: uuid.New(), UserID: uuid.New(), QuoteID: uuid.New(),
		Steps: workflow.PlanSteps(nil, "video"),
	})
	if err != nil {
		t.Fatalf("CreateWorkflow: %v", err)
	}
	if err := repo.ApplyCreditDecision(ctx, uuid.New(), w.ID, true); err != nil {
		t.Fatalf("ApplyCreditDecision: %v", err)
	}

	timedOut, err := repo.TimedOutSteps(ctx, time.Now().Add(24*time.Hour), 10)
	if err != nil {
		t.Fatalf("TimedOutSteps: %v", err)
	}
	found := false
	for _, ts := range timedOut {
		if ts.WorkflowID == w.ID && ts.StepType == workflow.StepTranscribe {
			found = true
		}
	}
	if !found {
		t.Fatal("expected the dispatched transcribe step to show up as timed out well past its deadline")
	}
}

func TestCancelForDeletion(t *testing.T) {
	requireIntegration(t)
	pool := newTestPool(t)
	repo := store.NewWorkflowRepository(pool)
	ctx := context.Background()

	w, err := repo.CreateWorkflow(ctx, workflow.NewWorkflow{
		RequestID: uuid.New(), MediaID: uuid.New(), UserID: uuid.New(), QuoteID: uuid.New(),
		Steps: workflow.PlanSteps(nil, "video"),
	})
	if err != nil {
		t.Fatalf("CreateWorkflow: %v", err)
	}
	if err := repo.ApplyCreditDecision(ctx, uuid.New(), w.ID, true); err != nil {
		t.Fatalf("ApplyCreditDecision: %v", err)
	}

	deletionID := uuid.New()

	t.Run("cancels a running workflow and releases the reservation", func(t *testing.T) {
		if err := repo.CancelForDeletion(ctx, deletionID, w.MediaID); err != nil {
			t.Fatalf("CancelForDeletion: %v", err)
		}
		if workflowState(t, pool, w.ID) != string(workflow.StateCanceled) {
			t.Error("workflow must be canceled")
		}
		if countOutbox(t, pool, events.CreditSettleCommandTopic) != 1 {
			t.Error("expected one release_remainder command")
		}
		if countOutbox(t, pool, events.DeletionCompletedTopic) != 1 {
			t.Error("expected one deletion-completed event")
		}
	})

	t.Run("a redelivered deletion request is a no-op", func(t *testing.T) {
		if err := repo.CancelForDeletion(ctx, deletionID, w.MediaID); err != nil {
			t.Fatalf("CancelForDeletion (redelivery): %v", err)
		}
		if countOutbox(t, pool, events.DeletionCompletedTopic) != 1 {
			t.Error("a redelivered deletion request must not republish completion")
		}
	})
}
