-- Lyra greenfield: projects, audit jobs, audit run summaries
-- Run via Supabase CLI or dashboard SQL editor.

create table if not exists public.lyra_projects (
  name text primary key,
  repository_url text,
  project_json jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists lyra_projects_updated_at_idx on public.lyra_projects (updated_at desc);

create table if not exists public.lyra_audit_jobs (
  id uuid primary key default gen_random_uuid(),
  job_type text not null,
  project_name text,
  repository_url text,
  status text not null default 'queued'
    check (status in ('queued', 'running', 'completed', 'failed')),
  payload jsonb not null default '{}'::jsonb,
  error text,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  finished_at timestamptz
);

create index if not exists lyra_audit_jobs_status_created_idx
  on public.lyra_audit_jobs (status, created_at desc);

create index if not exists lyra_audit_jobs_created_at_idx
  on public.lyra_audit_jobs (created_at desc);

create table if not exists public.lyra_audit_runs (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references public.lyra_audit_jobs (id) on delete set null,
  job_type text not null,
  project_name text,
  status text not null,
  summary text,
  findings_added int not null default 0,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists lyra_audit_runs_created_at_idx
  on public.lyra_audit_runs (created_at desc);

comment on table public.lyra_projects is 'LYRA dashboard projects and findings (project_json matches Project type)';
comment on table public.lyra_audit_jobs is 'Queued audit/orchestration jobs for BullMQ worker';
comment on table public.lyra_audit_runs is 'Completed audit run summaries for orchestration UI';
