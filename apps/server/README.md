## Introduction

This is a Typescript Node.js template. It can be used to bootstrap bots, workers, or web servers.

## Features

- `dotenv`
- Lint/format code with `eslint` and `prettier`
- Auto-lint on git stage with `lint-staged`
- Lint commit messages using [`Conventional Commit specification`](https://www.conventionalcommits.org/en/v1.0.0/)
- Log with `pino`
- Monitor with [`sentry`](https://sentry.io/)
- Deploy with `docker`

## How to run in `development`

1. Clone the repo
2. Rename `.env.example` to `.env` and change the settings
3. Run `npm ci` to install all dependencies
4. Run `npm run dev`

## Environment variables

The server validates environment variables in `src/env.ts`. For production-like stability of the Whisper client, the circuit breaker and retry behavior can be tuned via the following optional variables (defaults are shown):

```
# Whisper client circuit breaker & retry configuration
WHISPER_CB_FAILURE_THRESHOLD=5     # number of consecutive failures before opening the circuit
WHISPER_CB_OPEN_MS=30000           # duration (ms) to keep circuit open before allowing a half-open probe
WHISPER_CB_RETRIES=3               # per-request retry attempts when circuit is closed
WHISPER_CB_BACKOFF_MS=500          # base backoff (ms); effective backoff uses exponential strategy
```

These settings work together with the HTTP client to provide resilience against transient Whisper service failures, while fast-failing during prolonged outages.

### Monitoring (Prometheus & Sentry)

- Metrics endpoint (Prometheus):
  - `GET /metrics` (no auth) exposes default Node metrics and custom HTTP request counters/histograms.
- Sentry (optional): set the following to enable
  - `SENTRY_DSN` (string)
  - `SENTRY_TRACES_SAMPLE_RATE` (float, e.g. `0.1`)
