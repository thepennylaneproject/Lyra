-- Add FK from lyra_audit_jobs and lyra_audit_runs.project_name to lyra_projects(name).
-- Backfill: null out project_name where the project no longer exists.

-- Jobs: clear orphan project_name
UPDATE public.lyra_audit_jobs
SET project_name = NULL
WHERE project_name IS NOT NULL
  AND project_name NOT IN (SELECT name FROM public.lyra_projects);

-- Runs: clear orphan project_name
UPDATE public.lyra_audit_runs
SET project_name = NULL
WHERE project_name IS NOT NULL
  AND project_name NOT IN (SELECT name FROM public.lyra_projects);

-- FK: jobs
ALTER TABLE public.lyra_audit_jobs
  ADD CONSTRAINT lyra_audit_jobs_project_name_fkey
  FOREIGN KEY (project_name) REFERENCES public.lyra_projects(name) ON DELETE SET NULL;

-- FK: runs
ALTER TABLE public.lyra_audit_runs
  ADD CONSTRAINT lyra_audit_runs_project_name_fkey
  FOREIGN KEY (project_name) REFERENCES public.lyra_projects(name) ON DELETE SET NULL;

comment on constraint lyra_audit_jobs_project_name_fkey on public.lyra_audit_jobs is 'Job must reference existing project or null (e.g. deleted project)';
comment on constraint lyra_audit_runs_project_name_fkey on public.lyra_audit_runs is 'Run must reference existing project or null';
