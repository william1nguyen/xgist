# Service Database Migrations

Status: proposed implementation specification.

Each stateful Media Notes 2 service must own one PostgreSQL schema, credential,
migration directory, and migration version table.

| Service | Role | Schema | Migration directory |
| --- | --- | --- | --- |
| `identitysvc` | `identitysvc` | `identity` | `services/identitysvc/migrations` |
| `billingsvc` | `billingsvc` | `billing` | `services/billingsvc/migrations` |
| `mediasvc` | `mediasvc` | `media` | `services/mediasvc/migrations` |
| `contentsvc` | `contentsvc` | `content` | `services/contentsvc/migrations` |
| `conductorsvc` | `conductorsvc` | `workflow` | `services/conductorsvc/migrations` |

`hermes` and worker executors are stateless and do not own migrations.
Migration version tables live inside the owning schema. PostgreSQL privileges,
not naming conventions, enforce that a service credential cannot create
objects in another service schema.

## Create a migration

Use sequential five-digit versions in the owning directory:

```text
00002_create_media.sql
```

Every SQL file contains Goose `Up` and `Down` sections. Prefer transactional,
backward-compatible changes. For destructive changes:

1. Deploy code that no longer depends on the old shape.
2. Observe the compatibility window.
3. Remove the old object in a later migration.

Do not edit an applied migration. Add a corrective migration instead.

## Implementation acceptance criteria

- Local initialization creates isolated roles and schemas and revokes unsafe
  public-schema privileges.
- Production credentials are provisioned outside repository scripts.
- Tool versions are pinned and every service sequence is validated in CI.
- Integration tests exercise apply, status, rollback, and reapply.
- Tests prove that a non-owning role cannot apply another service's migration.
- A failed migration stops immediately and exposes actionable status.
- Rollback is explicit, service-scoped, and tested before destructive changes
  are accepted.
