# Conductor

## Scope

Go Kafka service owning workflows, selected outputs, steps, dependencies,
attempts, retry schedule, timeout state and joins. It never runs AI, downloads
media, stores generated content or mutates balances.

## Structure and data

```text
cmd/conductor/main.go
internal/workflow/ internal/step/ internal/retry/ internal/timeout/
internal/consumer/ internal/publisher/ internal/store/
migrations/
```

Tables: workflows, workflow_steps, step_attempts, step_dependencies,
retry_schedule, deletion operations, outbox and inbox. Persisted state—not a
Kafka offset or in-memory timer—is authoritative.

## Methods

```text
StartWorkflow(ctx, processingRequested)
HandleCreditReserved(ctx, event)
HandleStepCompleted(ctx, event)
HandleStepFailed(ctx, event)
HandleDerivativeReady(ctx, event)
ScheduleDueRetries(ctx, now)
ExpireTimedOutSteps(ctx, now)
RequestDeletion(ctx, deletionID, userID)
```

Start is idempotent per processing request. Persist workflow and required steps,
then request one reservation before a billable step. Completion validates
workflow version, step ID and attempt; stale results are ignored. Joins publish
only selected parallel outputs. A lease/CAS bounded scheduler persists each new
attempt before publishing it.

## Events and tests

Consume the processing and billing result topics in ADR 0003. Publish worker
commands, media status changes and billing settlement commands from outbox.
Command fields are workflow/media/step IDs, kind, attempt, idempotency key and
small object references.

Test duplicate/reordered events, stale attempt, retry exhaustion/DLQ, timeout,
restart between persist and publish, parallel join, cancellation and terminal
settlement/release.


## Initial migration: `00001_init.sql`

```sql
-- +goose Up
CREATE SCHEMA IF NOT EXISTS workflow;
CREATE TABLE workflow.workflows (id uuid PRIMARY KEY, media_id uuid NOT NULL UNIQUE, request_id uuid NOT NULL UNIQUE, user_id uuid NOT NULL, state text NOT NULL, version bigint NOT NULL DEFAULT 0, deadline_at timestamptz, started_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz);
CREATE TABLE workflow.workflow_steps (id uuid PRIMARY KEY, workflow_id uuid NOT NULL REFERENCES workflow.workflows(id), step_type text NOT NULL, state text NOT NULL, required boolean NOT NULL, current_attempt integer NOT NULL DEFAULT 0, deadline_at timestamptz, UNIQUE (workflow_id, step_type));
CREATE TABLE workflow.step_dependencies (step_id uuid NOT NULL REFERENCES workflow.workflow_steps(id), depends_on_step_id uuid NOT NULL REFERENCES workflow.workflow_steps(id), PRIMARY KEY (step_id, depends_on_step_id), CHECK (step_id <> depends_on_step_id));
CREATE TABLE workflow.step_attempts (id uuid PRIMARY KEY, step_id uuid NOT NULL REFERENCES workflow.workflow_steps(id), attempt integer NOT NULL, idempotency_key text NOT NULL UNIQUE, state text NOT NULL, error_code text, retry_at timestamptz, created_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz, UNIQUE (step_id, attempt));
CREATE INDEX due_step_attempts ON workflow.step_attempts (retry_at) WHERE state = 'retry_scheduled';
CREATE TABLE workflow.deletion_operations (deletion_id uuid PRIMARY KEY, user_id uuid NOT NULL, state text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz);
CREATE TABLE workflow.inbox_events (event_id uuid PRIMARY KEY, topic text NOT NULL, received_at timestamptz NOT NULL DEFAULT now(), processed_at timestamptz);
CREATE TABLE workflow.outbox_events (id uuid PRIMARY KEY, topic text NOT NULL, event_key text NOT NULL, payload jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), published_at timestamptz, attempts integer NOT NULL DEFAULT 0);
-- +goose Down
DROP SCHEMA workflow CASCADE;
```
