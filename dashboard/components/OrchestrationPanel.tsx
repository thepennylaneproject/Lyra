"use client";

import { useEffect, useState, useCallback } from "react";
import type { PortfolioOrchestrationState, OrchestrationActionKind } from "@/lib/orchestration";
import type { GithubControlPlaneState } from "@/lib/github-control-plane";
import type { DurableStateSummary } from "@/lib/durable-state";

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

export function OrchestrationPanel() {
  const [data, setData] = useState<PortfolioOrchestrationState | null>(null);
  const [github, setGithub] = useState<GithubControlPlaneState | null>(null);
  const [durable, setDurable] = useState<DurableStateSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [dispatching, setDispatching] = useState<string | null>(null);
  const [overrideProject, setOverrideProject] = useState<string>("");
  const [overrideAction, setOverrideAction] = useState<OrchestrationActionKind>("run_full_audit");

  const load = useCallback(async () => {
    const [orchestrationRes, githubRes, durableRes] = await Promise.all([
      fetch("/api/orchestration"),
      fetch("/api/github/control-plane"),
      fetch("/api/durable-state"),
    ]);

    if (orchestrationRes.ok) {
      setData(await orchestrationRes.json());
    }
    if (githubRes.ok) {
      setGithub(await githubRes.json());
    } else {
      setGithub(null);
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

  const dispatchAction = useCallback(async (action: OrchestrationActionKind, projectName?: string) => {
    setDispatching(projectName ? `${action}:${projectName}` : action);
    try {
      const res = await fetch("/api/github/control-plane", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, project_name: projectName ?? null }),
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.error ?? "Failed to dispatch control-plane event");
      }
      await load();
    } finally {
      setDispatching(null);
    }
  }, [load]);

  if (loading) {
    return (
      <div style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--ink-text-4)", marginBottom: "1rem" }}>
        orchestration: loading…
      </div>
    );
  }

  if (!data) return null;

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
          GitHub control plane
        </div>
        <div style={{ fontSize: "10px", fontFamily: "var(--font-mono)", color: github?.configured ? "var(--ink-green)" : "var(--ink-amber)" }}>
          {github?.configured ? `${github.owner}/${github.repo}` : `not configured${github?.missing?.length ? `: ${github.missing.join(", ")}` : ""}`}
        </div>
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

      {github?.configured && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "0.75rem", marginBottom: "0.9rem" }}>
          <div style={{ fontSize: "12px" }}>
            <div style={{ fontSize: "9px", fontFamily: "var(--font-mono)", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-text-4)" }}>Open audit issues</div>
            <div style={{ fontSize: "18px" }}>{github.open_audit_issues}</div>
          </div>
          <div style={{ fontSize: "12px" }}>
            <div style={{ fontSize: "9px", fontFamily: "var(--font-mono)", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-text-4)" }}>Latest workflow</div>
            <div style={{ fontSize: "12px", color: "var(--ink-text-2)" }}>
              {github.latest_workflow_run
                ? `${github.latest_workflow_run.event} · ${github.latest_workflow_run.status}${github.latest_workflow_run.conclusion ? ` (${github.latest_workflow_run.conclusion})` : ""}`
                : "none"}
            </div>
          </div>
          <div style={{ fontSize: "12px" }}>
            <div style={{ fontSize: "9px", fontFamily: "var(--font-mono)", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-text-4)" }}>Latest artifacts</div>
            <div style={{ fontSize: "12px", color: "var(--ink-text-2)" }}>
              {github.latest_artifacts.length > 0
                ? github.latest_artifacts.slice(0, 2).map((artifact) => artifact.name).join(", ")
                : "none"}
            </div>
          </div>
          <div style={{ fontSize: "12px" }}>
            <div style={{ fontSize: "9px", fontFamily: "var(--font-mono)", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-text-4)" }}>Durable state</div>
            <div style={{ fontSize: "12px", color: durable?.configured ? "var(--ink-green)" : "var(--ink-amber)" }}>
              {durable?.configured ? `${durable.recent_events.length} events` : "not configured"}
            </div>
          </div>
        </div>
      )}

      <div style={{ fontSize: "9px", fontFamily: "var(--font-mono)", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ink-text-4)", marginBottom: "0.5rem" }}>
        GitHub-backed next actions
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
              {github?.configured && DISPATCHABLE_ACTIONS.has(project.recommended_action.kind) && (
                <button
                  type="button"
                  onClick={() => dispatchAction(project.recommended_action.kind, project.project_name)}
                  disabled={dispatching === `${project.recommended_action.kind}:${project.project_name}`}
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
            disabled={!github?.configured || dispatching === `${overrideAction}:${overrideProject.trim() || ""}`}
            style={{ fontSize: "11px", fontFamily: "var(--font-mono)", padding: "2px 8px" }}
          >
            {dispatching === `${overrideAction}:${overrideProject.trim() || ""}` ? "…" : "dispatch override"}
          </button>
        </div>
      </div>
    </section>
  );
}
