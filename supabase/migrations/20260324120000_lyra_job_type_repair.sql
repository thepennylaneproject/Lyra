-- Update job_type checks to include repair_finding and onboard_repository

alter table public.lyra_audit_jobs
  drop constraint if exists lyra_audit_jobs_job_type_check;

alter table public.lyra_audit_jobs
  add constraint lyra_audit_jobs_job_type_check
  check (job_type in (
    'weekly_audit',
    'onboard_project',
    're_audit_project',
    'synthesize_project',
    'audit_project',
    'onboard_repository',
    'repair_finding'
  ));

alter table public.lyra_audit_runs
  drop constraint if exists lyra_audit_runs_job_type_check;

alter table public.lyra_audit_runs
  add constraint lyra_audit_runs_job_type_check
  check (job_type in (
    'weekly_audit',
    'onboard_project',
    're_audit_project',
    'synthesize_project',
    'audit_project',
    'onboard_repository',
    'repair_finding'
  ));
