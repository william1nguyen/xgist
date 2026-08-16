# content — Manual gRPC Test Guide

Manual test script for `media_notes.content.v1.ContentService`, using
`grpcurl` against a running `content` instance. Every request below was
actually run against the service — including a real deletion command
published to Kafka — and the response shown is real output, not
illustrative.

## Prerequisites

```bash
make infra:up
# first time only: provision the content role/database if the Postgres
# volume predates it
docker exec -i postgres psql -U admin -d media_notes < deploy/postgres/init/04-content-role.sql
make content:migrate
```

Kafka has `KAFKA_AUTO_CREATE_TOPICS_ENABLE` disabled in production-like
setups, and the outbox publisher sets `AllowAutoTopicCreation: false` too,
so a topic that was never explicitly created makes every outbox record for
it fail forever with `Unknown Topic Or Partition` until the topic exists.
Run this once per fresh Kafka volume (idempotent — safe to re-run):

```bash
make infra:kafka-topics
```

```bash
make content:run                      # or: go run ./cmd/api from services/content
```

Health check: `curl http://localhost:8084/health/ready` → `200`.

Reflection UI: `grpcui -plaintext localhost:9095`, or
`grpcurl -plaintext localhost:9095 list media_notes.content.v1.ContentService`.

## A note on media_id reuse

`content` has no media metadata of its own — every RPC below just takes a
caller-supplied `media_id`. **Do not reuse a `media_id` from another
service's manual test run** (for example media's own doc): if that id was
ever the subject of a real `RequestDeletion` call, the real
`mn.media.deletion.requested.v1` event for it is still sitting in Kafka
(7-day retention), and `content`'s consumer group replays full topic
history on its first run. Reusing `d90a250a-4029-4190-a868-72f496c7635e`
from `docs/tests/media/manual.md` while writing this guide immediately
produced:

```
ERROR:
  Code: FailedPrecondition
  Message: content: media deletion pending
```

before a single `StoreTranscript` call had been made — correct behavior,
not a bug, but confusing if you don't expect it. Generate a fresh UUID
per test run instead.

## Golden path

Run in order — each step's output feeds the next.

```bash
MEDIA_ID="909bca0a-7457-4c2f-ad25-8857365d275d"
WORKFLOW_ID="11111111-1111-1111-1111-111111111111"
```

### 1. StoreTranscript

```bash
grpcurl -plaintext -d '{
  "idempotency_key": "doc-content-1",
  "media_id": "'"$MEDIA_ID"'",
  "workflow_id": "'"$WORKFLOW_ID"'",
  "attempt": 1,
  "language": "en",
  "text": "Hello world. This is a test transcript.",
  "segments": [
    {"segment_index": 0, "start_ms": 0, "end_ms": 1500, "speaker": "speaker_1", "text": "Hello world."},
    {"segment_index": 1, "start_ms": 1500, "end_ms": 4000, "speaker": "speaker_1", "text": "This is a test transcript."}
  ]
}' localhost:9095 media_notes.content.v1.ContentService/StoreTranscript
```

```json
{
  "version": {
    "mediaId": "909bca0a-7457-4c2f-ad25-8857365d275d",
    "version": 1,
    "updatedAt": "2026-08-16T17:21:18.496016Z"
  }
}
```

This atomically created the `contents` row (lazily — there is no separate
"register a media item" call, since `content` doesn't own media
metadata), the two ordered segments, and a `mn.processing.step.completed.v1`
outbox event with `step: "transcribe"`. `version` is a single monotonic
counter across every write to this media item's content, not per-step.

### 2. GetTranscript

```bash
grpcurl -plaintext -d '{"media_id": "'"$MEDIA_ID"'"}' \
  localhost:9095 media_notes.content.v1.ContentService/GetTranscript
```

