# media — Manual gRPC Test Guide

Manual test script for `media_notes.media.v1.MediaService`, using
`grpcurl` or `grpcui` against a running `media` instance. Every request
below was actually run against the service — including a real `PUT` to
MinIO — and the response shown is real output, not illustrative.

## Prerequisites

```bash
make infra:up
# first time only: provision the media role/database if the Postgres
# volume predates it
docker exec -i postgres psql -U admin -d media_notes < deploy/postgres/init/03-media-role.sql
make media:migrate
```

Kafka has `KAFKA_AUTO_CREATE_TOPICS_ENABLE: "false"`, and the outbox
publisher sets `AllowAutoTopicCreation: false` too, so a topic that was
never explicitly created makes every outbox record for it fail forever
with `Unknown Topic Or Partition` (retried every 2s, incrementing
`attempts`, never marked published) until the topic exists. Run this once
per fresh Kafka volume (idempotent — safe to re-run):

```bash
make infra:kafka-topics
```

`media` also needs its MinIO bucket to exist (nothing auto-creates it):

```bash
docker exec minio sh -c "mc alias set local http://localhost:9000 minioadmin minioadmin && mc mb -p local/media"
```

```bash
make media:run                      # or: go run ./cmd/api from services/media
```

Health check: `curl http://localhost:8083/health/ready` → `200`.

Reflection UI: `grpcui -plaintext localhost:19095`, or
`grpcurl -plaintext localhost:19095 list media_notes.media.v1.MediaService`.

## Golden path

Run in order — each step's output feeds the next. `CreateUploadSession`
and `SignPlaybackUrl` return URLs pointing at `localhost:9002`
(MinIO's host-mapped port); that only resolves from the host machine, not
from inside another container.

### 1. CreateUploadSession

```bash
grpcurl -plaintext -d '{
  "idempotency_key": "doc-media-1",
  "owner_id": "33333333-3333-3333-3333-333333333333",
  "title": "Docs test video",
  "mime_type": "video/mp4",
  "declared_size_bytes": 1048576
}' localhost:19095 media_notes.media.v1.MediaService/CreateUploadSession
```

```json
{
  "session": {
    "id": "a92dce2f-a9a8-46d6-8f85-d7cb709af35f",
    "mediaId": "d90a250a-4029-4190-a868-72f496c7635e",
    "ownerId": "33333333-3333-3333-3333-333333333333",
    "objectKey": "media/d90a250a-4029-4190-a868-72f496c7635e/source",
    "uploadUrl": "http://localhost:9002/media/media/d90a250a-4029-4190-a868-72f496c7635e/source?X-Amz-Algorithm=...",
    "status": "UPLOAD_SESSION_STATUS_ACTIVE",
    "expiresAt": "2026-08-16T17:31:13.389487Z"
  }
}
```

`CreateUploadSession` already created a `media` row (`status:
MEDIA_STATUS_PENDING_UPLOAD`, not visible through `GetMedia` yet — see
step 3) even though nothing has been uploaded. Keep `session.id` and
`session.mediaId`.

### 2. Upload the object to MinIO

Not a gRPC call — `PUT` real bytes to `uploadUrl` directly (any file works
for a manual test; a real deployment enforces MIME/size limits on
confirmation, not on the PUT itself):

```bash
curl -X PUT "<uploadUrl>" --data-binary @/bin/ls -H "Content-Type: video/mp4"
```

Expect `200`.

### 3. ConfirmUpload

```bash
grpcurl -plaintext -d '{
  "idempotency_key": "doc-media-2",
  "upload_session_id": "<session.id>",
  "options": ["transcribe", "summarize"]
}' localhost:19095 media_notes.media.v1.MediaService/ConfirmUpload
```

```json
{
  "media": {
    "id": "d90a250a-4029-4190-a868-72f496c7635e",
    "ownerId": "33333333-3333-3333-3333-333333333333",
    "title": "Docs test video",
    "mediaType": "MEDIA_TYPE_VIDEO",
    "mimeType": "video/mp4",
    "sizeBytes": "154208",
    "status": "MEDIA_STATUS_PROCESSING",
    "createdAt": "2026-08-16T16:31:13.373673Z",
    "updatedAt": "2026-08-16T16:31:21.259127Z"
  }
}
```

`sizeBytes` and `mimeType` come from MinIO's authoritative object metadata
(`HeadObject`), not from the declared values in step 1 — confirm they
match what you actually uploaded. This step also atomically created a
`processing_requests` row and published `mn.media.processing.requested.v1`
to the outbox (visible on Kafka UI, `http://localhost:8080`, within ~2s).

### 4. GetMedia

```bash
grpcurl -plaintext -d '{"media_id": "<media.id>"}' \
  localhost:19095 media_notes.media.v1.MediaService/GetMedia
```

Same `media` object as step 3. `thumbnailUrl` is absent — no derivative
registered yet.

### 5. ListMedia

```bash
grpcurl -plaintext -d '{"owner_id": "33333333-3333-3333-3333-333333333333", "page_size": 20}' \
  localhost:19095 media_notes.media.v1.MediaService/ListMedia
```

`items` contains the one media item; `nextCursor` is absent (fewer items
than `page_size`).

### 6. RegisterDerivative

Simulates what `conductor-worker` calls after writing a thumbnail object:

```bash
grpcurl -plaintext -d '{
  "idempotency_key": "doc-media-3",
  "media_id": "<media.id>",
  "derivative_type": "DERIVATIVE_TYPE_THUMBNAIL",
  "version": 1,
  "object_key": "media/<media.id>/thumbnail/v1.webp",
  "mime_type": "image/webp",
  "width": 320,
  "height": 180,
  "size_bytes": 4096
}' localhost:19095 media_notes.media.v1.MediaService/RegisterDerivative
```

```json
{
  "derivative": {
    "id": "048449a3-5367-4776-99bd-e2339be402cc",
    "mediaId": "d90a250a-4029-4190-a868-72f496c7635e",
    "derivativeType": "DERIVATIVE_TYPE_THUMBNAIL",
    "version": 1,
    "mimeType": "image/webp",
    "width": 320,
    "height": 180,
    "sizeBytes": "4096",
    "status": "DERIVATIVE_STATUS_READY"
  }
}
```

Note: `RegisterDerivative` does not check that the object actually exists
in MinIO — that check is `conductor-worker`'s job before it calls this
RPC, matching who owns writing the bytes. For a fully realistic manual
test, also `PUT` a dummy object to that `object_key` so the signed URL in
the next step actually resolves.

### 7. GetMedia again

```bash
grpcurl -plaintext -d '{"media_id": "<media.id>"}' \
  localhost:19095 media_notes.media.v1.MediaService/GetMedia
```

`thumbnailUrl` is now populated (a signed MinIO GET URL, 15-minute TTL by
default).

### 8. SignPlaybackUrl

```bash
grpcurl -plaintext -d '{"media_id": "<media.id>"}' \
  localhost:19095 media_notes.media.v1.MediaService/SignPlaybackUrl
```

```json
{
  "url": "http://localhost:9002/media/media/d90a250a-4029-4190-a868-72f496c7635e/source?X-Amz-Algorithm=...",
  "expiresAt": "2026-08-16T16:46:35.590821Z"
}
```

`curl -I "<url>"` should return `200` and the bytes uploaded in step 2.

### 9. RequestDeletion

```bash
grpcurl -plaintext -d '{
  "idempotency_key": "doc-media-4",
  "media_id": "<media.id>"
}' localhost:19095 media_notes.media.v1.MediaService/RequestDeletion
```

```json
{
  "operation": {
    "deletionId": "c33182ce-e367-48f4-8000-a0c513dbfa5a",
    "mediaId": "d90a250a-4029-4190-a868-72f496c7635e",
    "state": "DELETION_STATE_PENDING",
    "createdAt": "2026-08-16T16:31:41.126520Z"
  }
}
```

This call already deleted `media`'s own owned objects (source +
thumbnail) and child rows (`upload_sessions`, `derivatives`,
`processing_requests`) synchronously before returning — it does not wait
for step 10 to converge.

