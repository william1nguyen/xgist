-- workflows.media_id was UNIQUE, allowing at most one workflow ever per
-- media item. media's RequestProcessing RPC lets a caller ask for
-- additional or regenerated content after a media item's first workflow
-- completes, so replace the table-wide constraint with a partial index
-- that keeps the real invariant: at most one *active* (non-terminal)
-- workflow per media item at a time. Completed/failed workflows accumulate
-- as history. Unlike media's processing_requests.status, workflows.state
-- does genuinely transition to 'completed'/'failed' (see CompleteWorkflow
-- and FailWorkflow), so this partial index correctly releases.
ALTER TABLE workflows DROP CONSTRAINT workflows_media_id_key;
CREATE UNIQUE INDEX workflows_media_id_active_key
  ON workflows (media_id) WHERE state NOT IN ('completed', 'failed');
