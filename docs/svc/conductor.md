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
