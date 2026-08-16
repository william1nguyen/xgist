# Media

## Scope

Go gRPC + Kafka service owning upload sessions, source-media metadata, object
key inventory, derivative metadata, processing requests and media deletion.
It does not own transcript/content, workflow attempts or credit balance.

## Structure and data

```text
cmd/media/main.go
internal/upload/ internal/media/ internal/derivative/
internal/processing/ internal/deletion/
internal/grpc/ internal/events/ internal/objectstore/ internal/store/
migrations/
```

Tables: media, upload_sessions, derivatives, processing_requests,
media_deletions, outbox and inbox. Object keys are exact owned metadata, never
an untrusted prefix.

## Methods and contracts

```text
CreateUploadSession(ctx, command) -> UploadSession
ConfirmUpload(ctx, command) -> Media
GetMedia(ctx, mediaID) -> Media
ListMedia(ctx, ownerID, cursor) -> MediaPage
SignPlaybackURL(ctx, mediaID) -> SignedURL
RegisterDerivative(ctx, command) -> Derivative
ApplyWorkflowStatus(ctx, event) -> void
RequestDeletion(ctx, mediaID) -> DeletionOperation
```

`contracts/proto/media/v1/media.proto` serves Hermes and worker calls. Create
checks MIME/declared size, idempotency and three active sessions. Confirmation
reads authoritative object metadata, rejects missing/empty/oversize/key mismatch
objects, then atomically creates the processing request and outbox event.
List is cursor-paginated and returns only lightweight fields; playback URL is
short-lived.

## Events

Publish `mn.media.processing.requested.v1` and
`mn.media.derivative.ready.v1`, both keyed by `media_id`. Consume
`mn.media.status.changed.v1`. Deletion hides media immediately, cancels uploads,
then removes only owned rows and exact object keys after required completions.

## Tests

Test limits, idempotent upload creation, authoritative confirmation, status
projection, pagination, signed URL expiry, deletion retries and object-key
enumeration. Verify no media bytes pass through gRPC, Kafka, logs or traces.


## Initial migration: `00001_init.sql`

```sql
-- +goose Up
CREATE SCHEMA IF NOT EXISTS media;
CREATE TABLE media.media (id uuid PRIMARY KEY, owner_id uuid NOT NULL, title text NOT NULL, media_type text NOT NULL, object_key text NOT NULL UNIQUE, mime_type text NOT NULL, size_bytes bigint, duration_ms bigint, checksum text, status text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX media_owner_created ON media.media (owner_id, created_at DESC);
CREATE TABLE media.upload_sessions (id uuid PRIMARY KEY, media_id uuid NOT NULL UNIQUE REFERENCES media.media(id), owner_id uuid NOT NULL, object_key text NOT NULL UNIQUE, status text NOT NULL, expires_at timestamptz NOT NULL, completed_at timestamptz, idempotency_key text NOT NULL UNIQUE);
CREATE INDEX active_uploads_by_owner ON media.upload_sessions (owner_id, expires_at) WHERE status = 'active';
CREATE TABLE media.processing_requests (id uuid PRIMARY KEY, media_id uuid NOT NULL UNIQUE REFERENCES media.media(id), requested_by uuid NOT NULL, options jsonb NOT NULL, accepted_quote jsonb, workflow_id uuid, status text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE media.derivatives (id uuid PRIMARY KEY, media_id uuid NOT NULL REFERENCES media.media(id), derivative_type text NOT NULL, version integer NOT NULL, object_key text NOT NULL UNIQUE, mime_type text NOT NULL, width integer, height integer, size_bytes bigint, status text NOT NULL, UNIQUE (media_id, derivative_type, version));
CREATE TABLE media.inbox_events (event_id uuid PRIMARY KEY, topic text NOT NULL, processed_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE media.outbox_events (id uuid PRIMARY KEY, topic text NOT NULL, event_key text NOT NULL, payload jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), published_at timestamptz, attempts integer NOT NULL DEFAULT 0);
-- +goose Down
DROP SCHEMA media CASCADE;
```

The application locks the active sessions for one owner while creating a new
session, counts them, and rejects a fourth session. A partial unique index
cannot express this three-session limit by itself.
