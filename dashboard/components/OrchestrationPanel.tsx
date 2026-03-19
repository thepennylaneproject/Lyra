"use client";

import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/api-fetch";
import type { PortfolioOrchestrationState, OrchestrationActionKind } from "@/lib/orchestration";
import type { DurableStateSummary } from "@/lib/durable-state";
import type { LyraAuditJobRow, LyraAuditRunRow } from "@/lib/orchestration-jobs";

const STAGE_LABELS: Record<string, string> = {
  onboarding: "onboarding",
  visual_audit_missing: "visual missing",
  audit_due: "audit due",
  repair_in_progress: "repairing",
  current: "current",
  manual_override: "override",
};

const DISPATCHABLE_ACTIONS = new Set<OrchestrationActionKind>([
  "onboard_project",
  "run_visual_audit",
  "run_full_audit",
  "run_synthesizer",
]);

const STORAGE_KEY = "lyra_enqueue_secret";

function actionToJob(
  action: OrchestrationActionKind,
  projectName?: string
): {
  job_type: string;
  project_name?: string | null;
  payload?: Record<string, unknown>;
} {
  switch (action) {
    case "onboard_project":
      return {
        job_type: "onboard_project",
        project_name: projectName ?? null,
      };
    case "run_visual_audit":
      return {
        job_type: "audit_project",
        project_name: projectName ?? null,
        payload: { visual_only: true },
      };
    case "run_full_audit":
      return {
        job_type: "re_audit_project",
        project_name: projectName ?? null,
      };
    case "run_synthesizer":
      return { job_type: "synthesize_project", project_name: projectName ?? null };
    default:
      return { job_type: "audit_project", project_name: projectName ?? null };
  }
}

