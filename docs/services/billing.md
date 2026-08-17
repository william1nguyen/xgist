# Billing

## Scope

Go gRPC + Kafka service owning billing accounts, subscriptions, catalog/quotes,
credit balances, reservations, append-only ledger and provider webhook state.
No other service updates balances or reads its tables. Pricing, reservation,
and settlement semantics follow [ADR 0008](../adr/0008-credit-pricing-and-settlement.md).

## Structure

```text
cmd/api/main.go
internal/app/              # startup, shutdown, health
internal/quote/            # catalog-backed pricing and quote issuance
internal/credit/           # reservation, settlement, release, ledger
internal/subscription/     # subscription read path for GetBillingSummary
internal/provider/         # Polar webhook verification and purchase credit
internal/grpc/             # generated-server adapter and error mapping
internal/events/           # outbox relay, credit-command consumer
internal/store/            # PostgreSQL repositories
migrations/
```

Dependencies point inward: gRPC/store/events depend on application packages;
application packages depend only on small repository interfaces. `internal/credit`
depends on `internal/quote`'s types (to look up a reservation's priced items) but
not the reverse.

## Data

| Table | Required fields |
| --- | --- |
| billing_accounts | id, user_id, polar_customer_id, status |
| catalog_versions | id (version), items (price map), active_at |
| credit_accounts | user_id, available, reserved, version (optimistic lock) |
| quotes | id, user_id, catalog_version, amount, options (priced items), expires_at, accepted_at |
| credit_reservations | id, user_id, workflow_id, quote_id, amount, remaining, status, expires_at |
| credit_ledger | id, user_id, reservation_id, delta, entry_type, idempotency_key (unique), metadata |
| subscriptions | id, billing_account_id, provider_id, plan, status, period |
| webhook_events | provider_event_id, event_type, payload, processed_at |
| outbox, inbox | event/consumer deduplication state |

`credit_reservations.remaining` and `quotes.created_at` extend the schema this
document originally proposed: `remaining` lets per-item settlement (ADR 0008)
update a single row instead of recomputing from the ledger on every call, and
`created_at` matches every other table's audit column. Tables live in the
`billing` schema of the service's own database (not the default `public`
schema identity uses) — either is valid under
[docs/database-migrations.md](../database-migrations.md)'s "own database per
service" rule; `billing` was chosen so `psql` sessions and pg_dump output stay
self-describing.

`available >= 0` and `reserved >= 0` are enforced as PostgreSQL `CHECK`
constraints, as a defense-in-depth backstop behind the application-level
checks `internal/store/credit_repository.go` performs under a row lock before
issuing any mutating statement — a constraint violation would abort the
surrounding transaction, which would break the "commit a rejected-result
event in the same transaction" flow described below.

## Methods and contracts

```text
GetQuote(ctx, userID, options) -> Quote
GetPriceCatalog(ctx) -> Catalog
GetBillingSummary(ctx, userID) -> Summary
ReserveCredit(ctx, reservation command) -> Reservation
SettleReservation(ctx, settlement command) -> Settlement
HandleProviderWebhook(ctx, verified payload) -> void
```

