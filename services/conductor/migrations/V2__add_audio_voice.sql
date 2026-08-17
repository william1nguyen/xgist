-- audio_voice overrides conductor-worker's static default TTS voice for
-- this workflow's generate_audio_summary step. Empty string (the default)
-- means "use the worker's configured default voice" — kept NOT NULL so
-- dispatchStep's Kafka payload construction never has to special-case a
-- NULL scan.
ALTER TABLE workflows ADD COLUMN audio_voice text NOT NULL DEFAULT '';
