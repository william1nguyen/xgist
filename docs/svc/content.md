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

## Tests

Test segment ordering, citations referencing valid segments, idempotent writes,
stale attempts, durable-before-completion ordering, deletion and read ownership.
