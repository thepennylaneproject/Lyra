"use client";

import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "@/lib/api-fetch";
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

export function ProjectAuditHistory({ projectName }: ProjectAuditHistoryProps) {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [runs, setRuns] = useState<LyraAuditRunRow[]>([]);
  const [jobs, setJobs] = useState<LyraAuditJobRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

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
                <strong>{r.job_type}</strong> · {r.status} · +{r.findings_added} findings
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
                {j.created_at.slice(0, 19).replace("T", " ")} · {j.job_type} ·{" "}
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
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
