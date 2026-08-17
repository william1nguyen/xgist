ALTER TABLE workflows ADD COLUMN prompt_overrides jsonb NOT NULL DEFAULT '{}';
