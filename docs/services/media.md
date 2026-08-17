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
ListMedia(ctx, ownerID, cursor, search) -> MediaPage
SignPlaybackURL(ctx, mediaID) -> SignedURL
RegisterDerivative(ctx, command) -> Derivative
ApplyWorkflowStatus(ctx, event) -> void
RequestDeletion(ctx, mediaID) -> DeletionOperation
UpdateMedia(ctx, mediaID, title, description) -> Media
RequestProcessing(ctx, mediaID, idempotencyKey, options, audioVoice) -> Media
```

`contracts/proto/media/v1/media.proto` serves Hermes and worker calls. Create
checks MIME/declared size, idempotency and three active sessions. Confirmation
reads authoritative object metadata, rejects missing/empty/oversize/key mismatch
objects, then atomically creates the processing request and outbox event.
Confirmation also accepts an optional `audio_voice`, which overrides
conductor-worker's default TTS voice for this processing request only; it has
no effect unless `generate_audio_summary` is among the selected options.
List is cursor-paginated and returns only lightweight fields; playback URL is
short-lived. List also accepts an optional `search`, a case-insensitive
substring match against title, applied server-side alongside the owner filter
before pagination.

`UpdateMedia` changes title and/or an optional free-text `description`; an
unset field is left unchanged. `RequestProcessing` starts a new processing
request for a media item that already has one — to generate a content type
that wasn't originally selected, or to regenerate one that was. It is only
accepted while the media item's status is `completed` or `failed`: at most
one processing request may be active per media item at a time, enforced by
locking the media row for the duration of the check-then-write rather than
by a database constraint (`processing_requests.status` never transitions
past `requested` in this service, so a status-scoped constraint there would
not express the invariant). On success it writes a new `processing_requests`
row (history accumulates; the table has no uniqueness constraint on
`media_id`) and publishes `mn.media.processing.requested.v1`, exactly as
`ConfirmUpload` does — conductor requires no changes to consume it.
Idempotent per caller idempotency key.

## Events

Publish `mn.media.processing.requested.v1` and
`mn.media.derivative.ready.v1`, both keyed by `media_id`. Consume
`mn.media.status.changed.v1`. Deletion hides media immediately, cancels uploads,
then removes only owned rows and exact object keys after required completions.

## Tests

Test limits, idempotent upload creation, authoritative confirmation, status
projection, pagination, signed URL expiry, deletion retries and object-key
enumeration. Verify no media bytes pass through gRPC, Kafka, logs or traces.


## Migrations

Flyway-managed (`services/media/migrations/V{n}__*.sql`, manual rollback
scripts under `services/media/rollback/`), currently:

- `V1__init.sql` — `media`, `upload_sessions`, `processing_requests`,
  `derivatives`, `media_deletions`, `inbox_events`, `outbox_events`.
  `processing_requests.media_id` was `UNIQUE`. The application locks the
  active sessions for one owner while creating a new session, counts them,
  and rejects a fourth — a partial unique index cannot express this
  three-session limit by itself.
- `V2__add_media_progress_version.sql` — `media.version`, a monotonic
  counter for the `mediaProgress` projection (ADR 0005).
- `V3__add_media_description.sql` — `media.description`, optional
  free-text.
- `V4__loosen_processing_requests_unique.sql` — drops
  `processing_requests`'s `UNIQUE(media_id)` (see `RequestProcessing`
  above) and adds `processing_requests.idempotency_key` (nullable, unique).