```json
{
  "transcript": {
    "mediaId": "909bca0a-7457-4c2f-ad25-8857365d275d",
    "language": "en",
    "text": "Hello world. This is a test transcript.",
    "segments": [
      {"endMs": "1500", "speaker": "speaker_1", "text": "Hello world."},
      {"segmentIndex": 1, "startMs": "1500", "endMs": "4000", "speaker": "speaker_1", "text": "This is a test transcript."}
    ],
    "version": 1
  }
}
```

Note `segmentIndex: 0` and `startMs: "0"` are omitted from the first
segment — protobuf3 JSON drops zero-valued scalar fields, not a bug.

### 3. StoreSummary

Citations must reference segment indexes that already exist in the stored
transcript.

```bash
grpcurl -plaintext -d '{
  "idempotency_key": "doc-content-2",
  "media_id": "'"$MEDIA_ID"'",
  "workflow_id": "'"$WORKFLOW_ID"'",
  "attempt": 1,
  "summary_type": "short",
  "text": "A brief greeting and test.",
  "model": "gemini-2.5",
  "prompt_version": "v1",
  "sentences": [
    {"sentence_index": 0, "text": "The speaker greets the world.", "cited_segment_indexes": [0]},
    {"sentence_index": 1, "text": "They confirm this is a test.", "cited_segment_indexes": [1]}
  ]
}' localhost:9095 media_notes.content.v1.ContentService/StoreSummary
```

```json
{
  "version": {
    "mediaId": "909bca0a-7457-4c2f-ad25-8857365d275d",
    "version": 2,
    "updatedAt": "2026-08-16T17:21:29.237848Z"
  }
}
```

### 4. StoreKeywords

```bash
grpcurl -plaintext -d '{
  "idempotency_key": "doc-content-3",
  "media_id": "'"$MEDIA_ID"'",
  "workflow_id": "'"$WORKFLOW_ID"'",
  "attempt": 1,
  "keywords": [
    {"keyword": "greeting", "score": 0.92, "position": 0},
    {"keyword": "test", "score": 0.81, "position": 1}
  ]
}' localhost:9095 media_notes.content.v1.ContentService/StoreKeywords
```

`version` advances to `3`. `StoreKeywords` replaces the entire stored
keyword set each call — it is not additive.

### 5. StoreKeypoints

```bash
grpcurl -plaintext -d '{
  "idempotency_key": "doc-content-4",
  "media_id": "'"$MEDIA_ID"'",
  "workflow_id": "'"$WORKFLOW_ID"'",
  "attempt": 1,
  "keypoints": [
    {"point_index": 0, "text": "Speaker opens with a greeting and states this is a test.", "start_segment": 0, "end_segment": 1}
  ]
}' localhost:9095 media_notes.content.v1.ContentService/StoreKeypoints
```

`version` advances to `4`. `start_segment`/`end_segment` must both be
real segment indexes with `end_segment >= start_segment`.

### 6. StoreNotes

```bash
grpcurl -plaintext -d '{
  "idempotency_key": "doc-content-5",
  "media_id": "'"$MEDIA_ID"'",
  "workflow_id": "'"$WORKFLOW_ID"'",
  "attempt": 1,
  "format": "markdown",
  "body": "# Notes\n\n- Greeting\n- Test confirmation"
}' localhost:9095 media_notes.content.v1.ContentService/StoreNotes
```

`version` advances to `5`. A media item can hold more than one note
document — one per distinct `format`.

### 7. StoreSummaryAudioMetadata

Simulates what `conductor-worker` calls after writing a summary-audio
object to object storage — `content` never receives or stores the audio
bytes themselves.

```bash
grpcurl -plaintext -d '{
  "idempotency_key": "doc-content-6",
  "media_id": "'"$MEDIA_ID"'",
  "workflow_id": "'"$WORKFLOW_ID"'",
  "attempt": 1,
  "summary_type": "short",
  "object_key": "content/'"$MEDIA_ID"'/summary-audio/short.mp3",
  "mime_type": "audio/mpeg",
  "duration_ms": 8200,
  "voice": "en-US-Neural2-A"
}' localhost:9095 media_notes.content.v1.ContentService/StoreSummaryAudioMetadata
```

