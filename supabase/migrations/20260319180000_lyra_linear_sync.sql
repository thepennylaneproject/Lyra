-- Linear issue ↔ finding mappings (serverless-safe when using DATABASE_URL).

create table if not exists public.lyra_linear_sync (
  project_name text primary key,
  state jsonb not null default '{"mappings": {}, "last_sync": null}'::jsonb,
  updated_at timestamptz not null default now()
);

create index if not exists lyra_linear_sync_updated_at_idx
  on public.lyra_linear_sync (updated_at desc);

alter table public.lyra_linear_sync enable row level security;

comment on table public.lyra_linear_sync is
  'Linear sync mappings per project. RLS enabled; dashboard uses service role / DATABASE_URL.';
