-- DATA-001: Add optimistic-locking version column to lyra_projects.
--
-- Every write path does a read-modify-write on the full project_json with no
-- version check, making concurrent writes (status edit, audit, Linear pull) silently
-- overwrite each other.  Adding a monotone version counter lets write routes
-- check the version they read against the current DB version and return 409 when
-- they are stale, preventing lost updates without full table locking.
--
-- Application changes needed (not yet implemented — tracked as DATA-001):
--   - READ paths: include `version` in responses alongside `project_json`.
--   - WRITE paths (UPDATE): add `AND version = $client_version` to the WHERE
--     clause and `version = version + 1` to the SET clause.
--     If 0 rows are affected → return 409 Conflict so the client can retry.
--   - This migration only provisions the column and backfills initial values;
--     no existing write paths are changed here.  Existing writes will continue
--     to succeed (they don't reference the version column) but will NOT increment
--     it.  The full optimistic-lock enforcement must be wired up before relying
--     on version-gated conflict detection.

-- Backfill existing rows with a unique starting version.
-- Using the row's created/updated ordering keeps values monotone.
do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'lyra_projects'
      and column_name  = 'version'
  ) then
    alter table public.lyra_projects
      add column version bigint not null default 1;

    -- Give each existing row a distinct starting version to avoid false
    -- conflicts if clients happen to have cached version = 1.
    update public.lyra_projects
    set version = sub.rn
    from (
      select name,
             row_number() over (order by updated_at asc) as rn
      from   public.lyra_projects
    ) sub
    where public.lyra_projects.name = sub.name;
  end if;
end $$;

comment on column public.lyra_projects.version is
  'Monotonically incrementing write counter used for optimistic concurrency control. '
  'Read the version alongside project_json; include it in writes and reject with 409 if '
  'the DB version no longer matches (another writer committed first).';
