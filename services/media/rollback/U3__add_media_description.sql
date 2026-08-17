-- Manual rollback for V3__add_media_description.sql. Apply by hand,
-- e.g.:
--   psql "$DATABASE_URL" -f services/media/rollback/U3__add_media_description.sql
-- and then delete the corresponding row from flyway_schema_history if you
-- need `flyway migrate` to re-apply V3 afterward.
ALTER TABLE media DROP COLUMN description;
