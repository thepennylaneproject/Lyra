-- Constrain job_type to LyraJobType union (aligns DB with dashboard/worker).
-- Run after 20260319120000_lyra_rls.sql (or after 20250318120000_lyra_core.sql if RLS not used).

alter table public.lyra_audit_jobs
  add constraint lyra_audit_jobs_job_type_check
  check (job_type in (
    'weekly_audit',
    'onboard_project',
    're_audit_project',
    'synthesize_project',
    'audit_project'
  ));

alter table public.lyra_audit_runs
  add constraint lyra_audit_runs_job_type_check
  check (job_type in (
    'weekly_audit',
    'onboard_project',
    're_audit_project',
    'synthesize_project',
    'audit_project'
  ));
