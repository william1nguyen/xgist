-- Manual rollback for V1__init.sql. Flyway Community has no automatic
-- undo/down migration support (that requires Flyway Teams' `undo`
-- command). This script lives outside migrations/ so Flyway never scans or
-- warns about it. Apply it by hand, e.g.:
--   psql "$DATABASE_URL" -f services/identity/rollback/U1__init.sql
-- and then delete the corresponding row from flyway_schema_history if you
-- need `flyway migrate` to re-apply V1 afterward.
DROP TABLE outbox_events;
DROP TABLE inbox_events;
DROP TABLE account_deletions;
DROP TABLE user_roles;
DROP TABLE verification_records;
DROP TABLE sessions;
DROP TABLE accounts;
DROP TABLE users;
DROP TYPE account_state;
