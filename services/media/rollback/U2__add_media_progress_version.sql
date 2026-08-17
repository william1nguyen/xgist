-- Manual rollback for V2__add_media_progress_version.sql. Apply by hand,
-- e.g.:
--   psql "$DATABASE_URL" -f services/media/rollback/U2__add_media_progress_version.sql
-- and then delete the corresponding row from flyway_schema_history if you
-- need `flyway migrate` to re-apply V2 afterward.
ALTER TABLE media DROP COLUMN version;
