-- Canonical maintenance backlog and task-planning records.

create table if not exists public.lyra_maintenance_backlog (
  id uuid primary key default gen_random_uuid(),
  project_name text not null references public.lyra_projects (name) on delete cascade,
  title text not null,
  summary text,
  canonical_status text not null default 'open'
    check (canonical_status in ('open', 'planned', 'in_progress', 'blocked', 'deferred', 'done')),
  source_type text not null default 'finding'
    check (source_type in ('finding', 'scanner_import', 'historical_receipt', 'todo_import', 'manual')),
  priority text not null default 'P2'
    check (priority in ('P0', 'P1', 'P2', 'P3')),
  severity text not null default 'minor'
    check (severity in ('blocker', 'major', 'minor', 'nit')),
  risk_class text not null default 'medium'
    check (risk_class in ('low', 'medium', 'high', 'critical')),
  next_action text not null default 'review'
    check (next_action in ('review', 'plan_task', 'queue_repair', 'verify', 're_audit', 'defer')),
  finding_ids jsonb not null default '[]'::jsonb,
  dedupe_keys jsonb not null default '[]'::jsonb,
  duplicate_of uuid references public.lyra_maintenance_backlog (id) on delete set null,
  blocked_reason text,
  provenance jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists lyra_maintenance_backlog_project_updated_idx
  on public.lyra_maintenance_backlog (project_name, updated_at desc);

create index if not exists lyra_maintenance_backlog_status_priority_idx
  on public.lyra_maintenance_backlog (canonical_status, priority, updated_at desc);

create table if not exists public.lyra_maintenance_tasks (
  id uuid primary key default gen_random_uuid(),
  project_name text not null references public.lyra_projects (name) on delete cascade,
  backlog_id uuid not null references public.lyra_maintenance_backlog (id) on delete cascade,
  title text not null,
  intended_outcome text not null,
  status text not null default 'draft'
    check (status in ('draft', 'ready', 'approved', 'running', 'blocked', 'verified', 'done')),
  target_domains jsonb not null default '[]'::jsonb,
  target_files jsonb not null default '[]'::jsonb,
  risk_class text not null default 'medium'
    check (risk_class in ('low', 'medium', 'high', 'critical')),
  verification_profile text
    check (verification_profile in ('none', 'targeted', 'project', 'manual')),
  verification_commands jsonb not null default '[]'::jsonb,
  rollback_notes text,
  notes text,
  provenance jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists lyra_maintenance_tasks_project_updated_idx
  on public.lyra_maintenance_tasks (project_name, updated_at desc);

create index if not exists lyra_maintenance_tasks_backlog_idx
  on public.lyra_maintenance_tasks (backlog_id, updated_at desc);

alter table public.lyra_repair_jobs
  add column if not exists maintenance_task_id uuid references public.lyra_maintenance_tasks (id) on delete set null,
  add column if not exists backlog_id uuid references public.lyra_maintenance_backlog (id) on delete set null,
  add column if not exists provenance jsonb not null default '{}'::jsonb;

comment on table public.lyra_maintenance_backlog is 'Canonical normalized maintenance backlog across findings, imported debt, and scanner inputs';
comment on table public.lyra_maintenance_tasks is 'Bounded execution plans that sit between backlog items and repair jobs';