`version` advances to `6`.

### 8. GetContent

```bash
grpcurl -plaintext -d '{"media_id": "'"$MEDIA_ID"'"}' \
  localhost:9095 media_notes.content.v1.ContentService/GetContent
```

```json
{
  "content": {
    "mediaId": "909bca0a-7457-4c2f-ad25-8857365d275d",
    "transcript": {
      "mediaId": "909bca0a-7457-4c2f-ad25-8857365d275d",
      "language": "en",
      "text": "Hello world. This is a test transcript.",
      "segments": [
        {"endMs": "1500", "speaker": "speaker_1", "text": "Hello world."},
        {"segmentIndex": 1, "startMs": "1500", "endMs": "4000", "speaker": "speaker_1", "text": "This is a test transcript."}
      ],
      "version": 6
    },
    "summaries": [
      {
        "summaryType": "short",
        "text": "A brief greeting and test.",
        "model": "gemini-2.5",
        "promptVersion": "v1",
        "sentences": [
          {"text": "The speaker greets the world.", "citedSegmentIndexes": [0]},
          {"sentenceIndex": 1, "text": "They confirm this is a test.", "citedSegmentIndexes": [1]}
        ],
        "createdAt": "2026-08-16T17:21:29.237848Z"
      }
    ],
    "keywords": [
      {"keyword": "greeting", "score": 0.92},
      {"keyword": "test", "score": 0.81, "position": 1}
    ],
    "keypoints": [
      {"text": "Speaker opens with a greeting and states this is a test.", "endSegment": 1}
    ],
    "notes": [
      {"format": "markdown", "body": "# Notes\n\n- Greeting\n- Test confirmation", "createdAt": "2026-08-16T17:21:46.622948Z"}
    ],
    "summaryAudios": [
      {
        "summaryType": "short",
        "objectKey": "content/909bca0a-7457-4c2f-ad25-8857365d275d/summary-audio/short.mp3",
        "mimeType": "audio/mpeg",
        "durationMs": "8200",
        "voice": "en-US-Neural2-A",
        "status": "SUMMARY_AUDIO_STATUS_READY"
      }
    ],
    "version": 6
  }
}
```

`Content.version` is the same counter as every individual `Version`
response above — `6`, one increment per successful (non-replayed) write.

### 9. Watch the outbox reach Kafka

Every write above published one `mn.processing.step.completed.v1` record,
keyed by `media_id`, in the same transaction as its write:

```bash
docker exec kafka /opt/kafka/bin/kafka-console-consumer.sh \
  --bootstrap-server localhost:9092 --topic mn.processing.step.completed.v1 \
  --from-beginning --property print.key=true --max-messages 6 --timeout-ms 5000
```

```
909bca0a-...275d	{"step":"transcribe","attempt":1,"subtype":"","version":1,"event_id":"f7e81318-...","media_id":"909bca0a-...275d","workflow_id":"11111111-...1111"}
909bca0a-...275d	{"step":"summary","attempt":1,"subtype":"short","version":2,"event_id":"807cc71a-...","media_id":"909bca0a-...275d","workflow_id":"11111111-...1111"}
909bca0a-...275d	{"step":"keywords","attempt":1,"subtype":"","version":3,"event_id":"04369615-...","media_id":"909bca0a-...275d","workflow_id":"11111111-...1111"}
909bca0a-...275d	{"step":"keypoints","attempt":1,"subtype":"","version":4,"event_id":"e87cfb1a-...","media_id":"909bca0a-...275d","workflow_id":"11111111-...1111"}
909bca0a-...275d	{"step":"notes","attempt":1,"subtype":"markdown","version":5,"event_id":"fef16d37-...","media_id":"909bca0a-...275d","workflow_id":"11111111-...1111"}
909bca0a-...275d	{"step":"summary_audio","attempt":1,"subtype":"short","version":6,"event_id":"70a3985a-...","media_id":"909bca0a-...275d","workflow_id":"11111111-...1111"}
```

