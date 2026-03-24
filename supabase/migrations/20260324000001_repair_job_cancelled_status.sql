-- Add 'cancelled' as a valid repair job status.
-- The DELETE /api/engine/queue endpoint marks stuck/unwanted jobs as cancelled
-- rather than destroying the audit trail.

ALTER TABLE lyra_repair_jobs
  DROP CONSTRAINT IF EXISTS lyra_repair_jobs_status_check;

ALTER TABLE lyra_repair_jobs
  ADD CONSTRAINT lyra_repair_jobs_status_check
    CHECK (status = ANY (ARRAY['queued', 'running', 'completed', 'failed', 'cancelled']));
