# Hermes

## Scope

Go GraphQL gateway; owns the public schema, authentication context, request
limits, batching and response aggregation. It owns no domain records or schema.

## Structure

```text
cmd/hermes/main.go
internal/graphql/           # schema, resolvers, input/output mapping
internal/auth/              # bearer/cookie extraction, identity client
internal/clients/           # narrow generated gRPC client wrappers
internal/batching/          # request-scoped loaders
internal/http/              # GraphQL, health, middleware
internal/limits/            # body size and rate-limit policy
```

Resolvers never access a database owned by another service. Client wrappers set
deadlines, attach metadata and map safe downstream errors.

## Resolver API

```text
register, login, logout, me, requestAccountDeletion
createUploadSession, confirmUpload, updateMedia, requestProcessing
mediaList, mediaDetail
contentDetail, processingStatus
quote, priceCatalog, billingSummary, subscriptionCheckout
draftAudioScript, generateStandaloneAudio, audioJob, audioJobs
```

Authenticate once per request through Identity. Pass principal, request ID and
trace context in gRPC metadata. Every read that returns a user-owned resource
must verify ownership from the owning service response.

`confirmUpload` takes an optional `audioVoice`, forwarded to media's
`ConfirmUpload` unchanged; it only affects processing when `options` includes
`generate_audio_summary`. `mediaList` takes an optional `search`, forwarded to
media's `ListMedia` as a server-side case-insensitive title substring match —
never filter an already-fetched page client-side instead.

`updateMedia` and `requestProcessing` both take a bare `id`/`mediaId` with no
session or upload context to scope them, so each resolver fetches the media
item via `GetMedia` and compares owner before mutating — the same
ownership-verification pattern `mediaDetail`/`contentDetail` already use, per
the "never accepted from query input" rule above. `requestProcessing`
forwards to media's `RequestProcessing`, which rejects with
`FAILED_PRECONDITION` unless the media item's status is already `COMPLETED`
or `FAILED` (at most one processing request active per media item at a
time) — surfaced automatically via the existing gRPC-code-to-GraphQL-error
mapping, no hermes-specific handling needed.

**Media recommendations (planned).** hermes has no ranking or
recommendation query today. The web client's media-detail "Recommended"
shelf is a placeholder that pages through the caller's own `mediaList` and
shuffles it client-side. A real `recommendedMedia` query — likely backed by
watch/generation history and, eventually, cross-user signals — is future
work; it is not scheduled yet and has no owning service decided.

**Standalone audio generation.** `draftAudioScript(description, idempotencyKey)`
and `generateStandaloneAudio(text, voice, idempotencyKey)` create a
generating `AudioJob` (owned by content, not media — no `media_id`
involved) and return immediately; poll `audioJob(id)` or list
`audioJobs(kind, cursor, pageSize)` for the `generating`/`completed`/
`failed` result. `audioJobs` defaults `kind` to `"audio"` (finished
artifacts), since `"script"` jobs are an intermediate step the "chat with
AI" flow polls internally, not something the Audio list shows. Ownership
is verified by comparing the job's `userId` to the caller, the same
pattern every other resolver here uses since content carries no auth
context of its own. See `docs/services/worker.md`'s "Standalone audio
generation" section for the worker/content side. Not yet wired to
billing — no quote, no credit reservation.

## Control flow

```text
HTTP -> body/auth/rate middleware -> resolver
     -> bounded parallel gRPC reads -> GraphQL response
```

Keep the GraphQL body limit at 1 MiB. Apply ADR 0004 operation limits, including
authentication attempts. Batch only independent read calls and only within one
request. Do not cache domain data without measurements.

## Failure and tests

Use downstream deadlines below the remaining request deadline. A dependency
failure is surfaced as a safe GraphQL error; never leak transport/internal
details. Health is operational only. Test auth propagation, authorization,
per-operation limits, ownership filtering, partial aggregation and cancelled
requests.
