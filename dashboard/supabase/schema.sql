create table if not exists lyra_orchestration_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  project_name text,
  source text not null,
  summary text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists lyra_orchestration_events_created_at_idx
  on lyra_orchestration_events (created_at desc);

create table if not exists lyra_project_snapshots (
  project_name text primary key,
  source text not null,
  summary text not null,
  project_json jsonb not null,
  updated_at timestamptz not null default now()
);

create index if not exists lyra_project_snapshots_updated_at_idx
  on lyra_project_snapshots (updated_at desc);
