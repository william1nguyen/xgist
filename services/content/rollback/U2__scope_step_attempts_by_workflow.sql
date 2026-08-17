-- Manual rollback for V2__scope_step_attempts_by_workflow.sql. Apply by
-- hand, e.g.:
--   psql "$DATABASE_URL" -f services/content/rollback/U2__scope_step_attempts_by_workflow.sql
-- and then delete the corresponding row from flyway_schema_history if you
-- need `flyway migrate` to re-apply V2 afterward.
-- Wipes the ledger again, same rationale as V2 (disposable idempotency
-- data, not user content).
DELETE FROM content_step_attempts;
ALTER TABLE content_step_attempts DROP CONSTRAINT content_step_attempts_pkey;
ALTER TABLE content_step_attempts DROP COLUMN workflow_id;
ALTER TABLE content_step_attempts ADD PRIMARY KEY (content_id, step);