`contracts/proto/media_notes/billing/v1/billing.proto`, package
`media_notes.billing.v1` (per ADR 0002 and Buf's `PACKAGE_DIRECTORY_MATCH`
lint rule, matching identity's contract layout), exposes the read/query
methods — `GetQuote`, `GetPriceCatalog`, `GetBillingSummary`, and
`ListCreditLedger` — to Hermes. `GetPriceCatalog` returns every item in the
active catalog version with no options required: it's what a client renders
a price list from before it has a selection to price with `GetQuote` — a
caller (hermes, and every UI it serves) must never hardcode a price
locally.
`ReserveCredit` and `SettleReservation` are workflow mutations that enter only
through Kafka commands; there is no gRPC path to trigger a balance mutation.
`HandleProviderWebhook` is an HTTP endpoint (`POST /webhooks/polar`), not
gRPC or Kafka, since it receives an external provider's callback.

A quote snapshot has a 15-minute admission lifetime (`BILLING_QUOTE_TTL`).
Reserve is idempotent by billing account + workflow ID (the
`credit_reservations` unique constraint) and moves available credit to
reserved while appending a ledger row. Settle/release uses the ledger's
unique `idempotency_key` as the same invariant and never reprices an accepted
quote — item prices come from the quote stored on the reservation, never from
the inbound command. A reservation expires 24 hours after creation
(`BILLING_RESERVATION_TTL`) without a scheduled expiry sweep yet; see
"Deferred" below.

Insufficient credit, an unknown quote, or an expired quote reject the
reservation without leaving the consuming transaction in an error state:
`credit.Repository.Reserve` commits a `"rejected"` result event to the outbox
in the same transaction it read the rejection from, and the Kafka command
consumer acks the command rather than retrying a decision that cannot change
on redelivery. A stale settle/release against an already-released reservation
is acked the same way. A genuine anomaly (unknown price item, settlement
amount exceeding the reservation's remainder) is not swallowed and is left to
retry, since it likely indicates a bug worth alerting on rather than a normal
business outcome.

## Events

Consume `mn.billing.credit.reserve.v1` and `mn.billing.credit.settle.v1`,
keyed by `user_id`, in one consumer group spanning both topics
(`billing-credit-commands`). The settle topic carries both per-item
settlement and terminal remainder-release commands, distinguished by an
`action` field (`"settle_item"` | `"release_remainder"`), matching ADR 0003's
stated purpose for that topic: "Capture or release reserved credit."

Publish `mn.billing.credit.reserved.v1` (reservation accepted or rejected)
and `mn.billing.credit.settled.v1` (item settled or remainder released) from
a transactional outbox, both keyed by `user_id`. `mn.billing.credit.settled.v1`
is not yet in ADR 0003's topic inventory — conductor does not exist yet to
depend on it, so this is a forward-compatible definition rather than one
negotiated against a live consumer, the same posture identity took for its
deletion-completion topics.

## Provider webhooks

`POST /webhooks/polar` verifies an HMAC-SHA256 signature (header
`Polar-Signature`, hex-encoded, over the raw body) using
`BILLING_POLAR_WEBHOOK_SECRET`, matching the v1 server's
`apps/server/src/routes/polar-webhook.ts` so existing Polar product
configuration keeps working unchanged. An `order.created` event credits
`product.metadata.credits` to `metadata.userId`. Every correctly signed event
is recorded to `webhook_events` for audit regardless of type; recording is
best-effort bookkeeping, not the idempotency gate — `ApplyPurchase`'s ledger
entry, keyed by a SHA-256 hash of the raw payload, is. Polar's documented
webhook envelope does not guarantee a stable event ID this service can rely
on without a live contract to verify against, so identical redeliveries are
deduplicated by content hash instead of a provider-supplied ID.

## Tests

`internal/quote`, `internal/provider`, and `internal/events` are covered by
unit tests against fakes: pricing every catalog combination, the
`generate_audio_summary` → `summarize` dependency, quote expiry versus
accepted-quote validity, webhook signature rejection, purchase idempotency on
redelivery, and command-consumer dedup plus rejection-vs-retry classification.
`internal/store` has a Testcontainers-backed integration test
(`V2_INTEGRATION_TESTS=1`) exercising the seeded catalog, reserve/duplicate-
reserve, insufficient-credit rejection, and settle-then-release against real
PostgreSQL, including a ledger-reconciliation assertion (available balance
equals the sum of that user's ledger deltas).

Not yet covered: concurrent-reservation load testing, reservation expiry
sweep/renewal, refunds, and the cross-service billing/conductor
reconciler — see "Deferred" below.

## Deferred

The following ADR 0008 concerns are intentionally not implemented yet,
mirroring identity's precedent of leaving an unselected mechanism explicit
rather than half-building it:

- **Reservation expiry sweep and renewal.** `credit_reservations.expires_at`
  is stored but nothing currently reaps or renews an expired-but-still-active
  reservation; conductor does not exist yet to renew one through workflow
  activity.
- **Refunds.** `credit.EntryRefund` exists as a ledger entry-type constant,
  but there is no operator-facing command to issue one.
- **Cross-service billing/conductor reconciler.** ADR 0008's reconciliation
  contract needs a live conductor to compare against.
- **Subscription ingestion.** `billing.subscriptions` and the
  `GetBillingSummary` read path exist, but the wired Polar webhook handling
  covers `order.created` (credit purchase) only; no producer of subscription
  lifecycle state exists yet.
- **Shadow-mode rollout.** ADR 0008 calls for computing quote/reservation
  decisions without enforcement before going live; this implementation
  enforces from the start, matching how identity shipped its deletion flow
  directly rather than shadow-first.

## Runtime and tests

Expose HTTP `/health/live` and `/health/ready`, the Polar webhook endpoint,
and a separate gRPC listener (`:8082` / `:9093` by default). Ready only after
migrations have applied and the database is reachable. Shutdown marks
unready, stops the gRPC server gracefully, closes the HTTP server and Kafka
publisher, and cancels the outbox relay and command consumer within
`BILLING_SHUTDOWN_TIMEOUT`.

## Initial migration: `V1__init.sql`

billing has its own PostgreSQL database (not just its own schema in a shared
database — see `docs/database-migrations.md`), with application tables under
an explicit `billing` schema within it. Migrations use Flyway; see
`docs/database-migrations.md` for tooling and rollback conventions. See
`services/billing/migrations/V1__init.sql` for the full statement, and
`services/billing/rollback/U1__init.sql` for the hand-maintained rollback
script (Flyway Community has no automatic undo).

The migration seeds the `launch-v1` catalog from ADR 0008's price table
(`transcribe` 10, `summarize` 20, `extract_keywords` 5, `extract_keypoints`
10, `generate_notes` 15, `generate_audio_summary` 30) so `GetQuote` has an
active catalog version immediately after migrating, with no separate seed
step.
