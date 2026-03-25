-- Functional indexes for normalized project-name lookups used on hot dashboard/worker paths.

create index if not exists lyra_projects_name_lookup_idx
  on public.lyra_projects ((lower(btrim(name))));

create index if not exists lyra_audit_jobs_project_lookup_created_idx
  on public.lyra_audit_jobs ((lower(btrim(project_name))), created_at desc)
  where project_name is not null;

create index if not exists lyra_audit_runs_project_lookup_created_idx
  on public.lyra_audit_runs ((lower(btrim(project_name))), created_at desc)
  where project_name is not null;

create index if not exists lyra_project_manifests_project_lookup_generated_idx
  on public.lyra_project_manifests ((lower(btrim(project_name))), generated_at desc);

create index if not exists lyra_repair_jobs_project_lookup_created_idx
  on public.lyra_repair_jobs ((lower(btrim(project_name))), created_at desc);

create index if not exists lyra_repair_jobs_project_finding_status_idx
  on public.lyra_repair_jobs ((lower(btrim(project_name))), finding_id, status);

create index if not exists lyra_maintenance_backlog_project_lookup_updated_idx
  on public.lyra_maintenance_backlog ((lower(btrim(project_name))), updated_at desc);

create index if not exists lyra_maintenance_tasks_project_lookup_updated_idx
  on public.lyra_maintenance_tasks ((lower(btrim(project_name))), updated_at desc);
