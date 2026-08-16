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
createUploadSession, confirmUpload, mediaList, mediaDetail
contentDetail, processingStatus
quote, billingSummary, subscriptionCheckout
```

Authenticate once per request through Identity. Pass principal, request ID and
trace context in gRPC metadata. Every read that returns a user-owned resource
must verify ownership from the owning service response.

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
