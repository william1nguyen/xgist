# Billing

## Scope

Go gRPC + Kafka service owning billing accounts, subscriptions, catalog/quotes,
credit balances, reservations, append-only ledger and provider webhook state.
No other service updates balances or reads its tables.

## Structure and data

```text
cmd/billing/main.go
internal/quote/ internal/credit/ internal/subscription/
internal/provider/ internal/grpc/ internal/events/ internal/store/
migrations/
```

Tables: billing_accounts, subscriptions, catalog_versions, quotes,
reservations, ledger_entries, provider_webhooks, outbox and inbox. Ledger rows
are append-only. Reservation and settlement mutations use database transactions.

## Methods and contracts

```text
GetQuote(ctx, userID, options) -> Quote
GetBillingSummary(ctx, userID) -> Summary
ReserveCredit(ctx, reservation command) -> Reservation
SettleReservation(ctx, settlement command) -> Settlement
HandleProviderWebhook(ctx, verified payload) -> void
```

`contracts/proto/billing/v1/billing.proto` exposes read/query methods to
Hermes; workflow mutations enter via Kafka. A quote snapshot has a 15-minute
admission lifetime. Reserve is idempotent by billing account + workflow ID and
moves available credit to reserved while appending a ledger row. Settle/release
uses the same invariant and never reprices an accepted quote.

## Events

Consume `mn.billing.credit.reserve.v1` and
`mn.billing.credit.settle.v1`, keyed by `user_id`. Publish
`mn.billing.credit.reserved.v1` from a transactional outbox. Define a
settlement result topic before conductor depends on it.

## Tests

Test insufficient credit, duplicate command, concurrent reservation, expired
quote, release/settle, provider webhook replay and ledger reconciliation.
Integration-test inbox/outbox, database constraints and consumer restart.
