-- Constrain job_type to LyraJobType union (aligns DB with dashboard/worker).
-- Run after 20260319120000_lyra_rls.sql (or after 20250318120000_lyra_core.sql if RLS not used).
--
-- Two-phase approach (DATA-011):
--   Phase 1: Normalize any unexpected job_type values to 'audit_project' so that
--            existing rows do not block constraint creation.
--   Phase 2: Add constraints as NOT VALID (no scan of existing rows at creation time),
--            then VALIDATE to check existing rows in a separate step that can be
--            retried without re-adding the constraint on failure.

-- Phase 1: Normalize unexpected values on existing rows.
update public.lyra_audit_jobs
set job_type = 'audit_project'
where job_type not in (
  'weekly_audit',
  'onboard_project',
  're_audit_project',
  'synthesize_project',
  'audit_project'
);

update public.lyra_audit_runs
set job_type = 'audit_project'
where job_type not in (
  'weekly_audit',
  'onboard_project',
  're_audit_project',
  'synthesize_project',
  'audit_project'
);

-- Phase 2a: Add constraints without validating existing rows.
alter table public.lyra_audit_jobs
  add constraint lyra_audit_jobs_job_type_check
  check (job_type in (
    'weekly_audit',
    'onboard_project',
    're_audit_project',
    'synthesize_project',
    'audit_project'
  )) not valid;

alter table public.lyra_audit_runs
  add constraint lyra_audit_runs_job_type_check
  check (job_type in (
    'weekly_audit',
    'onboard_project',
    're_audit_project',
    'synthesize_project',
    'audit_project'
  )) not valid;

-- Phase 2b: Validate constraints against all existing rows.
-- These can be run separately (e.g. after verifying Phase 1 cleanup).
alter table public.lyra_audit_jobs
  validate constraint lyra_audit_jobs_job_type_check;

alter table public.lyra_audit_runs
  validate constraint lyra_audit_runs_job_type_check;
