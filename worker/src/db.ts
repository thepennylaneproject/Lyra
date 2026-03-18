import pg from "pg";

const { Pool } = pg;

export function createPool(): pg.Pool {
  const url =
    process.env.DATABASE_URL?.trim() ||
    process.env.LYRA_DATABASE_URL?.trim() ||
    "";
  if (!url) throw new Error("DATABASE_URL is required");
  return new Pool({
    connectionString: url,
    ssl: url.includes("localhost") ? false : { rejectUnauthorized: false },
    max: 5,
  });
}

export interface JobRow {
  id: string;
  job_type: string;
  project_name: string | null;
  repository_url: string | null;
  status: string;
  payload: Record<string, unknown>;
}

export async function claimJob(
  pool: pg.Pool,
  jobId: string
): Promise<JobRow | null> {
  const r = await pool.query(
    `UPDATE lyra_audit_jobs
     SET status = 'running', started_at = COALESCE(started_at, now())
     WHERE id = $1 AND status = 'queued'
     RETURNING id, job_type, project_name, repository_url, status, payload`,
    [jobId]
  );
  if (r.rows.length === 0) return null;
  const row = r.rows[0];
  return {
    id: row.id,
    job_type: row.job_type,
    project_name: row.project_name,
    repository_url: row.repository_url,
    status: row.status,
    payload:
      typeof row.payload === "object" && row.payload ? row.payload : {},
  };
}

export async function completeJob(
  pool: pg.Pool,
  jobId: string,
  error: string | null,
  run: {
    job_type: string;
    project_name: string | null;
    summary: string;
    findings_added: number;
    payload?: Record<string, unknown>;
  }
): Promise<void> {
  const status = error ? "failed" : "completed";
  await pool.query(
    `UPDATE lyra_audit_jobs SET status = $2, finished_at = now(), error = $3 WHERE id = $1`,
    [jobId, status, error]
  );
  await pool.query(
    `INSERT INTO lyra_audit_runs (job_id, job_type, project_name, status, summary, findings_added, payload)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)`,
    [
      jobId,
      run.job_type,
      run.project_name,
      status,
      run.summary,
      run.findings_added,
      JSON.stringify(run.payload ?? {}),
    ]
  );
}

export async function loadProject(
  pool: pg.Pool,
  name: string
): Promise<{
  name: string;
  findings: unknown[];
  repositoryUrl?: string;
  lastUpdated?: string;
} | null> {
  const r = await pool.query(
    `SELECT project_json FROM lyra_projects WHERE name = $1`,
    [name]
  );
  if (r.rows.length === 0) return null;
  const j = r.rows[0].project_json;
  const p = typeof j === "string" ? JSON.parse(j) : j;
  return {
    name: p.name || name,
    findings: Array.isArray(p.findings) ? p.findings : [],
    repositoryUrl: p.repositoryUrl,
    lastUpdated: p.lastUpdated,
  };
}

export async function saveProject(
  pool: pg.Pool,
  project: {
    name: string;
    findings: unknown[];
    repositoryUrl?: string | null;
    lastUpdated?: string;
  }
): Promise<void> {
  const body = {
    name: project.name,
    findings: project.findings,
    repositoryUrl: project.repositoryUrl ?? undefined,
    lastUpdated: project.lastUpdated ?? new Date().toISOString(),
  };
  await pool.query(
    `INSERT INTO lyra_projects (name, repository_url, project_json, updated_at)
     VALUES ($1, $2, $3::jsonb, now())
     ON CONFLICT (name) DO UPDATE SET
       repository_url = COALESCE(EXCLUDED.repository_url, lyra_projects.repository_url),
       project_json = EXCLUDED.project_json,
       updated_at = now()`,
    [project.name, project.repositoryUrl ?? null, JSON.stringify(body)]
  );
}

export async function listAllProjects(
  pool: pg.Pool
): Promise<Array<{ name: string; findings: unknown[] }>> {
  const r = await pool.query(`SELECT project_json FROM lyra_projects`);
  return r.rows.map((row) => {
    const j =
      typeof row.project_json === "string"
        ? JSON.parse(row.project_json)
        : row.project_json;
    return {
      name: j.name,
      findings: Array.isArray(j.findings) ? j.findings : [],
    };
  });
}
