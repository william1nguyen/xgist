# Content

## Scope

Go gRPC + Kafka service owning transcripts, ordered segments, summaries,
citations, keywords, keypoints, notes, summary-audio metadata/object keys and
its deletion state. It does not own upload lifecycle or workflow decisions.

## Structure and data

```text
cmd/content/main.go
internal/transcript/ internal/generated/ internal/query/ internal/deletion/
internal/grpc/ internal/events/ internal/store/
migrations/
```

Tables: transcripts, transcript_segments, summaries, citations, keywords,
keypoints, notes, summary_audio, content_versions, outbox and inbox. Writes
deduplicate by workflow/step/idempotency key.

## Methods and contracts

```text
StoreTranscript(ctx, command) -> ContentVersion
GetTranscript(ctx, mediaID) -> Transcript
StoreSummary/Keywords/Keypoints/Notes(ctx, command) -> ContentVersion
StoreSummaryAudioMetadata(ctx, command) -> ContentVersion
GetContent(ctx, mediaID) -> Content
DeleteOwnedAccountData(ctx, deletionID, userID) -> void
```

Create `contracts/proto/content/v1/content.proto`. The worker reads only the
inputs needed for its step and writes structured results through this service.
Each successful write commits result + outbox together before
`mn.processing.step.completed.v1` is published. Events include IDs, output
kind, durable version and attempt, never text.

`SummaryAudio.url` is a short-lived presigned GET URL for `object_key`, signed
fresh on every `GetContent` read rather than stored — the same pattern media
uses for `MediaDetail.playback_url`. Only `object_key` is durable; `url` must
never be persisted or cached past one response.

Writes deduplicate by `(content_id, step, workflow_id)`, not just
`(content_id, step)`: a rejected write (`attempt` lower than the last
recorded one for that key) is a genuine out-of-order-delivery guard *within*
one workflow, not a cross-workflow one. Scoping by `workflow_id` matters for
regenerate — media's `RequestProcessing` starts a brand new workflow whose
own step attempts count from 1 again, which would otherwise compare as
stale against a prior, unrelated workflow's higher attempt count for the
same step (if that step needed a retry the first time). Each workflow's
write still upserts/replaces that step's content (`ON CONFLICT` for
single-instance types, delete-then-reinsert for list types like keywords),
so a regenerate replaces rather than duplicates.

## Tests

Test segment ordering, citations referencing valid segments, idempotent writes,
stale attempts, durable-before-completion ordering, deletion and read ownership.


## Migrations

Flyway-managed (`services/content/migrations/V{n}__*.sql`, manual rollback
scripts under `services/content/rollback/`), currently:

- `V1__init.sql` — `contents`, `transcript_segments`, `summaries`,
  `keywords`, `keypoints`, `notes`, `summary_sentences`,
  `summary_citations`, `audio_summaries`, `content_step_attempts`,
  `content_deletions`, `inbox_events`, `outbox_events`, all in the `public`
  schema. `content_step_attempts` originally had primary key
  `(content_id, step)`.
- `V2__scope_step_attempts_by_workflow.sql` — adds
  `content_step_attempts.workflow_id` and changes its primary key to
  `(content_id, step, workflow_id)`, per the write-deduplication note
  above. Wipes the table first (a disposable idempotency ledger, not user
  content, and content has no access to conductor's workflow history to
  backfill it — reaching across that boundary would violate ADR 0001).
