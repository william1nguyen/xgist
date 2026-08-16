CREATE TYPE account_state AS ENUM ('active', 'deletion_pending', 'tombstoned');

CREATE TABLE users (
  id uuid PRIMARY KEY, email text NOT NULL, normalized_email text NOT NULL UNIQUE,
  name text, image_url text, email_verified_at timestamptz,
  state account_state NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE accounts (
  id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id),
  provider text NOT NULL, provider_account_id text NOT NULL,
  credential_hash bytea, created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (provider, provider_account_id)
);

CREATE TABLE sessions (
  id uuid PRIMARY KEY, user_id uuid NOT NULL REFERENCES users(id),
  token_hash bytea NOT NULL UNIQUE, expires_at timestamptz NOT NULL,
  revoked_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX sessions_active_by_user ON sessions (user_id, expires_at)
  WHERE revoked_at IS NULL;

CREATE TABLE verification_records (
  id uuid PRIMARY KEY, identifier text NOT NULL, value_hash bytea NOT NULL UNIQUE,
  purpose text NOT NULL, expires_at timestamptz NOT NULL, consumed_at timestamptz
);

CREATE TABLE user_roles (user_id uuid NOT NULL REFERENCES users(id), role text NOT NULL, PRIMARY KEY (user_id, role));

CREATE TABLE account_deletions (
  deletion_id uuid PRIMARY KEY, user_id uuid NOT NULL UNIQUE REFERENCES users(id),
  state text NOT NULL, participants jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), completed_at timestamptz
);

CREATE TABLE inbox_events (consumer_name text NOT NULL, event_id uuid NOT NULL, received_at timestamptz NOT NULL DEFAULT now(), PRIMARY KEY (consumer_name, event_id));
CREATE TABLE outbox_events (id uuid PRIMARY KEY, topic text NOT NULL, event_key text NOT NULL, payload jsonb NOT NULL, created_at timestamptz NOT NULL DEFAULT now(), published_at timestamptz, attempts integer NOT NULL DEFAULT 0);
