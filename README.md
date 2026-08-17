# media-notes

AI-powered media transcription and summarization platform that turns video or audio into timestamped transcripts, cited summaries, keywords, notes, and audio summaries.

## Architecture

Seven independently deployable services — a public GraphQL gateway, five
domain services, and a Python executor pool — communicating over gRPC and
Kafka. See [docs/architecture.md](docs/architecture.md) for the full diagram
and end-to-end flow, [docs/adr/](docs/adr/) for the accepted design
decisions, and [docs/services/](docs/services/) for each service's scope and
schema.

## System Design

### Web (React)

- **Media workspace** — drag-and-drop uploads with processing options and live credit-cost previews
- **Progress tracking** — adaptive GraphQL polling (ADR 0005) presents queued, processing, completed, and failed states
- **Synchronized results** — connects transcript timestamps and summary citations to the media player
- **Accounts and billing** — session auth against `identity` and credit/subscription status from `billing`

### hermes (public API)

- **GraphQL gateway** — the only service the web app talks to; owns authentication context, request limits, and response aggregation over the domain services

### Domain services (`identity`, `billing`, `media`, `content`, `conductor`, `conductor-worker`)

- **identity** — users, accounts, sessions
- **billing** — subscriptions, credit reservation/settlement, ledger
- **media** — uploads, source-media metadata, processing requests
- **content** — transcripts, summaries, keywords, keypoints, notes, summary audio
- **conductor** — workflow orchestration: dependencies, joins, retries, timeouts
- **conductor-worker** — Whisper transcription, Gemini enrichment, TTS, deployed as a Kafka consumer-group pool

## Tech Stack

| Component | Stack |
| --- | --- |
| Web | React Router v7, TypeScript, Tailwind CSS, shadcn/ui, Apollo Client |
| hermes, identity, billing, media, content, conductor | Go, gRPC, Kafka |
| conductor-worker | Python, OpenAI Whisper, Google Gemini |
| Data | PostgreSQL (one database per service), Kafka, Redis, MinIO/S3 |
| Tooling | Docker Compose, Make, Buf (protobuf), Flyway |

## Quick Start

```bash
make infra:up            # Postgres, Kafka, Kafka UI, Redis, MinIO
make identity:migrate && make billing:migrate && make media:migrate \
  && make content:migrate && make conductor:migrate
```

Run each service (each loads its own `.env`, copied from `.env.example` on
first run — see the relevant `make <service>:run` target):

```bash
make identity:run
make billing:run
make media:run
make content:run
make conductor:run
make hermes:run
make web:dev
```

Web: `http://localhost:5173` · hermes GraphQL: `http://localhost:8086/graphql`

Or bring everything up in containers: `docker compose --profile app up --build`.

<details>
<summary><b>Development commands</b></summary>

```bash
make help             # list every target across the root and per-service makefiles
make build             # build the web app and every v2 service
make lint              # lint the web app
make typecheck         # type-check the web app
make test              # run web and v2 service tests
make check              # everything CI runs
```

</details>
