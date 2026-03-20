"use client";

import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/api-fetch";
import { LYRA_ENQUEUE_SECRET_STORAGE_KEY } from "@/lib/auth-constants";
import type {
  LyraAuditJobRow,
  LyraAuditRunRow,
} from "@/lib/orchestration-jobs";

interface ProjectAuditHistoryProps {
  projectName: string;
}

function deltaVsPrior(
  current: number,
  prior: number | undefined
): string | null {
  if (prior === undefined) return null;
  const d = current - prior;
  if (d === 0) return "same as prior run";
  if (d > 0) return `+${d} vs prior run`;
  return `${d} vs prior run`;
}

function formatAuditLabel(
  jobType: string,
  payload?: Record<string, unknown>
): string {
  if (jobType === "onboard_project") return "Onboard project audit";
  if (jobType === "re_audit_project") return "Full re-audit";
  if (jobType === "synthesize_project") return "Synthesizer";
  if (jobType === "weekly_audit") return "Weekly portfolio audit";
  if (jobType === "audit_project") {
    if (payload && payload.visual_only === true) return "Visual audit";
    return "Project audit";
  }
  return jobType;
}

export function ProjectAuditHistory({ projectName }: ProjectAuditHistoryProps) {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [runs, setRuns] = useState<LyraAuditRunRow[]>([]);
  const [jobs, setJobs] = useState<LyraAuditJobRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [enqueueSecret, setEnqueueSecret] = useState<string>("");
  const [enqueueAuthOptional, setEnqueueAuthOptional] = useState(false);
  const [dispatching, setDispatching] = useState<string | null>(null);
  const [dispatchError, setDispatchError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const s = sessionStorage.getItem(LYRA_ENQUEUE_SECRET_STORAGE_KEY);
      if (s) setEnqueueSecret(s);
    } catch {
      /* ignore */
    }
  }, []);

  const persistSecret = (v: string) => {
    setEnqueueSecret(v);
    try {
      if (v.trim())
        sessionStorage.setItem(LYRA_ENQUEUE_SECRET_STORAGE_KEY, v.trim());
      else sessionStorage.removeItem(LYRA_ENQUEUE_SECRET_STORAGE_KEY);
    } catch {
      /* ignore */
    }
  };

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const res = await apiFetch(
        `/api/orchestration/runs?project=${encodeURIComponent(projectName)}`
      );
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        configured?: boolean;
        runs?: LyraAuditRunRow[];
        jobs?: LyraAuditJobRow[];
        enqueue_auth_optional?: boolean;
      };
      if (!res.ok) {
        setConfigured(null);
        setRuns([]);
        setJobs([]);
        setLoadError(data.error ?? `Failed (${res.status})`);
        return;
      }
      setConfigured(Boolean(data.configured));
      setRuns(Array.isArray(data.runs) ? data.runs : []);
      setJobs(Array.isArray(data.jobs) ? data.jobs : []);
      setEnqueueAuthOptional(Boolean(data.enqueue_auth_optional));
    } catch {
      setLoadError("Network error");
      setConfigured(null);
    }
  }, [projectName]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loadError) {
    return (
      <div
        style={{
          marginBottom: "1.25rem",
          fontSize: "11px",
          fontFamily: "var(--font-mono)",
          color: "var(--ink-red)",
        }}
      >
        audit history: {loadError}
      </div>
    );
  }

  if (configured === false) {
    return (
      <div
        style={{
          marginBottom: "1.25rem",
          fontSize: "10px",
          fontFamily: "var(--font-mono)",
          color: "var(--ink-text-4)",
          lineHeight: 1.45,
        }}
      >
        Worker audit history requires <code>DATABASE_URL</code> (Supabase). Runs are stored in{" "}
        <code>lyra_audit_runs</code> / <code>lyra_audit_jobs</code>.
      </div>
    );
  }

  if (configured === null) {
    return (
      <div
        style={{
          marginBottom: "1.25rem",
          fontSize: "10px",
          fontFamily: "var(--font-mono)",
          color: "var(--ink-text-4)",
        }}
      >
        audit history: loading…
      </div>
    );
  }

  const hasAny = runs.length > 0 || jobs.length > 0;
  const canEnqueue =
    configured === true &&
    (enqueueAuthOptional || enqueueSecret.trim().length > 0);

  const authHeaders = (): HeadersInit => {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    const s = enqueueSecret.trim();
    if (s) h.Authorization = `Bearer ${s}`;
    return h;
  };

  const enqueueAudit = async (
    key: string,
    payload: { job_type: string; project_name: string; payload?: Record<string, unknown> }
  ) => {
    setDispatchError(null);
    setDispatching(key);
    try {
      const res = await apiFetch("/api/orchestration/jobs", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? `Failed (${res.status})`);
      }
      await load();
    } catch (e) {
      setDispatchError(e instanceof Error ? e.message : String(e));
    } finally {
      setDispatching(null);
    }
  };

  const newest = runs[0];
  const second = runs[1];
  const spike =
    newest &&
    second &&
    newest.findings_added >= 5 &&
    newest.findings_added - second.findings_added >= 3;

  return (
    <div
      style={{
        marginBottom: "1.5rem",
        paddingBottom: "1rem",
        borderBottom: "0.5px solid var(--ink-border-faint)",
      }}
    >
      <div
        style={{
          fontSize: "9px",
          fontFamily: "var(--font-mono)",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "var(--ink-text-4)",
          marginBottom: "0.5rem",
        }}
      >
        Worker audit history
      </div>
      <div
        style={{
          fontSize: "10px",
          fontFamily: "var(--font-mono)",
          color: "var(--ink-text-4)",
          lineHeight: 1.45,
          marginBottom: "0.75rem",
        }}
      >
        Automated audits sample the mirror under <code>the_penny_lane_project/</code> — intelligence{" "}
        <code>*report*.md</code> excerpt plus up to <strong>12</strong> text files (~6k chars each), not a full
        repo. Interpret severity accordingly.
      </div>
      <div
        style={{
          marginBottom: "0.75rem",
          padding: "0.55rem 0.65rem",
          borderRadius: "var(--radius-md)",
          border: "0.5px solid var(--ink-border-faint)",
          background: "var(--ink-bg-sunken)",
        }}
      >
        <div
          style={{
            fontSize: "9px",
            fontFamily: "var(--font-mono)",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "var(--ink-text-4)",
            marginBottom: "0.4rem",
          }}
        >
          Manual audits
        </div>
        <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() =>
              enqueueAudit("onboard", {
                job_type: "onboard_project",
                project_name: projectName,
              })
            }
            disabled={!canEnqueue || dispatching === "onboard"}
            style={{ fontSize: "10px", fontFamily: "var(--font-mono)", padding: "3px 8px" }}
          >
            {dispatching === "onboard" ? "…" : "Run onboard"}
          </button>
          <button
            type="button"
            onClick={() =>
              enqueueAudit("visual", {
                job_type: "audit_project",
                project_name: projectName,
                payload: { visual_only: true },
              })
            }
            disabled={!canEnqueue || dispatching === "visual"}
            style={{ fontSize: "10px", fontFamily: "var(--font-mono)", padding: "3px 8px" }}
          >
            {dispatching === "visual" ? "…" : "Run visual audit"}
          </button>
          <button
            type="button"
            onClick={() =>
              enqueueAudit("full", {
                job_type: "re_audit_project",
                project_name: projectName,
              })
            }
            disabled={!canEnqueue || dispatching === "full"}
            style={{ fontSize: "10px", fontFamily: "var(--font-mono)", padding: "3px 8px" }}
          >
            {dispatching === "full" ? "…" : "Run full re-audit"}
          </button>
          <button
            type="button"
            onClick={() =>
              enqueueAudit("synth", {
                job_type: "synthesize_project",
                project_name: projectName,
              })
            }
            disabled={!canEnqueue || dispatching === "synth"}
            style={{ fontSize: "10px", fontFamily: "var(--font-mono)", padding: "3px 8px" }}
          >
            {dispatching === "synth" ? "…" : "Run synthesizer"}
          </button>
        </div>
        <div style={{ marginTop: "0.45rem", display: "flex", gap: "0.4rem", flexWrap: "wrap", alignItems: "center" }}>
          <input
            type="password"
            placeholder="ORCHESTRATION_ENQUEUE_SECRET"
            value={enqueueSecret}
            onChange={(e) => persistSecret(e.target.value)}
            style={{
              fontSize: "10px",
              fontFamily: "var(--font-mono)",
              width: "260px",
              maxWidth: "100%",
            }}
          />
          {!canEnqueue && (
            <span style={{ fontSize: "10px", color: "var(--ink-text-4)", fontFamily: "var(--font-mono)" }}>
              Secret required to enqueue manual audits
            </span>
          )}
        </div>
        {dispatchError && (
          <div style={{ marginTop: "0.45rem", fontSize: "10px", color: "var(--ink-red)", fontFamily: "var(--font-mono)" }}>
            {dispatchError}
          </div>
        )}
      </div>
      {spike && (
        <div
          style={{
            fontSize: "10px",
            fontFamily: "var(--font-mono)",
            color: "var(--ink-amber)",
            marginBottom: "0.65rem",
            lineHeight: 1.45,
          }}
        >
          Latest run added notably more findings than the previous completed run — review new items or drift in
          expectations.
        </div>
      )}
      {!hasAny && (
        <div style={{ fontSize: "10px", color: "var(--ink-text-4)", fontFamily: "var(--font-mono)" }}>
          No jobs or completed runs for this project yet. Enqueue onboard / re-audit from Orchestration.
        </div>
      )}
      {runs.length > 0 && (
        <div style={{ marginBottom: "0.75rem" }}>
          <div
            style={{
              fontSize: "10px",
              color: "var(--ink-text-3)",
              marginBottom: "0.35rem",
              fontFamily: "var(--font-mono)",
            }}
          >
            Completed runs ({runs.length})
          </div>
          <ul
            style={{
              margin: 0,
              paddingLeft: "1rem",
              fontSize: "10px",
              fontFamily: "var(--font-mono)",
              color: "var(--ink-text-2)",
              lineHeight: 1.5,
            }}
          >
            {runs.map((r, i) => {
              const older = runs[i + 1];
              const priorAdded = older?.findings_added;
              const delta = deltaVsPrior(r.findings_added, priorAdded);
              return (
              <li key={r.id} style={{ marginBottom: "0.4rem" }}>
                <span style={{ color: "var(--ink-text-4)" }}>
                  {r.created_at.slice(0, 19).replace("T", " ")}
                </span>{" "}
                <strong>{formatAuditLabel(r.job_type, r.payload)}</strong> · {r.status} · +{r.findings_added} findings
                {delta && (
                  <span style={{ color: "var(--ink-text-3)" }}> · {delta}</span>
                )}
                {r.job_id && (
                  <span style={{ color: "var(--ink-text-4)" }}> · job {r.job_id.slice(0, 8)}…</span>
                )}
                {r.summary && (
                  <div style={{ marginTop: "0.2rem", color: "var(--ink-text-3)", whiteSpace: "pre-wrap" }}>
                    {r.summary}
                  </div>
                )}
                <details style={{ marginTop: "0.3rem" }}>
                  <summary style={{ cursor: "pointer", color: "var(--ink-text-4)" }}>Raw run payload</summary>
                  <pre
                    style={{
                      marginTop: "0.3rem",
                      padding: "0.5rem",
                      background: "var(--ink-bg-sunken)",
                      border: "0.5px solid var(--ink-border-faint)",
                      borderRadius: "var(--radius-md)",
                      overflowX: "auto",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                      color: "var(--ink-text-3)",
                    }}
                  >
                    {JSON.stringify(r.payload ?? {}, null, 2)}
                  </pre>
                </details>
              </li>
            );
            })}
          </ul>
        </div>
      )}
      {jobs.length > 0 && (
        <div>
          <div
            style={{
              fontSize: "10px",
              color: "var(--ink-text-3)",
              marginBottom: "0.35rem",
              fontFamily: "var(--font-mono)",
            }}
          >
            Recent jobs ({jobs.length})
          </div>
          <ul
            style={{
              margin: 0,
              paddingLeft: "1rem",
              fontSize: "10px",
              fontFamily: "var(--font-mono)",
              color: "var(--ink-text-2)",
              lineHeight: 1.45,
            }}
          >
            {jobs.map((j) => (
              <li key={j.id} style={{ marginBottom: "0.25rem" }}>
                {j.created_at.slice(0, 19).replace("T", " ")} · {formatAuditLabel(j.job_type, j.payload)} ·{" "}
                <span
                  style={{
                    color:
                      j.status === "failed"
                        ? "var(--ink-red)"
                        : j.status === "completed"
                          ? "var(--ink-green)"
                          : "var(--ink-amber)",
                  }}
                >
                  {j.status}
                </span>
                {j.error && (
                  <span style={{ color: "var(--ink-red)" }}> — {j.error.slice(0, 120)}</span>
                )}
                <details style={{ marginTop: "0.25rem" }}>
                  <summary style={{ cursor: "pointer", color: "var(--ink-text-4)" }}>Job payload and status detail</summary>
                  <pre
                    style={{
                      marginTop: "0.3rem",
                      padding: "0.5rem",
                      background: "var(--ink-bg-sunken)",
                      border: "0.5px solid var(--ink-border-faint)",
                      borderRadius: "var(--radius-md)",
                      overflowX: "auto",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                      color: "var(--ink-text-3)",
                    }}
                  >
                    {JSON.stringify(
                      {
                        id: j.id,
                        type: j.job_type,
                        status: j.status,
                        project_name: j.project_name,
                        created_at: j.created_at,
                        started_at: j.started_at,
                        finished_at: j.finished_at,
                        error: j.error,
                        payload: j.payload ?? {},
                      },
                      null,
                      2
                    )}
                  </pre>
                </details>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
