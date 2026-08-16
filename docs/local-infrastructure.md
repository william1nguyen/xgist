# Local Infrastructure

Status: proposed implementation specification.

The local development profile provides PostgreSQL, Redis, MinIO, and Kafka
through Docker Compose.

## Required topology

| Service | Host connection | Container connection | Local credentials |
| --- | --- | --- | --- |
| PostgreSQL | `localhost:5432` | `postgres:5432` | `admin` / `password` |
| Redis | `localhost:6379` | `redis:6379` | password `redisadmin` |
| MinIO API | `localhost:9002` | `minio:9000` | `minioadmin` / `minioadmin` |
| MinIO console | `http://localhost:9001` | `minio:9001` | `minioadmin` / `minioadmin` |
| Kafka | `localhost:9092` | `kafka:29092` | none |

Kafka may run as one combined KRaft broker/controller locally. Plaintext
listeners and default credentials are local-only and must not be reused in
deployed environments.

## Implementation acceptance criteria

- Start, status, logs, stop, and purge commands are documented and scoped to
  this Compose project.
- Startup waits for bounded health checks and reports a failing dependency.
- Credentials are overridable without committing environment files.
- Purge removes only project-owned containers and volumes; it must not run
  global Docker prune commands.
- Port conflicts and volume initialization behavior are documented.
