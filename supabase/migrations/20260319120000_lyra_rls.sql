-- Row Level Security: lock down lyra_* for Supabase PostgREST (anon/authenticated).
-- Direct Postgres (DATABASE_URL) as table owner or service_role bypasses RLS.

alter table public.lyra_projects enable row level security;
alter table public.lyra_audit_jobs enable row level security;
alter table public.lyra_audit_runs enable row level security;

-- No policies for anon/authenticated => no access via Supabase client keys.
-- Application server using owner/service credentials retains full access.

comment on table public.lyra_projects is
  'LYRA dashboard projects. RLS enabled; use service role or direct DB for app access.';
