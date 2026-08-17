-- Standalone audio jobs: a media-independent "paste text, or describe it
-- and let AI draft the script, then synthesize audio" feature. Unlike
-- every other table in this service, these rows are not keyed by
-- media_id/workflow_id — they belong directly to a user, tracked through
-- the same generating/completed/failed lifecycle as processing steps but
-- entirely outside conductor's workflow model.
CREATE TABLE standalone_audio_jobs (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL,
  kind text NOT NULL CHECK (kind IN ('script', 'audio')),
  status text NOT NULL DEFAULT 'generating' CHECK (status IN ('generating', 'completed', 'failed')),
  input_text text NOT NULL,
  output_text text,
  voice text,
  object_key text,
  mime_type text,
  duration_ms bigint,
  error_code text,
  idempotency_key text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_standalone_audio_jobs_user ON standalone_audio_jobs (user_id, kind, created_at DESC, id DESC);
