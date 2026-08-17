-- Manual rollback for V1__init.sql. Flyway Community has no automatic
-- undo/down migration support (that requires Flyway Teams' `undo`
-- command). This script lives outside migrations/ so Flyway never scans or
-- warns about it. Apply it by hand, e.g.:
--   psql "$DATABASE_URL" -f services/content/rollback/U1__init.sql
-- and then delete the corresponding row from flyway_schema_history if you
-- need `flyway migrate` to re-apply V1 afterward.
DROP TABLE outbox_events;
DROP TABLE inbox_events;
DROP TABLE content_deletions;
DROP TABLE content_step_attempts;
DROP TABLE audio_summaries;
DROP TABLE notes;
DROP TABLE keypoints;
DROP TABLE keywords;
DROP TABLE summary_citations;
DROP TABLE summary_sentences;
DROP TABLE summaries;
DROP TABLE transcript_segments;
DROP TABLE contents;
