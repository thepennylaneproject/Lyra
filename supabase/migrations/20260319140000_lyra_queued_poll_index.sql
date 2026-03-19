-- Optimize worker dequeue: SELECT id FROM lyra_audit_jobs WHERE status = 'queued' ORDER BY created_at ASC LIMIT 1
-- Partial index avoids scanning completed/failed rows.
create index if not exists lyra_audit_jobs_queued_created_asc_idx
  on public.lyra_audit_jobs (created_at asc)
  where status = 'queued';

comment on index lyra_audit_jobs_queued_created_asc_idx is 'Worker poll: queued jobs by created_at ASC';
