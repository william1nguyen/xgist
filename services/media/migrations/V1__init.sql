CREATE TABLE media (
  id uuid PRIMARY KEY,
  owner_id uuid NOT NULL,
  title text NOT NULL,
  media_type text NOT NULL,
  object_key text NOT NULL UNIQUE,
  mime_type text NOT NULL,
  size_bytes bigint,
  duration_ms bigint,
  checksum text,
  status text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX media_owner_created ON media (owner_id, created_at DESC);

CREATE TABLE upload_sessions (
  id uuid PRIMARY KEY,
  media_id uuid NOT NULL UNIQUE REFERENCES media(id),
  owner_id uuid NOT NULL,
  object_key text NOT NULL UNIQUE,
  status text NOT NULL,
  expires_at timestamptz NOT NULL,
  completed_at timestamptz,
  idempotency_key text NOT NULL UNIQUE
);
-- The three-active-session cap (ADR 0004) is enforced by the application
-- under a row lock at creation time, not by this index: a partial unique
-- index cannot express "at most three," only "at most one."
CREATE INDEX active_uploads_by_owner ON upload_sessions (owner_id, expires_at) WHERE status = 'active';

CREATE TABLE processing_requests (
  id uuid PRIMARY KEY,
  media_id uuid NOT NULL UNIQUE REFERENCES media(id),
  requested_by uuid NOT NULL,
  options jsonb NOT NULL,
  accepted_quote jsonb,
  workflow_id uuid,
  status text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE derivatives (
  id uuid PRIMARY KEY,
  media_id uuid NOT NULL REFERENCES media(id),
  derivative_type text NOT NULL,
  version integer NOT NULL,
  object_key text NOT NULL UNIQUE,
  mime_type text NOT NULL,
  width integer,
  height integer,
  size_bytes bigint,
  status text NOT NULL,
  UNIQUE (media_id, derivative_type, version)
);

-- media_deletions tracks media's coordinator role for one media item's
-- deletion (ADR 0006's "user-visible media deletion" flow). participants
-- records completion reported by content and conductor; media deletes its
-- own owned rows and objects synchronously and is not itself a
-- participant of its own operation.
CREATE TABLE media_deletions (
  deletion_id uuid PRIMARY KEY,
  media_id uuid NOT NULL UNIQUE REFERENCES media(id),
  owner_id uuid NOT NULL,
  state text NOT NULL,
  participants jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE TABLE inbox_events (
  event_id uuid PRIMARY KEY,
  topic text NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE outbox_events (
  id uuid PRIMARY KEY,
  topic text NOT NULL,
  event_key text NOT NULL,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,
  attempts integer NOT NULL DEFAULT 0
);
CREATE INDEX outbox_events_pending ON outbox_events (created_at) WHERE published_at IS NULL;
