# identity — Manual gRPC Test Guide

Manual test script for `media_notes.identity.v1.IdentityService`, using
`grpcurl` or `grpcui` against a running `identity` instance. Every request
below was actually run against the service and the response shown is real
output, not illustrative.

## Prerequisites

```bash
make infra:up                       # Postgres, Kafka, MinIO, Redis
# first time only: provision the identity role/database if the Postgres
# volume predates it (deploy/postgres/init runs only on a fresh volume)
docker exec -i postgres psql -U admin -d media_notes < deploy/postgres/init/01-identity-role.sql
make identity:migrate
```

Kafka has `KAFKA_AUTO_CREATE_TOPICS_ENABLE: "false"`, and the outbox
publisher sets `AllowAutoTopicCreation: false` too, so a topic that was
never explicitly created makes every outbox record for it fail forever
with `Unknown Topic Or Partition` until the topic exists. Run this once
per fresh Kafka volume (idempotent — safe to re-run):

```bash
make infra:kafka-topics
make identity:run                   # or: go run ./cmd/api from services/identity
```

Health check: `curl http://localhost:8081/health/ready` → `200`.

Reflection UI: `grpcui -plaintext localhost:9091` (default port 8090), or
use `grpcurl -plaintext localhost:9091 list media_notes.identity.v1.IdentityService`
from the CLI.

## Golden path

Run in order — each step's output feeds the next.

### 1. RegisterAccount

```bash
grpcurl -plaintext -d '{
  "idempotency_key": "doc-test-1",
  "email": "docs-test@example.com",
  "password": "S3cret!234",
  "name": "Docs Tester"
}' localhost:9091 media_notes.identity.v1.IdentityService/RegisterAccount
```

```json
{
  "user": {
    "id": "0d36ff43-774c-4433-8d91-1122bddc9185",
    "email": "docs-test@example.com",
    "name": "Docs Tester",
    "state": "ACCOUNT_STATE_ACTIVE",
    "createdAt": "2026-08-16T16:30:21.501170Z"
  }
}
```

Keep `user.id` — needed for every later step.

### 2. Authenticate

```bash
grpcurl -plaintext -d '{
  "idempotency_key": "doc-test-2",
  "email": "docs-test@example.com",
  "password": "S3cret!234"
}' localhost:9091 media_notes.identity.v1.IdentityService/Authenticate
```

```json
{
  "user": { "...": "same as above" },
  "sessionToken": "506a404e532df5709f06041a205309e16119d9fcc73c71a770c36b67fcdadb62",
  "expiresAt": "2026-09-15T16:30:26.781453Z"
}
```

Keep `sessionToken`.

### 3. ValidateSession

```bash
grpcurl -plaintext -d '{"session_token": "<sessionToken>"}' \
  localhost:9091 media_notes.identity.v1.IdentityService/ValidateSession
```

```json
{
  "user": { "...": "same as above" },
  "sessionId": "39a6d85c-0c5c-4d99-a0c7-1fe4b67518fe"
}
```

Keep `sessionId`.

### 4. GetUser

```bash
grpcurl -plaintext -d '{"user_id": "<user.id>"}' \
  localhost:9091 media_notes.identity.v1.IdentityService/GetUser
```

Returns the same `user` object.

### 5. UpdateUser

```bash
grpcurl -plaintext -d '{
  "idempotency_key": "doc-test-3",
  "user_id": "<user.id>",
  "name": "Docs Tester Updated"
}' localhost:9091 media_notes.identity.v1.IdentityService/UpdateUser
```

`user.name` changes to `"Docs Tester Updated"`; `email` and `state` unchanged.
`image_url` is left unset here since the field is `optional` — omit it to
leave it unchanged.

### 6. RevokeSession

```bash
grpcurl -plaintext -d '{"session_id": "<sessionId>"}' \
  localhost:9091 media_notes.identity.v1.IdentityService/RevokeSession
```

Returns `{}`. Re-running `ValidateSession` with the same `sessionToken` now
fails:

```
ERROR:
  Code: Unauthenticated
  Message: session: invalid or expired token
```

### 7. RequestAccountDeletion

```bash
grpcurl -plaintext -d '{
  "idempotency_key": "doc-test-4",
  "user_id": "<user.id>"
}' localhost:9091 media_notes.identity.v1.IdentityService/RequestAccountDeletion
```

```json
{
  "operation": {
    "deletionId": "5718c1b6-af85-4a1d-9551-139051b30b74",
    "userId": "0d36ff43-774c-4433-8d91-1122bddc9185",
    "state": "DELETION_STATE_PENDING",
    "createdAt": "2026-08-16T16:30:44.296735Z"
  }
}
```

`GetUser` immediately after this shows `state: "ACCOUNT_STATE_DELETION_PENDING"`.

### 8. GetAccountDeletionStatus

```bash
grpcurl -plaintext -d '{"deletion_id": "<deletionId>"}' \
  localhost:9091 media_notes.identity.v1.IdentityService/GetAccountDeletionStatus
```

Stays `DELETION_STATE_PENDING` in this environment: the operation only
completes once `media`, `content`, `conductor`, and `billing` each report
completion on `IDENTITY_DELETION_COMPLETION_TOPICS` (ADR 0006). `content` and
`conductor` don't exist yet, so this operation is expected to never
complete today — that is not a bug.

## Error / edge cases

Every row below was run against the live service.

| Case | Call | Input | Result |
| --- | --- | --- | --- |
| Duplicate email | `RegisterAccount` | Same `email` as an existing account | `AlreadyExists` — `account: email already registered` |
| Wrong password | `Authenticate` | Correct email, wrong password | `Unauthenticated` — `account: invalid credentials` |
| Unknown email | `Authenticate` | Email never registered | `Unauthenticated` — `account: invalid credentials` (identical message — does not leak whether the email exists) |
| Expired/revoked token | `ValidateSession` | A revoked `session_token` | `Unauthenticated` — `session: invalid or expired token` |
| Malformed UUID | `GetUser` | `user_id: "not-a-uuid"` | `InvalidArgument` — `user_id must be a UUID` |
| Missing email/password | `RegisterAccount` | `email: ""`, `password: ""` | `InvalidArgument` — `email and password are required` |
| Duplicate deletion request | `RequestAccountDeletion` | Call twice with the same `user_id` | Second call returns the **same** `deletion_id` (idempotent by `user_id`; `idempotency_key` is accepted but not currently enforced) |
| Unknown deletion id | `GetAccountDeletionStatus` | Random UUID | `NotFound` — `account: deletion operation not found` |

## Not testable through gRPC

- The actual cross-service deletion completion (media/content/conductor
  reporting back) is Kafka-only; nothing to call directly. Watch
  `mn.identity.account.deletion.requested.v1` on Kafka UI
  (`http://localhost:8080`) to see the outbox event `identity` publishes
  after step 7.
- `identity`'s outbox relay ticks every 2s; the Kafka event may lag the
  gRPC response by up to that interval.
