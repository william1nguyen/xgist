-- content_step_attempts previously deduplicated Store* calls per
-- (content_id, step) only, rejecting a write whose attempt was lower than
-- the last recorded one. A regenerate request (media's RequestProcessing)
-- starts a brand new workflow whose own step attempts count from 1 again,
-- which would otherwise compare as stale against a previous, unrelated
-- workflow's higher attempt count for the same step (if that step needed a
-- retry the first time). Scope the ledger to (content_id, step,
-- workflow_id) instead, so each workflow gets its own independent
-- monotonic attempt sequence.
--
-- This service has no real user data yet (still pre-launch), and this
-- table is a disposable idempotency ledger, not user content, so wipe it
-- rather than attempting a backfill: content has no access to conductor's
-- workflow history, and reaching across that boundary would violate the
-- service ownership rule in docs/adr/0001.
DELETE FROM content_step_attempts;
ALTER TABLE content_step_attempts ADD COLUMN workflow_id uuid NOT NULL;
ALTER TABLE content_step_attempts DROP CONSTRAINT content_step_attempts_pkey;
ALTER TABLE content_step_attempts ADD PRIMARY KEY (content_id, step, workflow_id);
