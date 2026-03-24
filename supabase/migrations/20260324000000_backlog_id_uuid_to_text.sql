-- Migrate lyra_maintenance_backlog.id (and related FK columns) from uuid to text.
--
-- The worker and dashboard both insert deterministic text keys of the form
-- 'backlog-{project_name}-{finding_id}' — these are not valid UUIDs, so the
-- uuid column type was silently failing every INSERT attempt.
--
-- Changes:
--   lyra_maintenance_backlog.id          uuid → text  (PK)
--   lyra_maintenance_backlog.duplicate_of uuid → text  (self-ref FK)
--   lyra_maintenance_tasks.backlog_id     uuid → text  (FK to backlog)
--   lyra_repair_jobs.backlog_id           uuid → text  (FK to backlog)
--
-- lyra_maintenance_tasks.id and lyra_repair_jobs.maintenance_task_id are NOT
-- changed — those use gen_random_uuid() and are never set by application code.

-- 1. Drop FKs that reference or live on the columns being altered
ALTER TABLE lyra_maintenance_backlog
  DROP CONSTRAINT IF EXISTS lyra_maintenance_backlog_duplicate_of_fkey;

ALTER TABLE lyra_maintenance_tasks
  DROP CONSTRAINT IF EXISTS lyra_maintenance_tasks_backlog_id_fkey;

ALTER TABLE lyra_repair_jobs
  DROP CONSTRAINT IF EXISTS lyra_repair_jobs_backlog_id_fkey;

-- 2. Drop and recreate the primary key with text type
ALTER TABLE lyra_maintenance_backlog
  DROP CONSTRAINT lyra_maintenance_backlog_pkey;

ALTER TABLE lyra_maintenance_backlog
  ALTER COLUMN id           TYPE text USING id::text,
  ALTER COLUMN id           SET DEFAULT gen_random_uuid()::text,
  ALTER COLUMN duplicate_of TYPE text USING duplicate_of::text;

ALTER TABLE lyra_maintenance_backlog
  ADD PRIMARY KEY (id);

-- 3. Change the FK column types in dependent tables
ALTER TABLE lyra_maintenance_tasks
  ALTER COLUMN backlog_id TYPE text USING backlog_id::text;

ALTER TABLE lyra_repair_jobs
  ALTER COLUMN backlog_id TYPE text USING backlog_id::text;

-- 4. Re-add FK constraints
ALTER TABLE lyra_maintenance_backlog
  ADD CONSTRAINT lyra_maintenance_backlog_duplicate_of_fkey
    FOREIGN KEY (duplicate_of)
    REFERENCES lyra_maintenance_backlog (id)
    ON DELETE SET NULL;

ALTER TABLE lyra_maintenance_tasks
  ADD CONSTRAINT lyra_maintenance_tasks_backlog_id_fkey
    FOREIGN KEY (backlog_id)
    REFERENCES lyra_maintenance_backlog (id)
    ON DELETE CASCADE;

ALTER TABLE lyra_repair_jobs
  ADD CONSTRAINT lyra_repair_jobs_backlog_id_fkey
    FOREIGN KEY (backlog_id)
    REFERENCES lyra_maintenance_backlog (id)
    ON DELETE SET NULL;
