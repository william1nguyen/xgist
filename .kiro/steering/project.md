# Project: MediaMind

Video/Audio transcription and AI summarization platform. Users upload media files, the system transcribes via Whisper, then runs AI processing (summarize, keywords, main ideas, notes, audio summary) via Gemini. Results are viewable with synced transcript player, citations, and AI insights.

## Bootstrapped With

Better T Stack — https://better-t-stack.amanv.dev

```bash
pnpm create better-t-stack@latest
# selections:
#   frontend: react-router
#   backend: hono (swap to fastify — see below)
#   db: drizzle + postgresql
#   auth: better-auth
#   payments: polar
#   runtime: bun
```

> After scaffolding: replace Hono with Fastify in `apps/server`. Better T Stack's structure stays the same.

## Monorepo Structure

```
apps/
  web/                    # React Router v7 + Tailwind
  server/                 # Fastify + oRPC + Drizzle
  worker/                 # Python AI worker (Whisper + Gemini)
packages/
  db/                     # Drizzle schema + migrations (PostgreSQL)
  types/                  # Shared TypeScript types (single source of truth)
  config/                 # Shared constants (credit costs, stream keys, etc.)
```

## Full Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React Router v7, TypeScript, Tailwind CSS, shadcn/ui |
| Backend | Fastify, oRPC, Bun |
| ORM | Drizzle ORM |
| Database | PostgreSQL (Docker) |
| Auth | Better Auth |
| Payments | Polar (sandbox) |
| Queue | Redis Streams |
| Storage | MinIO |
| AI Worker | Python, Whisper, Gemini API |
| Package manager | pnpm |

## Removed From Old Stack (never reintroduce)

- ~~Kafka~~ → Redis Streams
- ~~Elasticsearch~~ → PostgreSQL full-text search
- ~~Kibana~~ → removed
- ~~Keycloak~~ → Better Auth