Payloads carry IDs, step, output subtype, durable version, and attempt —
never generated text, per `docs/services/content.md`.

## Error / edge cases

Every row below was run against the live service, continuing from the
golden path above (transcript already has segments `0` and `1`).

| Case | Call | Input | Result |
| --- | --- | --- | --- |
| Stale attempt | `StoreTranscript` with `attempt: 0` after `attempt: 1` already applied | new `idempotency_key`, `attempt: 0` | `FailedPrecondition` — `content: stale attempt` |
| Idempotent replay | `StoreTranscript` called again with `idempotency_key: "doc-content-1"` | identical request | Returns the **unchanged** version (`6`, not bumped) — a pure no-op |
| Citation to a nonexistent segment | `StoreSummary` | `cited_segment_indexes: [99]` | `InvalidArgument` — `content: citation references unknown segment` |
| Malformed UUID | `GetTranscript` | `media_id: "not-a-uuid"` | `InvalidArgument` — `media_id must be a UUID` |
| Invalid segment ordering | `StoreTranscript` | one segment with `end_ms: 100` before `start_ms: 500` | `InvalidArgument` — `content: invalid segment ordering` |

## Deletion participant role

`content` does not expose a deletion RPC — it only reacts to media's
`mn.media.deletion.requested.v1`, keyed by `media_id`. Publish one by
hand to exercise it (`conductor` doesn't exist yet, so nothing publishes
this automatically outside of `media`'s own `RequestDeletion` calls):

```bash
MEDIA_ID="909bca0a-7457-4c2f-ad25-8857365d275d"
DELETION_ID="33333333-3333-3333-3333-333333333333"
EVENT_ID=$(python3 -c "import uuid; print(uuid.uuid4())")
PAYLOAD="{\"event_id\":\"$EVENT_ID\",\"deletion_id\":\"$DELETION_ID\",\"media_id\":\"$MEDIA_ID\",\"owner_id\":\"44444444-4444-4444-4444-444444444444\"}"
echo "$MEDIA_ID|$PAYLOAD" | docker exec -i kafka /opt/kafka/bin/kafka-console-producer.sh \
  --broker-list localhost:9092 --topic mn.media.deletion.requested.v1 \
  --property "parse.key=true" --property "key.separator=|"
```

Within ~1s, `GetTranscript` and `GetContent` for that `media_id` both
return:

```
ERROR:
  Code: NotFound
  Message: content: not found
```

A further `StoreTranscript` call for the same `media_id` (even a brand
new idempotency key) is now rejected outright rather than silently
accepted and then deleted:

```
ERROR:
  Code: FailedPrecondition
  Message: content: media deletion pending
```

And `content` reported its own completion back to `media`, keyed by
`media_id`:

```bash
docker exec kafka /opt/kafka/bin/kafka-console-consumer.sh \
  --bootstrap-server localhost:9092 --topic mn.content.deletion.completed.v1 \
  --from-beginning --property print.key=true --max-messages 1 --timeout-ms 5000
```

```
909bca0a-7457-4c2f-ad25-8857365d275d	{"owner": "content", "status": "completed", "event_id": "f4b47357-24d2-43c9-83f4-48a9fda4aba5", "media_id": "909bca0a-7457-4c2f-ad25-8857365d275d", "deletion_id": "33333333-3333-3333-3333-333333333333"}
```

`media` does not consume this topic yet (see
[`docs/tests/media/manual.md`](../media/manual.md)'s own "not testable"
section) — this only proves `content`'s side of the contract.

## Not testable through gRPC

`content`'s deletion participant role (above) only arrives through Kafka,
never gRPC, matching `media`'s own `ApplyWorkflowStatus` and account-
deletion cascade — see
[`docs/tests/media/manual.md`](../media/manual.md) for the equivalent
pattern on the producing side.
