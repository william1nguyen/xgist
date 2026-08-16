# Identity

## Scope

Owns users, accounts, credentials, sessions, verification records, roles,
identity deletion operations, and identity outbox/inbox. It is Go + gRPC.
Only `hermes` normally calls it. Other services hold external `user_id` UUIDs.

## Structure

```text
cmd/identity/main.go
internal/app/              # startup, shutdown, health
internal/account/          # registration, profile, deletion state machine
internal/session/          # issuing, validation, revoke
internal/grpc/             # generated-server adapter and error mapping
internal/store/            # PostgreSQL repositories
internal/events/           # outbox, inbox, deletion consumer
migrations/
```

Dependencies point inward: gRPC/store/events depend on application packages;
application packages depend only on small repository interfaces.

## Data

| Table | Required fields |
| --- | --- |
| users | id, public profile, state, created_at |
| accounts | id, user_id, normalized identifier, credential reference |
| sessions | id, account_id, token_hash, expires_at, revoked_at |
| verification_records | id, opaque_hash, purpose, expires_at, consumed_at |
| user_roles | user_id, role |
| account_deletions | deletion_id, user_id, state, participant status |
| outbox, inbox | event/consumer deduplication state |

Raw password, provider secret and session token are never persisted or logged.
Sessions and identifiers need unique indexes; pending deletion needs an index
for reconciliation.

## Application API

```text
Register(ctx, RegisterCommand) -> Account
Authenticate(ctx, AuthenticateCommand) -> Session
ValidateSession(ctx, token) -> Principal
RevokeSession(ctx, sessionID) -> void
GetUser(ctx, userID) -> User
UpdateUser(ctx, UpdateUserCommand) -> User
RequestDeletion(ctx, userID, idempotencyKey) -> DeletionOperation
RecordDeletionCompletion(ctx, deletionID, owner) -> void
GetDeletion(ctx, deletionID) -> DeletionOperation
```

The authentication mechanism (password/OIDC/magic link/MFA) is intentionally
unselected; choose it before freezing request fields. Validation rejects expired,
revoked, and deletion-pending accounts. Revoke and deletion requests are
idempotent.

## gRPC contract

Create `contracts/proto/identity/v1/identity.proto`, package
`media_notes.identity.v1`:

```text
IdentityService:
  RegisterAccount, Authenticate, ValidateSession, RevokeSession
  GetUser, UpdateUser
  RequestAccountDeletion, GetAccountDeletionStatus
```

Mutation requests contain a caller idempotency key. Responses include only
public account data and stable IDs; the authentication response may contain an
opaque token only at the Hermes boundary. Caller identity, correlation ID and
trace context use gRPC metadata.

## Deletion flow

```text
active -> deletion_pending -> tombstoned
         | revoke all sessions + write outbox atomically
         v
mn.identity.account.deletion.requested.v1 (key: user_id)
         v
media/content/conductor/billing completion events
```

The first request records every required participant. Duplicate requests return
the same operation. Each completion is unique by deletion ID and owner.
A bounded reconciler republishes missing work with jittered capped retries;
partial failure never restores access. Retain the tombstone for 90 days.

## Runtime and tests

Expose HTTP `/health/live` and `/health/ready`, plus a separate gRPC listener.
Ready only after migrations and database connectivity. Shutdown marks unready,
stops admission, cancels workers and closes within a deadline.

Unit-test normalization, state transitions, expiry/revocation and idempotency.
Integration-test migrations, unique constraints, outbox atomicity, duplicate or
reordered completions, restart after publish failure, health and shutdown.
