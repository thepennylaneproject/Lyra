-- DATA-005: Add foreign key from lyra_linear_sync.project_name to lyra_projects(name).
--
-- Without this FK, deleting a project leaves orphan sync mappings behind.
-- The UI then reports spurious `in_linear_only` counts and pull/retry actions
-- can reference findings that no longer exist.
--
-- Cleanup: Remove sync rows whose project has already been deleted, then add
-- the FK with ON DELETE CASCADE so future project deletes automatically clean
-- up their sync state.

-- Phase 1: Delete orphan sync rows (project was deleted but sync row remains).
delete from public.lyra_linear_sync
where project_name not in (select name from public.lyra_projects);

-- Phase 2: Add FK with NOT VALID so the constraint applies to new rows
--          immediately without requiring a full-table scan here.
alter table public.lyra_linear_sync
  add constraint lyra_linear_sync_project_name_fkey
  foreign key (project_name)
  references public.lyra_projects (name)
  on delete cascade
  not valid;

-- Phase 3: Validate against existing rows (Phase 1 ensures this will succeed).
alter table public.lyra_linear_sync
  validate constraint lyra_linear_sync_project_name_fkey;

comment on constraint lyra_linear_sync_project_name_fkey on public.lyra_linear_sync is
  'Sync state must reference an existing project. Cascade-delete cleans up mappings when a project is removed.';
