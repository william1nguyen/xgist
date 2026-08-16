CREATE TABLE contents (
  id uuid PRIMARY KEY,
  media_id uuid NOT NULL UNIQUE,
  workflow_id uuid NOT NULL,
  language text,
  transcript_text text,
  version integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE transcript_segments (
  id uuid PRIMARY KEY,
  content_id uuid NOT NULL REFERENCES contents(id) ON DELETE CASCADE,
  segment_index integer NOT NULL,
  start_ms bigint NOT NULL CHECK (start_ms >= 0),
  end_ms bigint NOT NULL CHECK (end_ms >= start_ms),
  speaker text,
  text text NOT NULL,
  UNIQUE (content_id, segment_index)
);

CREATE TABLE summaries (
  id uuid PRIMARY KEY,
  content_id uuid NOT NULL REFERENCES contents(id) ON DELETE CASCADE,
  summary_type text NOT NULL,
  text text NOT NULL,
  model text,
  prompt_version text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (content_id, summary_type)
);

CREATE TABLE summary_sentences (
  id uuid PRIMARY KEY,
  summary_id uuid NOT NULL REFERENCES summaries(id) ON DELETE CASCADE,
  sentence_index integer NOT NULL,
  text text NOT NULL,
  UNIQUE (summary_id, sentence_index)
);

CREATE TABLE summary_citations (
  summary_sentence_id uuid NOT NULL REFERENCES summary_sentences(id) ON DELETE CASCADE,
  transcript_segment_id uuid NOT NULL REFERENCES transcript_segments(id) ON DELETE CASCADE,
  PRIMARY KEY (summary_sentence_id, transcript_segment_id)
);

CREATE TABLE keywords (
  id uuid PRIMARY KEY,
  content_id uuid NOT NULL REFERENCES contents(id) ON DELETE CASCADE,
  keyword text NOT NULL,
  score numeric,
  position integer NOT NULL,
  UNIQUE (content_id, keyword)
);

CREATE TABLE keypoints (
  id uuid PRIMARY KEY,
  content_id uuid NOT NULL REFERENCES contents(id) ON DELETE CASCADE,
  point_index integer NOT NULL,
  text text NOT NULL,
  start_segment integer,
  end_segment integer,
  UNIQUE (content_id, point_index)
);

CREATE TABLE notes (
  id uuid PRIMARY KEY,
  content_id uuid NOT NULL REFERENCES contents(id) ON DELETE CASCADE,
  format text NOT NULL,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (content_id, format)
);

CREATE TABLE audio_summaries (
  id uuid PRIMARY KEY,
  content_id uuid NOT NULL REFERENCES contents(id) ON DELETE CASCADE,
  summary_id uuid REFERENCES summaries(id) ON DELETE SET NULL,
  summary_type text NOT NULL,
  object_key text NOT NULL UNIQUE,
  mime_type text NOT NULL,
  duration_ms bigint,
  voice text,
  status text NOT NULL,
  UNIQUE (content_id, summary_type)
);

-- content_step_attempts deduplicates Store* calls and rejects a stale
-- retry: step is one of "transcribe", "keywords", "keypoints", or a
-- subtype-scoped key ("summary:<type>", "notes:<format>",
-- "summary_audio:<type>") since a media item can hold more than one
-- summary, note, or summary-audio object. A call whose attempt is lower
-- than the recorded attempt is rejected; a call replaying the same
-- idempotency_key as the recorded one is a no-op success.
CREATE TABLE content_step_attempts (
  content_id uuid NOT NULL REFERENCES contents(id) ON DELETE CASCADE,
  step text NOT NULL,
  attempt integer NOT NULL,
  idempotency_key text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (content_id, step)
);

-- content_deletions is content's tombstone for its participant role in
-- media deletion (ADR 0006): it exists so a Store* call can be rejected
-- for a media item whose deletion has started even before any content row
-- was ever created for it, and so a redelivered
-- mn.media.deletion.requested.v1 is a no-op after the first successful
-- delete.
CREATE TABLE content_deletions (
  media_id uuid PRIMARY KEY,
  deletion_id uuid NOT NULL,
  deleted_at timestamptz NOT NULL DEFAULT now()
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
