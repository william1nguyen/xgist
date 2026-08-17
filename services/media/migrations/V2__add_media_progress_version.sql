-- version backs the mediaProgress projection hermes reads (ADR 0005): a
-- monotonic counter so a poller can detect a newer read is available.
-- ApplyWorkflowStatus increments it on every applied status transition.
ALTER TABLE media ADD COLUMN version integer NOT NULL DEFAULT 1;