### 10. GetDeletionStatus

```bash
grpcurl -plaintext -d '{"deletion_id": "<deletionId>"}' \
  localhost:19095 media_notes.media.v1.MediaService/GetDeletionStatus
```

Stays `DELETION_STATE_PENDING` in this environment: it only completes once
both `content` and `conductor` report completion (ADR 0006), and neither
exists yet. Expected, not a bug.

### 11. GetMedia / ListMedia after deletion

```bash
grpcurl -plaintext -d '{"media_id": "<media.id>"}' \
  localhost:19095 media_notes.media.v1.MediaService/GetMedia
```

```
ERROR:
  Code: NotFound
  Message: media: not found
```

```bash
grpcurl -plaintext -d '{"owner_id": "33333333-3333-3333-3333-333333333333"}' \
  localhost:19095 media_notes.media.v1.MediaService/ListMedia
```

Returns `{}` — the item is excluded immediately, per ADR 0006.

## Error / edge cases

Every row below was run against the live service.

| Case | Call | Input | Result |
| --- | --- | --- | --- |
| Unsupported MIME type | `CreateUploadSession` | `mime_type: "application/zip"` | `InvalidArgument` — `upload: unsupported mime type: application/zip` |
| Declared size over the limit | `CreateUploadSession` | `declared_size_bytes: 999999999999` | `InvalidArgument` — `upload: declared size exceeds the maximum` |
| Confirm without uploading | `ConfirmUpload` on a session whose object was never `PUT` | — | `FailedPrecondition` — `upload: object missing` |
| Fourth active session for one owner | `CreateUploadSession` × 4, same `owner_id`, never confirmed | — | 4th call: `FailedPrecondition` — `upload: too many active upload sessions` (ADR 0004's 3-session cap) |
| Idempotent replay | `CreateUploadSession` called twice with the same `idempotency_key` | — | Second call returns the **identical** `session.id` — no second session created |
| Malformed UUID | Any RPC | e.g. `media_id: "not-a-uuid"` | `InvalidArgument` — `media_id must be a UUID` |

## Not testable through gRPC

`ApplyWorkflowStatus` (projecting `conductor`'s workflow state into
`media.status`) is intentionally **not** a gRPC method — it only arrives
through `mn.media.status.changed.v1`, consumed by `media`. `conductor`
doesn't exist yet, so nothing publishes to this topic today. To exercise
it by hand, publish a message shaped like:

```json
{"event_id": "<uuid>", "media_id": "<media.id>", "status": "completed"}
```

to `mn.media.status.changed.v1` (Kafka UI, `http://localhost:8080`, or
`kcat`), then re-run `GetMedia` and check `status`.

Similarly, `media`'s participation in **account** deletion (cascading
`mn.identity.account.deletion.requested.v1` into a `RequestDeletion` for
every media item owned by that account, then reporting completion back to
`identity` on `mn.media.deletion.completed.v1`) only triggers when
`identity`'s `RequestAccountDeletion` publishes that event — see
[`docs/tests/identity/manual.md`](../identity/manual.md) step 7. Run that
flow first, then watch `mn.media.deletion.completed.v1` on Kafka UI to see
`media` report back.
