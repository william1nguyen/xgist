ALTER TABLE media ADD COLUMN trashed_at timestamptz;
CREATE INDEX media_trashed_at ON media (trashed_at) WHERE trashed_at IS NOT NULL;
