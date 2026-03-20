/**
 * lyra_audit_jobs / lyra_audit_runs — shared types and DB access for dashboard API + worker alignment.
 */

import { createPostgresPool, readDatabaseConfig } from "./postgres";
import { randomUUID } from "node:crypto";

export type LyraJobType =
  | "weekly_audit"
  | "onboard_project"
  | "re_audit_project"
  | "synthesize_project"
  | "audit_project";

export type LyraJobStatus = "queued" | "running" | "completed" | "failed";

export interface LyraAuditJobRow {
  id: string;
  job_type: string;
  project_name: string | null;
  repository_url: string | null;
  status: LyraJobStatus;
  payload: Record<string, unknown>;
  error: string | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
}

export interface LyraAuditRunRow {
  id: string;
  job_id: string | null;
  job_type: string;
  project_name: string | null;
  status: string;
  summary: string | null;
  findings_added: number;
  payload: Record<string, unknown>;
  created_at: string;
}

function pool() {
  return createPostgresPool();
}

function rowJob(r: Record<string, unknown>): LyraAuditJobRow {
  return {
    id: String(r.id),
    job_type: String(r.job_type),
    project_name: r.project_name != null ? String(r.project_name) : null,
    repository_url: r.repository_url != null ? String(r.repository_url) : null,
    status: r.status as LyraJobStatus,
    payload:
      typeof r.payload === "object" && r.payload !== null
        ? (r.payload as Record<string, unknown>)
        : {},
    error: r.error != null ? String(r.error) : null,
    created_at:
      r.created_at instanceof Date
        ? r.created_at.toISOString()
        : String(r.created_at),
    started_at:
      r.started_at instanceof Date
        ? r.started_at.toISOString()
        : r.started_at != null
          ? String(r.started_at)
          : null,
    finished_at:
      r.finished_at instanceof Date
        ? r.finished_at.toISOString()
        : r.finished_at != null
          ? String(r.finished_at)
          : null,
  };
}

function rowRun(r: Record<string, unknown>): LyraAuditRunRow {
  return {
    id: String(r.id),
    job_id: r.job_id != null ? String(r.job_id) : null,
    job_type: String(r.job_type),
    project_name: r.project_name != null ? String(r.project_name) : null,
    status: String(r.status),
    summary: r.summary != null ? String(r.summary) : null,
    findings_added: Number(r.findings_added ?? 0),
    payload:
      typeof r.payload === "object" && r.payload !== null
        ? (r.payload as Record<string, unknown>)
        : {},
    created_at:
      r.created_at instanceof Date
        ? r.created_at.toISOString()
        : String(r.created_at),
  };
}

export function jobsStoreConfigured(): boolean {
  return readDatabaseConfig().configured;
}

export async function insertAuditJob(
  jobType: LyraJobType,
  opts: {
    project_name?: string | null;
    repository_url?: string | null;
    payload?: Record<string, unknown>;
  } = {}
): Promise<LyraAuditJobRow> {
  const id = randomUUID();
  const p = pool();
  const rows = await p.query(
    `INSERT INTO lyra_audit_jobs (id, job_type, project_name, repository_url, status, payload)
     VALUES ($1, $2, $3, $4, 'queued', $5::jsonb)
     RETURNING *`,
    [
      id,
      jobType,
      opts.project_name ?? null,
      opts.repository_url ?? null,
      JSON.stringify(opts.payload ?? {}),
    ]
  );
  return rowJob(rows[0]);
}

export async function listRecentAuditJobs(limit = 25): Promise<LyraAuditJobRow[]> {
  const p = pool();
  const rows = await p.query(
    `SELECT * FROM lyra_audit_jobs ORDER BY created_at DESC LIMIT $1`,
    [limit]
  );
  return rows.map(rowJob);
}

export async function listRecentAuditRuns(limit = 15): Promise<LyraAuditRunRow[]> {
  const p = pool();
  const rows = await p.query(
    `SELECT * FROM lyra_audit_runs ORDER BY created_at DESC LIMIT $1`,
    [limit]
  );
  return rows.map(rowRun);
}

/** Completed runs for one project (case-insensitive name match). */
export async function listAuditRunsForProject(
  projectName: string,
  limit = 30
): Promise<LyraAuditRunRow[]> {
  const p = pool();
  const rows = await p.query(
    `SELECT * FROM lyra_audit_runs
     WHERE project_name IS NOT NULL
       AND LOWER(TRIM(project_name)) = LOWER(TRIM($1))
     ORDER BY created_at DESC
     LIMIT $2`,
    [projectName, limit]
  );
  return rows.map(rowRun);
}

/** Job rows for one project (queued/running/history). */
export async function listAuditJobsForProject(
  projectName: string,
  limit = 20
): Promise<LyraAuditJobRow[]> {
  const p = pool();
  const rows = await p.query(
    `SELECT * FROM lyra_audit_jobs
     WHERE project_name IS NOT NULL
       AND LOWER(TRIM(project_name)) = LOWER(TRIM($1))
     ORDER BY created_at DESC
     LIMIT $2`,
    [projectName, limit]
  );
  return rows.map(rowJob);
}

export async function getAuditJob(id: string): Promise<LyraAuditJobRow | null> {
  const p = pool();
  const rows = await p.query(`SELECT * FROM lyra_audit_jobs WHERE id = $1`, [
    id,
  ]);
  return rows[0] ? rowJob(rows[0]) : null;
}

/** Mark every queued job failed (e.g. operator cancelled / queue reset). */
export async function failAllQueuedJobs(errorMessage: string): Promise<number> {
  const p = pool();
  const rows = await p.query(
    `UPDATE lyra_audit_jobs
     SET status = 'failed', finished_at = now(), error = $1
     WHERE status = 'queued'
     RETURNING id`,
    [errorMessage]
  );
  return rows.length;
}

/** Update status (and optionally error message) for a specific job row. */
export async function updateAuditJobStatus(
  id: string,
  status: LyraJobStatus,
  error?: string
): Promise<void> {
  const p = pool();
  await p.query(
    `UPDATE lyra_audit_jobs
     SET status = $2, finished_at = CASE WHEN $2 IN ('completed','failed') THEN now() ELSE finished_at END, error = $3
     WHERE id = $1`,
    [id, status, error ?? null]
  );
}
