# billing — Manual gRPC Test Guide

Manual test script for `media_notes.billing.v1.BillingService`, using
`grpcurl` or `grpcui` against a running `billing` instance. Every request
below was actually run against the service and the response shown is real
output, not illustrative.

`billing` intentionally exposes only two RPCs over gRPC: `GetQuote` and
`GetBillingSummary`. Credit reservation and settlement are workflow
mutations that only enter through Kafka commands
(`mn.billing.credit.reserve.v1`, `mn.billing.credit.settle.v1`) published
by `conductor` — see [Not testable through gRPC](#not-testable-through-grpc)
below.

## Prerequisites

```bash
make infra:up
# first time only: provision the billing role/database if the Postgres
# volume predates it
docker exec -i postgres psql -U admin -d media_notes < deploy/postgres/init/02-billing-role.sql
make billing:migrate
```

Kafka has `KAFKA_AUTO_CREATE_TOPICS_ENABLE: "false"`, and the outbox
publisher sets `AllowAutoTopicCreation: false` too, so a topic that was
never explicitly created makes every outbox record for it fail forever
with `Unknown Topic Or Partition` until the topic exists. Run this once
per fresh Kafka volume (idempotent — safe to re-run):

```bash
make infra:kafka-topics
make billing:run                    # or: go run ./cmd/api from services/billing
```

Health check: `curl http://localhost:8082/health/ready` → `200`.

Reflection UI: `grpcui -plaintext localhost:9093`, or
`grpcurl -plaintext localhost:9093 list media_notes.billing.v1.BillingService`.

The active catalog is seeded by the migration as `launch-v1` (ADR 0008):

| `item_id` | `credits` |
| --- | ---: |
| `transcribe` | 10 |
| `summarize` | 20 |
| `extract_keywords` | 5 |
| `extract_keypoints` | 10 |
| `generate_notes` | 15 |
| `generate_audio_summary` | 30 |

## Golden path

### 1. GetQuote

```bash
grpcurl -plaintext -d '{
  "idempotency_key": "doc-test-1",
  "user_id": "22222222-2222-2222-2222-222222222222",
  "options": ["transcribe", "summarize"]
}' localhost:9093 media_notes.billing.v1.BillingService/GetQuote
```

```json
{
  "quote": {
    "id": "f7e5b9ce-13b9-4d44-b9a9-093fa2fc85a5",
    "userId": "22222222-2222-2222-2222-222222222222",
    "catalogVersion": "launch-v1",
    "items": [
      { "itemId": "transcribe", "credits": "10" },
      { "itemId": "summarize", "credits": "20" }
    ],
    "totalCredits": "30",
    "expiresAt": "2026-08-16T16:45:59.948506Z",
    "createdAt": "2026-08-16T16:30:59.928658Z"
  }
}
```

`expiresAt` is `createdAt + BILLING_QUOTE_TTL` (15 minutes by default). A
quote is only a price snapshot at this point — nothing is reserved yet.

### 2. GetQuote with every catalog item

```bash
grpcurl -plaintext -d '{
  "idempotency_key": "doc-test-2",
  "user_id": "22222222-2222-2222-2222-222222222222",
  "options": ["transcribe", "summarize", "extract_keywords", "extract_keypoints", "generate_notes", "generate_audio_summary"]
}' localhost:9093 media_notes.billing.v1.BillingService/GetQuote
```

`totalCredits` should be `90` (sum of every row in the catalog table above).

### 3. GetBillingSummary

```bash
grpcurl -plaintext -d '{"user_id": "22222222-2222-2222-2222-222222222222"}' \
  localhost:9093 media_notes.billing.v1.BillingService/GetBillingSummary
```

```json
{
  "summary": {
    "userId": "22222222-2222-2222-2222-222222222222"
  }
}
```

`availableCredits`/`reservedCredits` are absent (proto3 zero value) and
`subscription` is unset because this user has never had a credit account
opened or a subscription — both only get created by a Kafka-driven
mutation (a reserve command or a Polar webhook), never by `GetQuote`
itself. This is expected, not a bug: a brand-new user has a zero balance.

## Error / edge cases

Every row below was run against the live service.

| Case | Call | Input | Result |
| --- | --- | --- | --- |
| Unknown price item | `GetQuote` | `options: ["unknown_thing"]` | `InvalidArgument` — `quote: unknown price item: unknown_thing` |
| Empty options | `GetQuote` | `options: []` | `InvalidArgument` — `options must not be empty` |
| Duplicate item | `GetQuote` | `options: ["transcribe", "transcribe"]` | `InvalidArgument` — `quote: duplicate price item: transcribe` |
| Missing dependency | `GetQuote` | `options: ["generate_audio_summary"]` (no `summarize`) | `InvalidArgument` — `quote: generate_audio_summary requires summarize` |
| Malformed UUID | `GetQuote` / `GetBillingSummary` | `user_id: "not-a-uuid"` | `InvalidArgument` — `user_id must be a UUID` |

## Not testable through gRPC

`GetBillingSummary` will only ever show non-zero `availableCredits` /
`reservedCredits` after a purchase or reservation, and neither has a gRPC
entry point:

- **Purchase / top-up**: arrives as a verified Polar webhook at
  `POST http://localhost:8082/webhooks/polar` (needs a valid
  `BILLING_POLAR_WEBHOOK_SECRET` signature — not practical to fake by hand;
  use `billing`'s unit tests in `internal/provider` to exercise this path
  instead).
- **Reserve / settle / release**: `conductor` publishes
  `mn.billing.credit.reserve.v1` and `mn.billing.credit.settle.v1`;
  `billing` consumes them and publishes
  `mn.billing.credit.reserved.v1` / `mn.billing.credit.settled.v1` back.
  `conductor` doesn't exist yet, so these topics currently have no real
  producer. You can manually publish a synthetic command to exercise the
  consumer, e.g. via Kafka UI (`http://localhost:8080`) or `kcat`, with a
  JSON body shaped like:
  ```json
  {"event_id": "<uuid>", "user_id": "<uuid>", "workflow_id": "<uuid>", "quote_id": "<quote.id from GetQuote>"}
  ```
  published to `mn.billing.credit.reserve.v1` keyed by `user_id` — then
  re-run `GetBillingSummary` and check `reservedCredits`.
