-- Manual rollback for V2__add_audio_voice.sql. Apply by hand, e.g.:
--   psql "$DATABASE_URL" -f services/conductor/rollback/U2__add_audio_voice.sql
-- and then delete the corresponding row from flyway_schema_history if you
-- need `flyway migrate` to re-apply V2 afterward.
ALTER TABLE workflows DROP COLUMN audio_voice;
