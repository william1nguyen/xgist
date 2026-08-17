-- Manual rollback for V4__loosen_processing_requests_unique.sql. Apply by
-- hand, e.g.:
--   psql "$DATABASE_URL" -f services/media/rollback/U4__loosen_processing_requests_unique.sql
-- and then delete the corresponding row from flyway_schema_history if you
-- need `flyway migrate` to re-apply V4 afterward.
-- Only safe if no media item has more than one processing_requests row;
-- delete/collapse extra rows first if RequestProcessing has been used.
ALTER TABLE processing_requests DROP COLUMN idempotency_key;
ALTER TABLE processing_requests ADD CONSTRAINT processing_requests_media_id_key UNIQUE (media_id);
