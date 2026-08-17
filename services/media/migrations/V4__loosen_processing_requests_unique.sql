-- processing_requests.media_id was UNIQUE, allowing at most one processing
-- request ever per media item. RequestProcessing lets a caller ask for
-- additional or regenerated content after a media item's first request
-- completes, so drop the constraint: processing_requests becomes an
-- append-only history table, one row per request over time.
--
-- Note this table's own status column never transitions past 'requested'
-- today (nothing in this service updates it; media.status, driven by
-- conductor's mn.media.status.changed.v1, is the field that actually
-- reflects lifecycle), so a status-scoped partial unique index would not
-- express a meaningful "at most one in-flight request" invariant here. That
-- invariant is instead enforced application-side: RequestProcessing takes a
-- row lock on the media item and only proceeds while media.status is
-- terminal (completed/failed), which serializes concurrent requests for the
-- same media item without needing a matching DB constraint on this table.
ALTER TABLE processing_requests DROP CONSTRAINT processing_requests_media_id_key;

-- idempotency_key gives RequestProcessing the same double-submit
-- protection ConfirmUpload gets for free from upload_sessions'
-- idempotency_key. NULL for rows created by ConfirmUpload (Postgres
-- allows multiple NULLs under a plain UNIQUE constraint).
ALTER TABLE processing_requests ADD COLUMN idempotency_key text UNIQUE;
