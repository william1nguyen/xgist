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


## Initial migration: `00001_init.sql`

```sql
-- +goose Up
CREATE SCHEMA IF NOT EXISTS billing;
CREATE TABLE billing.billing_accounts (id uuid PRIMARY KEY, user_id uuid NOT NULL UNIQUE, polar_customer_id text UNIQUE, status text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE billing.catalog_versions (id text PRIMARY KEY, items jsonb NOT NULL, active_at timestamptz NOT NULL);
CREATE TABLE billing.credit_accounts (user_id uuid PRIMARY KEY, available bigint NOT NULL CHECK (available >= 0), reserved bigint NOT NULL CHECK (reserved >= 0), version bigint NOT NULL DEFAULT 0, updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE billing.quotes (id uuid PRIMARY KEY, user_id uuid NOT NULL, catalog_version text NOT NULL, amount bigint NOT NULL CHECK (amount >= 0), options jsonb NOT NULL, expires_at timestamptz NOT NULL, accepted_at timestamptz);
CREATE TABLE billing.credit_reservations (id uuid PRIMARY KEY, user_id uuid NOT NULL, workflow_id uuid NOT NULL, quote_id uuid NOT NULL REFERENCES billing.quotes(id), amount bigint NOT NULL CHECK (amount >= 0), status text NOT NULL, expires_at timestamptz NOT NULL, UNIQUE (user_id, workflow_id));
CREATE TABLE billing.credit_ledger (id uuid PRIMARY KEY, user_id uuid NOT NULL, reservation_id uuid, delta bigint NOT NULL, entry_type text NOT NULL, idempotency_key text NOT NULL UNIQUE, metadata jsonb NOT NULL DEFAULT '{}', created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE billing.subscriptions (id uuid PRIMARY KEY, billing_account_id uuid NOT NULL REFERENCES billing.billing_accounts(id), provider_id text NOT NULL UNIQUE, plan text NOT NULL, status text NOT NULL, period_start timestamptz, period_end timestamptz);
CREATE TABLE billing.webhook_events (provider_event_id text PRIMARY KEY, event_type text NOT NULL, payload jsonb NOT NULL, processed_at timestamptz);
CREATE TABLE billing.inbox_events (event_id uuid PRIMARY KEY, topic text NOT NULL, processed_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE billing.outbox_events (id uuid PRIMARY KEY, topic text NOT NULL, event_key text NOT NULL, payload jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), published_at timestamptz, attempts integer NOT NULL DEFAULT 0);
-- +goose Down
DROP SCHEMA billing CASCADE;
```
