-- Lyra maintenance loop: manifests, richer run metadata, and repair jobs.

create table if not exists public.lyra_project_manifests (
  id uuid primary key default gen_random_uuid(),
  project_name text not null references public.lyra_projects (name) on delete cascade,
  repo_revision text not null,
  source_root text,
  checklist_id text,
  exhaustiveness text not null default 'exhaustive'
    check (exhaustiveness in ('sampled', 'exhaustive')),
  manifest jsonb not null default '{}'::jsonb,
  generated_at timestamptz not null default now(),
  unique (project_name, repo_revision)
);

create index if not exists lyra_project_manifests_project_generated_idx
  on public.lyra_project_manifests (project_name, generated_at desc);

create table if not exists public.lyra_repair_jobs (
  id uuid primary key default gen_random_uuid(),
  project_name text not null references public.lyra_projects (name) on delete cascade,
  finding_id text not null,
  status text not null default 'queued'
    check (status in ('queued', 'running', 'completed', 'failed')),
  repair_policy jsonb not null default '{}'::jsonb,
  targeted_files jsonb not null default '[]'::jsonb,
  verification_commands jsonb not null default '[]'::jsonb,
  rollback_notes text,
  payload jsonb not null default '{}'::jsonb,
  error text,
  patch_applied boolean,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz
);

create index if not exists lyra_repair_jobs_project_created_idx
  on public.lyra_repair_jobs (project_name, created_at desc);

create index if not exists lyra_repair_jobs_status_created_idx
  on public.lyra_repair_jobs (status, created_at desc);

alter table public.lyra_audit_jobs
  add column if not exists manifest_revision text,
  add column if not exists checklist_id text,
  add column if not exists repo_ref text;

alter table public.lyra_audit_runs
  add column if not exists manifest_revision text,
  add column if not exists checklist_id text,
  add column if not exists coverage_complete boolean,
  add column if not exists completion_confidence text
    check (completion_confidence in ('low', 'medium', 'high')),
  add column if not exists exhaustiveness text
    check (exhaustiveness in ('sampled', 'exhaustive'));

create index if not exists lyra_audit_runs_project_created_idx
  on public.lyra_audit_runs (project_name, created_at desc);

comment on table public.lyra_project_manifests is 'Per-project module manifests and coverage baselines by repo revision';
comment on table public.lyra_repair_jobs is 'Canonical repair queue and verification metadata for conservative autonomous maintenance';
