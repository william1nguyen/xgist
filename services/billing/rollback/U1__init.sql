-- Manual rollback for V1__init.sql. Flyway Community has no automatic
-- undo/down migration support (that requires Flyway Teams' `undo`
-- command). This script lives outside migrations/ so Flyway never scans or
-- warns about it. Apply it by hand, e.g.:
--   psql "$DATABASE_URL" -f services/billing/rollback/U1__init.sql
-- and then delete the corresponding row from flyway_schema_history if you
-- need `flyway migrate` to re-apply V1 afterward.
DROP SCHEMA billing CASCADE;
