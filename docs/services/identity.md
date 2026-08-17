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

Create `contracts/proto/media_notes/identity/v1/identity.proto`, package
`media_notes.identity.v1` (the directory mirrors the full package name,
including the `media_notes` segment, per ADR 0002 and Buf's
`PACKAGE_DIRECTORY_MATCH` lint rule):

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


## Initial migration: `V1__init.sql`

identity has its own PostgreSQL database (not just its own schema in a
shared database — see `docs/database-migrations.md`), so tables live in the
default `public` schema, unqualified. Migrations use Flyway; see
`docs/database-migrations.md` for tooling and rollback conventions.

```sql
CREATE TYPE account_state AS ENUM ('active', 'deletion_pending', 'tombstoned');
CREATE TABLE users (
  id uuid PRIMARY KEY, email text NOT NULL, normalized_email text NOT NULL UNIQUE,
  name text, image_url text, email_verified_at timestamptz,
  state account_state NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE accounts (
  id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id),
  provider text NOT NULL, provider_account_id text NOT NULL,
  credential_hash bytea, created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_account_id)
);
CREATE TABLE sessions (
  id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id),
  token_hash bytea NOT NULL UNIQUE, expires_at timestamptz NOT NULL,
  revoked_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sessions_active_by_user ON sessions (user_id, expires_at)
  WHERE revoked_at IS NULL;
CREATE TABLE verification_records (
  id uuid PRIMARY KEY, identifier text NOT NULL, value_hash bytea NOT NULL UNIQUE,
  purpose text NOT NULL, expires_at timestamptz NOT NULL, consumed_at timestamptz
);
CREATE TABLE user_roles (user_id uuid NOT NULL REFERENCES users(id), role text NOT NULL, PRIMARY KEY (user_id, role));
CREATE TABLE account_deletions (
  deletion_id uuid PRIMARY KEY, user_id uuid NOT NULL UNIQUE REFERENCES users(id),
  state text NOT NULL, participants jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz
);
CREATE TABLE inbox_events (consumer_name text NOT NULL, event_id uuid NOT NULL, received_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (consumer_name, event_id));
CREATE TABLE outbox_events (id uuid PRIMARY KEY, topic text NOT NULL, event_key text NOT NULL, payload jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), published_at timestamptz, attempts integer NOT NULL DEFAULT 0);
```

Rollback is a hand-maintained script under `rollback/`, applied
manually with `psql` — Flyway Community has no automatic undo.