export function OrchestrationPanel() {
  const [data, setData] = useState<PortfolioOrchestrationState | null>(null);
  const [jobs, setJobs] = useState<LyraAuditJobRow[]>([]);
  const [runs, setRuns] = useState<LyraAuditRunRow[]>([]);
  const [jobsConfigured, setJobsConfigured] = useState(false);
  const [redisConfigured, setRedisConfigured] = useState(false);
  const [durable, setDurable] = useState<DurableStateSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [dispatching, setDispatching] = useState<string | null>(null);
  const [overrideProject, setOverrideProject] = useState<string>("");
  const [overrideAction, setOverrideAction] = useState<OrchestrationActionKind>("run_full_audit");
  const [enqueueSecret, setEnqueueSecret] = useState<string>("");
  const [enqueueAuthOptional, setEnqueueAuthOptional] = useState(false);

  useEffect(() => {
    try {
      const s = sessionStorage.getItem(STORAGE_KEY);
      if (s) setEnqueueSecret(s);
    } catch {
      /* ignore */
    }
  }, []);

  const persistSecret = (v: string) => {
    setEnqueueSecret(v);
    try {
      if (v.trim()) sessionStorage.setItem(STORAGE_KEY, v.trim());
      else sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  };

  const load = useCallback(async () => {
    const [orchestrationRes, jobsRes, durableRes] = await Promise.all([
      apiFetch("/api/orchestration"),
      apiFetch("/api/orchestration/jobs"),
      apiFetch("/api/durable-state"),
    ]);

    if (orchestrationRes.ok) {
      setData(await orchestrationRes.json());
    }
    if (jobsRes.ok) {
      const j = await jobsRes.json();
      setJobsConfigured(Boolean(j.configured));
      setRedisConfigured(Boolean(j.redis_configured));
      setEnqueueAuthOptional(Boolean(j.enqueue_auth_optional));
      setJobs(Array.isArray(j.jobs) ? j.jobs : []);
      setRuns(Array.isArray(j.runs) ? j.runs : []);
    } else {
      setJobsConfigured(false);
      setJobs([]);
      setRuns([]);
    }
    if (durableRes.ok) {
      const payload = await durableRes.json();
      setDurable(payload.state ?? null);
    } else {
      setDurable(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        await load();
      } finally {
        if (cancelled) return;
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [load]);

  const authHeaders = (): HeadersInit => {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    const s = enqueueSecret.trim();
    if (s) {
      h.Authorization = `Bearer ${s}`;
    }
    return h;
  };

  const dispatchAction = useCallback(
    async (action: OrchestrationActionKind, projectName?: string) => {
      setDispatching(projectName ? `${action}:${projectName}` : action);
      try {
        const body = actionToJob(action, projectName);
        const res = await apiFetch("/api/orchestration/jobs", {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error ?? `Failed (${res.status})`);
        }
        await load();
      } finally {
        setDispatching(null);
      }
    },
    [load, enqueueSecret]
  );

  const enqueueWeekly = useCallback(async () => {
    setDispatching("weekly_audit");
    try {
      const res = await apiFetch("/api/orchestration/jobs", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify({ job_type: "weekly_audit" }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? `Failed (${res.status})`);
      }
      await load();
    } finally {
      setDispatching(null);
    }
  }, [load, enqueueSecret]);

  if (loading) {
    return (
      <div style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--ink-text-4)", marginBottom: "1rem" }}>
        orchestration: loading…
      </div>
    );
  }

  if (!data) return null;

  const canEnqueue =
    jobsConfigured &&
    (enqueueAuthOptional || enqueueSecret.trim().length > 0);

  return (
    <section
      style={{
        background: "var(--ink-bg-raised)",
        border: "0.5px solid var(--ink-border-faint)",
        borderRadius: "var(--radius-lg)",
        padding: "1rem 1.25rem",
        marginBottom: "1.5rem",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", marginBottom: "0.75rem", alignItems: "baseline" }}>
        <div style={{ fontSize: "9px", fontFamily: "var(--font-mono)", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-text-4)" }}>
          Orchestration (Supabase + BullMQ)
        </div>
        <div style={{ fontSize: "10px", fontFamily: "var(--font-mono)", color: jobsConfigured ? "var(--ink-green)" : "var(--ink-amber)" }}>
          {jobsConfigured ? `jobs DB · redis ${redisConfigured ? "on" : "poll mode"}` : "DATABASE_URL + migrations required"}
        </div>
      </div>

      <div style={{ marginBottom: "0.75rem" }}>
        <label style={{ fontSize: "9px", color: "var(--ink-text-4)", display: "block", marginBottom: "0.25rem" }}>
          ORCHESTRATION_ENQUEUE_SECRET (stored in session only)
        </label>
        <input
          type="password"
          placeholder="paste secret to enable Run buttons"
          value={enqueueSecret}
          onChange={(e) => persistSecret(e.target.value)}
          style={{ width: "100%", maxWidth: "320px", fontSize: "11px", fontFamily: "var(--font-mono)" }}
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
          gap: "1rem",
          marginBottom: "1rem",
        }}
      >
        <div><div className="text-[9px] uppercase tracking-[0.1em] text-[var(--ink-text-4)]">Projects</div><div style={{ fontSize: "22px" }}>{data.summary.total_projects}</div></div>
        <div><div className="text-[9px] uppercase tracking-[0.1em] text-[var(--ink-text-4)]">Onboarding</div><div style={{ fontSize: "22px" }}>{data.summary.onboarding}</div></div>
        <div><div className="text-[9px] uppercase tracking-[0.1em] text-[var(--ink-text-4)]">Visual gaps</div><div style={{ fontSize: "22px" }}>{data.summary.visual_audit_missing}</div></div>
        <div><div className="text-[9px] uppercase tracking-[0.1em] text-[var(--ink-text-4)]">Re-audit due</div><div style={{ fontSize: "22px" }}>{data.summary.audit_due}</div></div>
      </div>

      {jobsConfigured && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1rem", alignItems: "center" }}>
          <button
            type="button"
            onClick={() => enqueueWeekly()}
            disabled={!canEnqueue || dispatching === "weekly_audit"}
            style={{ fontSize: "11px", fontFamily: "var(--font-mono)", padding: "4px 10px" }}
          >
            {dispatching === "weekly_audit" ? "…" : "Enqueue weekly audit (all apps)"}
          </button>
        </div>
      )}

      {jobsConfigured && jobs.length > 0 && (
        <div style={{ marginBottom: "1rem" }}>
          <div style={{ fontSize: "9px", fontFamily: "var(--font-mono)", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-text-4)", marginBottom: "0.5rem" }}>
            Recent jobs
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", fontSize: "11px", fontFamily: "var(--font-mono)" }}>
            {jobs.slice(0, 8).map((j) => (
              <div key={j.id} style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", color: "var(--ink-text-2)" }}>
                <span>{j.job_type}{j.project_name ? ` · ${j.project_name}` : ""}</span>
                <span style={{ color: j.status === "failed" ? "var(--ink-red)" : j.status === "completed" ? "var(--ink-green)" : "var(--ink-amber)" }}>{j.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {jobsConfigured && runs.length > 0 && (
        <div style={{ marginBottom: "1rem" }}>
          <div style={{ fontSize: "9px", fontFamily: "var(--font-mono)", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-text-4)", marginBottom: "0.5rem" }}>
            Recent runs
          </div>
          <div style={{ fontSize: "11px", color: "var(--ink-text-3)", maxHeight: "100px", overflow: "auto" }}>
            {runs.slice(0, 5).map((r) => (
              <div key={r.id} style={{ marginBottom: "0.35rem" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px" }}>{r.job_type}</span> — {r.summary?.slice(0, 120) ?? r.status}
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ fontSize: "9px", fontFamily: "var(--font-mono)", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-text-4)", marginBottom: "0.5rem" }}>
        Next actions → enqueue job
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {data.projects.slice(0, 5).map((project) => (
          <div key={project.project_name} style={{ display: "flex", justifyContent: "space-between", gap: "1rem", fontSize: "12px", alignItems: "center" }}>
            <div>
              <div style={{ color: "var(--ink-text-2)" }}>{project.project_name}</div>
              <div style={{ color: "var(--ink-text-4)", fontFamily: "var(--font-mono)", fontSize: "10px" }}>
                {STAGE_LABELS[project.stage] ?? project.stage} · {project.recommended_action.reason}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ color: "var(--ink-text-4)", fontFamily: "var(--font-mono)", fontSize: "10px" }}>
                {project.recommended_action.label}
              </span>
              {DISPATCHABLE_ACTIONS.has(project.recommended_action.kind) && (
                <button
                  type="button"
                  onClick={() => dispatchAction(project.recommended_action.kind, project.project_name)}
                  disabled={!canEnqueue || dispatching === `${project.recommended_action.kind}:${project.project_name}`}
                  style={{ fontSize: "10px", fontFamily: "var(--font-mono)", padding: "2px 8px" }}
                >
                  {dispatching === `${project.recommended_action.kind}:${project.project_name}` ? "…" : "run"}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {durable?.configured && (
        <div style={{ marginTop: "0.9rem", borderTop: "0.5px solid var(--ink-border-faint)", paddingTop: "0.9rem" }}>
          <div style={{ fontSize: "9px", fontFamily: "var(--font-mono)", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-text-4)", marginBottom: "0.5rem" }}>
            Recent durable events
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
            {durable.recent_events.slice(0, 4).map((event, index) => (
              <div key={`${event.event_type}-${index}`} style={{ display: "flex", justifyContent: "space-between", gap: "1rem", fontSize: "11px" }}>
                <span style={{ color: "var(--ink-text-2)" }}>{event.summary}</span>
                <span style={{ color: "var(--ink-text-4)", fontFamily: "var(--font-mono)" }}>
                  {event.project_name ?? "global"} · {event.event_type}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginTop: "1rem", borderTop: "0.5px solid var(--ink-border-faint)", paddingTop: "0.9rem" }}>
        <div style={{ fontSize: "9px", fontFamily: "var(--font-mono)", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-text-4)", marginBottom: "0.5rem" }}>
          Overrides
        </div>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
          <input
            type="text"
            placeholder="project name"
            value={overrideProject}
            onChange={(e) => setOverrideProject(e.target.value)}
            style={{ width: "180px", fontSize: "11px" }}
          />
          <select
            value={overrideAction}
            onChange={(e) => setOverrideAction(e.target.value as OrchestrationActionKind)}
            style={{ fontSize: "11px", fontFamily: "var(--font-mono)" }}
          >
            <option value="onboard_project">Onboard project</option>
            <option value="run_visual_audit">Run visual audit</option>
            <option value="run_full_audit">Run full audit</option>
            <option value="run_synthesizer">Run synthesizer</option>
          </select>
          <button
            type="button"
            onClick={() => dispatchAction(overrideAction, overrideProject.trim() || undefined)}
            disabled={!canEnqueue || dispatching === `${overrideAction}:${overrideProject.trim() || ""}`}
            style={{ fontSize: "11px", fontFamily: "var(--font-mono)", padding: "2px 8px" }}
          >
            {dispatching === `${overrideAction}:${overrideProject.trim() || ""}` ? "…" : "enqueue"}
          </button>
        </div>
      </div>
    </section>
  );
}
