# Service Database Migrations

Status: proposed implementation specification.

Each stateful Media Notes service must own one PostgreSQL database,
credential, migration directory, and migration history table. Services do
not share a database or a schema within a shared database: PostgreSQL
privileges, not naming conventions, enforce that a service credential
cannot even connect to another service's database.

| Service | Role | Database | Migration directory |
| --- | --- | --- | --- |
| `identity` | `identity` | `identity` | `services/identity/migrations` |
| `billing` | `billing` | `billing` | `services/billing/migrations` |
| `media` | `media` | `media` | `services/media/migrations` |
| `content` | `content` | `content` | `services/content/migrations` |
| `conductor` | `conductor` | `workflow` | `services/conductor/migrations` |

`hermes` and worker executors are stateless and do not own migrations.
Migration history tables (`flyway_schema_history`) live in each service's own
database, in its default `public` schema.

## Tooling

Migrations use [Flyway](https://flywaydb.org). Flyway is not a Go library, so
it runs as a separate step — a Docker container locally, a deploy step in
CI/CD — rather than being embedded in the service binary. A service checks at
startup that its migrations have already been applied (see
`internal/store.CheckMigrated` in `identity`) and fails fast if they have not,
rather than trying to migrate itself.

Flyway Community does not support automatic rollback (`flyway undo` requires
Flyway Teams). Destructive changes therefore ship as a new forward migration,
with an optional hand-maintained script under `rollback/` for
operators to apply manually with `psql` if needed.

## Create a migration

Use Flyway's versioned naming in the owning directory:

```text
V2__create_media.sql
```

Prefer transactional, backward-compatible changes. For destructive changes:

1. Deploy code that no longer depends on the old shape.
2. Observe the compatibility window.
3. Remove the old object in a later migration.

Do not edit an applied migration; Flyway checksums each applied file and
`migrate` fails if one has changed. Add a corrective migration instead.

## Implementation acceptance criteria

- Local initialization creates an isolated role and database per service and
  revokes unsafe default privileges.
- Production credentials are provisioned outside repository scripts.
- Tool versions are pinned and every service sequence is validated in CI.
- Integration tests exercise apply, status, and reapply; rollback is a
  manually tested, manually applied script, not an automated Flyway command.
- Tests prove that a non-owning role cannot connect to another service's
  database.
- A failed migration stops immediately and exposes actionable status.
