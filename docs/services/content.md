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


## Initial migration: `00001_init.sql`

```sql
-- +goose Up
CREATE SCHEMA IF NOT EXISTS content;
CREATE TABLE content.contents (id uuid PRIMARY KEY, media_id uuid NOT NULL UNIQUE, workflow_id uuid NOT NULL, language text, transcript_text text, version integer NOT NULL DEFAULT 1, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE content.transcript_segments (id uuid PRIMARY KEY, content_id uuid NOT NULL REFERENCES content.contents(id), segment_index integer NOT NULL, start_ms bigint NOT NULL CHECK (start_ms >= 0), end_ms bigint NOT NULL CHECK (end_ms >= start_ms), speaker text, text text NOT NULL, UNIQUE (content_id, segment_index));
CREATE TABLE content.summaries (id uuid PRIMARY KEY, content_id uuid NOT NULL REFERENCES content.contents(id), summary_type text NOT NULL, text text NOT NULL, model text, prompt_version text, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE (content_id, summary_type));
CREATE TABLE content.keywords (id uuid PRIMARY KEY, content_id uuid NOT NULL REFERENCES content.contents(id), keyword text NOT NULL, score numeric, position integer NOT NULL, UNIQUE (content_id, keyword));
CREATE TABLE content.keypoints (id uuid PRIMARY KEY, content_id uuid NOT NULL REFERENCES content.contents(id), point_index integer NOT NULL, text text NOT NULL, start_segment integer, end_segment integer, UNIQUE (content_id, point_index));
CREATE TABLE content.notes (id uuid PRIMARY KEY, content_id uuid NOT NULL REFERENCES content.contents(id), format text NOT NULL, body text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), UNIQUE (content_id, format));
CREATE TABLE content.summary_sentences (id uuid PRIMARY KEY, summary_id uuid NOT NULL REFERENCES content.summaries(id), sentence_index integer NOT NULL, text text NOT NULL, UNIQUE (summary_id, sentence_index));
CREATE TABLE content.summary_citations (summary_sentence_id uuid NOT NULL REFERENCES content.summary_sentences(id), transcript_segment_id uuid NOT NULL REFERENCES content.transcript_segments(id), PRIMARY KEY (summary_sentence_id, transcript_segment_id));
CREATE TABLE content.audio_summaries (id uuid PRIMARY KEY, content_id uuid NOT NULL REFERENCES content.contents(id), summary_id uuid REFERENCES content.summaries(id), object_key text NOT NULL UNIQUE, mime_type text NOT NULL, duration_ms bigint, voice text, status text NOT NULL);
CREATE TABLE content.inbox_events (event_id uuid PRIMARY KEY, topic text NOT NULL, processed_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE content.outbox_events (id uuid PRIMARY KEY, topic text NOT NULL, event_key text NOT NULL, payload jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), published_at timestamptz, attempts integer NOT NULL DEFAULT 0);
-- +goose Down
DROP SCHEMA content CASCADE;
```
