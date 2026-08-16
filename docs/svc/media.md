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
