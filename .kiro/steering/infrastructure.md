# Infrastructure

## Docker Compose (dev)

File: `docker-compose.yml` in project root.

Services:
- `postgres` — image `postgres:16`, port `5432`
- `redis` — image `redis:7-alpine`, port `6379`
- `minio` — image `minio/minio`, ports `9000` (API) + `9001` (console)
- `worker` — builds from `apps/worker/Dockerfile`

Do NOT add kafka, elasticsearch, kibana, or keycloak.

## Environment Variables

### `apps/server/.env`


### `apps/web/.env`


### `apps/worker/.env`


## Redis Stream Keys

| Key | Direction | Consumer Group |
|-----|-----------|----------------|
| `stream:jobs` | Fastify to Worker | `workers` |
| `stream:results` | Worker to Fastify | `server` |

## MinIO Init (on server startup)

On startup, `apps/server/src/lib/minio.ts` must:
1. Create bucket `media` if not exists, set public read policy
2. Create bucket `summaries` if not exists, set public read policy

## pnpm Workspace

`pnpm-workspace.yaml` includes `apps/*` and `packages/*`.

Root `package.json` scripts:
- `pnpm dev` — run all apps concurrently
- `pnpm db:push` — drizzle-kit push
- `pnpm db:migrate` — drizzle-kit migrate
- `pnpm db:studio` — drizzle-kit studio
