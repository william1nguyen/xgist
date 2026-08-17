-- Manual rollback for V3__loosen_workflows_media_id_unique.sql. Apply by
-- hand, e.g.:
--   psql "$DATABASE_URL" -f services/conductor/rollback/U3__loosen_workflows_media_id_unique.sql
-- and then delete the corresponding row from flyway_schema_history if you
-- need `flyway migrate` to re-apply V3 afterward.
-- Only safe if no media item has more than one workflow row; delete/
-- collapse extra rows first if RequestProcessing has been used.
DROP INDEX workflows_media_id_active_key;
ALTER TABLE workflows ADD CONSTRAINT workflows_media_id_key UNIQUE (media_id);
