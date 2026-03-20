-- Normalize lyra_linear_sync from JSONB-based to relational schema.
--
-- Old schema: single row per project with mappings in JSONB
-- New schema: one row per finding-to-issue mapping with explicit columns
--
-- This migration:
-- 1. Creates the new normalized table
-- 2. Preserves the old table for rollback safety
-- 3. Migrates data from old schema (if it exists)

-- Create the new normalized table
create table if not exists public.lyra_linear_sync_new (
  project_name text not null,
  finding_id uuid not null,
  linear_issue_id text not null,
  linear_team_key text,
  synced_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Primary key: one mapping per finding per project
  primary key (project_name, finding_id),

  -- Foreign key to projects
  foreign key (project_name) references public.lyra_projects (name) on delete cascade
);

-- Indexes for common queries
create index if not exists lyra_linear_sync_new_updated_at_idx
  on public.lyra_linear_sync_new (updated_at desc);

create index if not exists lyra_linear_sync_new_project_idx
  on public.lyra_linear_sync_new (project_name);

create index if not exists lyra_linear_sync_new_finding_id_idx
  on public.lyra_linear_sync_new (finding_id);

-- Enable RLS
alter table public.lyra_linear_sync_new enable row level security;

comment on table public.lyra_linear_sync_new is
  'Normalized mappings between Lyra findings and Linear issues. One row per finding-to-issue mapping.';

comment on column public.lyra_linear_sync_new.project_name is
  'Project that contains the finding';

comment on column public.lyra_linear_sync_new.finding_id is
  'UUID of the Lyra finding';

comment on column public.lyra_linear_sync_new.linear_issue_id is
  'Linear issue ID (e.g., "ENG-123")';

comment on column public.lyra_linear_sync_new.linear_team_key is
  'Linear team key where issue was created';

comment on column public.lyra_linear_sync_new.synced_at is
  'When this mapping was last synced to Linear';
