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

A workflow persists the caller's optional `audio_voice` (from media's
`ConfirmUpload`/`RequestProcessing`) alongside its other columns and passes it
through unconditionally on every dispatched step command — harmless for steps
that ignore it, and it is the only per-request override the
`generate_audio_summary` step's worker command carries.

`workflows.media_id` is not globally unique: a partial unique index
(`WHERE state NOT IN ('completed', 'failed')`) enforces the real invariant
instead — at most one *active* workflow per media item at a time. Once a
workflow reaches a terminal state, media's `RequestProcessing` can start
another one for the same media item (to generate content that wasn't
originally selected, or regenerate content that was); history accumulates
as separate `workflows` rows. `CreateWorkflow`'s
`ON CONFLICT (media_id) WHERE state NOT IN ('completed', 'failed') DO NOTHING`
only absorbs a redelivery of the same logical request while a workflow is
still active — it does not block a new request once the prior one is
terminal. Lookups that need "the" workflow for a media_id resolve to the
active one (`generate_thumbnail`'s completion is the one exception: it is
dispatched immediately and does not gate workflow completion, so its result
can legitimately arrive after the workflow already went terminal, and is
matched against the most recently started workflow regardless of state).

## Events and tests

Consume the processing and billing result topics in ADR 0003. Publish worker
commands, media status changes and billing settlement commands from outbox.
Command fields are workflow/media/step IDs, kind, attempt, idempotency key and
small object references.

Test duplicate/reordered events, stale attempt, retry exhaustion/DLQ, timeout,
restart between persist and publish, parallel join, cancellation and terminal
settlement/release.


## Migrations

Flyway-managed (`services/conductor/migrations/V{n}__*.sql`, manual rollback
scripts under `services/conductor/rollback/`), currently:

- `V1__init.sql` — `workflows`, `workflow_steps`, `step_dependencies`,
  `step_attempts`, `deletion_operations`, `inbox_events`, `outbox_events`,
  all in the `public` schema. `workflows.media_id` and `.request_id` were
  both plain `UNIQUE`; `quote_id` and `started_at`/`completed_at` are also
  columns on `workflows` (omitted from the summary above — see the file for
  the exact column list).
- `V2__add_audio_voice.sql` — `workflows.audio_voice`.
- `V3__loosen_workflows_media_id_unique.sql` — drops `workflows`'
  `UNIQUE(media_id)`, replaces it with the partial unique index described
  above.
