CREATE SCHEMA IF NOT EXISTS billing;

CREATE TABLE billing.billing_accounts (
  id uuid PRIMARY KEY, user_id uuid NOT NULL UNIQUE,
  polar_customer_id text UNIQUE, status text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE billing.catalog_versions (
  id text PRIMARY KEY, items jsonb NOT NULL, active_at timestamptz NOT NULL
);

CREATE TABLE billing.credit_accounts (
  user_id uuid PRIMARY KEY,
  available bigint NOT NULL CHECK (available >= 0),
  reserved bigint NOT NULL CHECK (reserved >= 0),
  version bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE billing.quotes (
  id uuid PRIMARY KEY, user_id uuid NOT NULL, catalog_version text NOT NULL,
  amount bigint NOT NULL CHECK (amount >= 0), options jsonb NOT NULL,
  expires_at timestamptz NOT NULL, accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX quotes_user_created ON billing.quotes (user_id, created_at DESC);

-- remaining and created_at extend docs/services/billing.md's schema:
-- remaining tracks a reservation's unsettled balance so per-item
-- settlement (ADR 0008) doesn't need to be recomputed from the ledger on
-- every call, and created_at matches every other table's audit column.
CREATE TABLE billing.credit_reservations (
  id uuid PRIMARY KEY, user_id uuid NOT NULL, workflow_id uuid NOT NULL,
  quote_id uuid NOT NULL REFERENCES billing.quotes(id),
  amount bigint NOT NULL CHECK (amount >= 0),
  remaining bigint NOT NULL CHECK (remaining >= 0),
  status text NOT NULL, expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, workflow_id)
);

CREATE TABLE billing.credit_ledger (
  id uuid PRIMARY KEY, user_id uuid NOT NULL, reservation_id uuid,
  delta bigint NOT NULL, entry_type text NOT NULL,
  idempotency_key text NOT NULL UNIQUE,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX credit_ledger_user_created ON billing.credit_ledger (user_id, created_at DESC);

CREATE TABLE billing.subscriptions (
  id uuid PRIMARY KEY,
  billing_account_id uuid NOT NULL REFERENCES billing.billing_accounts(id),
  provider_id text NOT NULL UNIQUE, plan text NOT NULL, status text NOT NULL,
  period_start timestamptz, period_end timestamptz
);

CREATE TABLE billing.webhook_events (
  provider_event_id text PRIMARY KEY, event_type text NOT NULL,
  payload jsonb NOT NULL, processed_at timestamptz
);

CREATE TABLE billing.inbox_events (
  event_id uuid PRIMARY KEY, topic text NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE billing.outbox_events (
  id uuid PRIMARY KEY, topic text NOT NULL, event_key text NOT NULL,
  payload jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz, attempts integer NOT NULL DEFAULT 0
);
CREATE INDEX outbox_events_pending ON billing.outbox_events (created_at) WHERE published_at IS NULL;

-- Seed the launch-v1 catalog (ADR 0008). A later price change ships as a
-- new catalog_versions row with a later active_at; existing quotes and
-- reservations keep referencing their original catalog_version.
INSERT INTO billing.catalog_versions (id, items, active_at) VALUES (
  'launch-v1',
  '{"transcribe":10,"summarize":20,"extract_keywords":5,"extract_keypoints":10,"generate_notes":15,"generate_audio_summary":30}'::jsonb,
  now()
);
