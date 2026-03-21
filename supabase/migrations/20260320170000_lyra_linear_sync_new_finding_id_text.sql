-- Finding IDs are not UUIDs in general (e.g. worker fallback "AppName-finding-0").
alter table public.lyra_linear_sync_new
  alter column finding_id type text using finding_id::text;
