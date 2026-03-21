-- Lyra durable state: event log and project snapshots for operational observability

create table if not exists public.lyra_orchestration_events (
  id uuid primary key,
  event_type text not null,
  project_name text,
  source text not null,
  summary text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists lyra_orchestration_events_created_at_idx
  on public.lyra_orchestration_events (created_at desc);

create index if not exists lyra_orchestration_events_project_created_idx
  on public.lyra_orchestration_events (project_name, created_at desc);

comment on table public.lyra_orchestration_events is 'Durable event log for audit jobs, repairs, linear syncs, and operational decisions across the portfolio';


create table if not exists public.lyra_project_snapshots (
  project_name text primary key,
  source text not null,
  summary text not null,
  project_json jsonb not null,
  updated_at timestamptz not null default now()
);

create index if not exists lyra_project_snapshots_updated_at_idx
  on public.lyra_project_snapshots (updated_at desc);

comment on table public.lyra_project_snapshots is 'Point-in-time project state snapshots for audit trail and state recovery';
