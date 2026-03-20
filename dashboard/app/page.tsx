"use client";

import { useState, useEffect, useLayoutEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import type { Project, FindingStatus } from "@/lib/types";
import { apiFetch } from "@/lib/api-fetch";
import { DashboardLogin } from "@/components/DashboardLogin";
import { MetricCard } from "@/components/MetricCard";
import { EmptyState } from "@/components/EmptyState";
import { ProjectCard } from "@/components/ProjectCard";
import { ProjectView } from "@/components/ProjectView";
import { ImportModal } from "@/components/ImportModal";
import { NextActionCard } from "@/components/NextActionCard";
import { PatternPanel } from "@/components/PatternPanel";
import { EngineView } from "@/components/EngineView";
import { OrchestrationPanel } from "@/components/OrchestrationPanel";
import { Shell, type NavView } from "@/components/Shell";
import { STATUS_GROUPS, PRIORITY_ORDER, SEVERITY_ORDER, sortFindings } from "@/lib/constants";
import { isInQueuedSet } from "@/lib/finding-validation";

export default function Home() {
  const router = useRouter();
  const pathname = usePathname() ?? "/";

  const [projects,         setProjects]         = useState<Project[]>([]);
  const [activeProject,   setActiveProject]     = useState<string | null>(null);
  const [activeView,      setActiveView]        = useState<NavView>("portfolio");
  const [showImport,       setShowImport]        = useState(false);
  const [loading,          setLoading]           = useState(true);
  const [needsAuth,        setNeedsAuth]         = useState(false);
  const [projectsError,    setProjectsError]     = useState<string | null>(null);
  const [queuedFindingIds, setQueuedFindingIds] = useState<Set<string>>(new Set());
  const [queueError,       setQueueError]       = useState<string | null>(null);
  const [removeError,      setRemoveError]      = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    setProjectsError(null);
    try {
      const res = await apiFetch("/api/projects");
      if (res.status === 401) {
        setNeedsAuth(true);
        setProjects([]);
        return;
      }
      setNeedsAuth(false);
      if (!res.ok) {
        setProjectsError(`Could not load projects (${res.status}). Try again.`);
        setProjects([]);
        return;
      }
      const data = await res.json();
      setProjects(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Failed to fetch projects", e);
      setProjectsError(
        e instanceof Error ? e.message : "Network error loading projects."
      );
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchQueue = useCallback(async () => {
    setQueueError(null);
    try {
      const res = await apiFetch("/api/engine/queue");
      if (res.ok) {
        const data = await res.json();
        setQueuedFindingIds(
          new Set(
            (data.queue ?? []).map((j: { finding_id: string; project_name: string }) =>
              j.project_name ? `${j.project_name}:${j.finding_id}` : j.finding_id
            )
          )
        );
        return;
      }
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      const msg =
        typeof body.error === "string"
          ? body.error
          : `Repair queue could not be loaded (${res.status}). “Queued” badges may be wrong.`;
      setQueueError(msg);
    } catch (e) {
      setQueueError(
        e instanceof Error ? e.message : "Network error loading repair queue."
      );
    }
  }, []);

  useEffect(() => {
    fetchProjects();
    fetchQueue();
  }, [fetchProjects, fetchQueue]);

  useLayoutEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const p = q.get("project");
    if (p) setActiveProject(p);
    if (q.get("view") === "engine") setActiveView("engine");
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (activeView === "engine") params.set("view", "engine");
    if (activeProject) params.set("project", activeProject);
    const qs = params.toString();
    const next = qs ? `${pathname}?${qs}` : pathname;
    if (typeof window !== "undefined") {
      const cur = `${window.location.pathname}${window.location.search}`;
      if (cur !== next) router.replace(next, { scroll: false });
    }
  }, [activeView, activeProject, pathname, router]);

  const refetchProject = useCallback(async (): Promise<Project | null> => {
    if (!activeProject) return null;
    try {
      const res = await apiFetch(`/api/projects/${encodeURIComponent(activeProject)}`);
      if (!res.ok) return null;
      const p = await res.json();
      setProjects((prev) => prev.map((x) => (x.name === activeProject ? p : x)));
      return p;
    } catch {
      return null;
    }
  }, [activeProject]);

  const onUpdateFinding = useCallback(
    async (projectName: string, findingId: string, status: FindingStatus) => {
      const res = await apiFetch(
        `/api/projects/${encodeURIComponent(projectName)}/findings/${encodeURIComponent(findingId)}`,
        {
          method:  "PATCH",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ status }),
        }
      );
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        const msg =
          typeof body.error === "string"
            ? body.error
            : `Could not save status (${res.status}). Try again.`;
        throw new Error(msg);
      }
    },
    []
  );

  const handleImport = useCallback(async (project: Project) => {
    // QA-008: Use /api/import which handles both create and update so that
    // re-importing an existing project merges findings instead of returning 409.
    const res = await apiFetch("/api/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: project.name,
        open_findings: project.findings ?? [],
        repositoryUrl: project.repositoryUrl,
      }),
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.error ?? "Failed to import project");
    }
    await fetchProjects();
    setShowImport(false);
  }, [fetchProjects]);

  const handleRemove = useCallback(async (name: string) => {
    if (!confirm(`Remove ${name}?`)) return;
    setRemoveError(null);
    try {
      const res = await apiFetch(`/api/projects/${encodeURIComponent(name)}`, { method: "DELETE" });
      if (res.ok) {
        setProjects((prev) => prev.filter((p) => p.name !== name));
        if (activeProject === name) setActiveProject(null);
        return;
      }
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setRemoveError(
        typeof body.error === "string"
          ? body.error
          : `Could not remove project (${res.status}). Try again.`
      );
    } catch (e) {
      setRemoveError(e instanceof Error ? e.message : "Network error while removing project.");
    }
  }, [activeProject]);

  const handleQueueRepair = useCallback(async (findingId: string, projectName: string) => {
    const res = await apiFetch("/api/engine/queue", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ finding_id: findingId, project_name: projectName }),
    });
    if (!res.ok) throw new Error("Failed to queue");
    setQueuedFindingIds((prev) => new Set([...prev, `${projectName}:${findingId}`]));
  }, []);

  const handleExport = useCallback((project: Project) => {
    const data = JSON.stringify({ schema_version: "1.1.0", open_findings: project.findings ?? [] }, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = `${project.name}-open_findings.json`; a.click();
    URL.revokeObjectURL(url);
  }, []);

  const handleNavigate = useCallback((view: NavView) => {
    setActiveView(view);
    setActiveProject(null); // Return to view root when navigating
  }, []);

  if (needsAuth) {
    return (
      <DashboardLogin
        onSuccess={() => {
          setLoading(true);
          void fetchProjects();
          void fetchQueue();
        }}
      />
    );
  }

  // ── Project view (overrides nav) ──
  const currentProject = activeProject ? projects.find((p) => p.name === activeProject) : null;
  if (currentProject && activeProject) {
    return (
      <Shell activeView={activeView} onNavigate={handleNavigate}>
        <ProjectView
          project={currentProject}
          onBack={() => setActiveProject(null)}
          onUpdateFinding={onUpdateFinding}
          refetchProject={refetchProject}
          onQueueRepair={handleQueueRepair}
          queuedFindingIds={queuedFindingIds}
        />
      </Shell>
    );
  }

  // ── Engine view ──
  if (activeView === "engine") {
    return (
      <Shell activeView={activeView} onNavigate={handleNavigate}>
        <EngineView />
      </Shell>
    );
  }

  // ── Portfolio view ──

  // Compute portfolio totals
  const totalFindings = projects.reduce((s, p) => s + (p.findings?.length ?? 0), 0);
  const totalBlockers = projects.reduce(
    (s, p) => s + (p.findings ?? []).filter((f) => f.severity === "blocker" && STATUS_GROUPS.active.includes(f.status)).length,
    0
  );
  const totalActive   = projects.reduce(
    (s, p) => s + (p.findings ?? []).filter((f) => STATUS_GROUPS.active.includes(f.status)).length,
    0
  );
  const totalResolved = projects.reduce(
    (s, p) => s + (p.findings ?? []).filter((f) => STATUS_GROUPS.resolved.includes(f.status)).length,
    0
  );
  const shippable = projects.filter((p) => {
    const f = p.findings ?? [];
    const b = f.filter((x) => x.severity === "blocker" && STATUS_GROUPS.active.includes(x.status)).length;
    const q = f.filter((x) => x.type === "question" && STATUS_GROUPS.active.includes(x.status)).length;
    return f.length > 0 && b === 0 && q === 0;
  }).length;

  // Compute next action across all projects
  type NextAction = { _project: string; title?: string; finding_id?: string; severity?: string; priority?: string };
  let nextAction: NextAction | null = null;
  for (const p of projects) {
    const sorted = sortFindings(
      (p.findings ?? []).filter((f) => STATUS_GROUPS.active.includes(f.status))
    );
    if (sorted.length > 0) {
      const first = sorted[0];
      const pa    = PRIORITY_ORDER[first.priority ?? ""] ?? 9;
      const sa    = SEVERITY_ORDER[first.severity  ?? ""] ?? 9;
      if (
        !nextAction ||
        (PRIORITY_ORDER[nextAction.priority ?? ""] ?? 9) > pa ||
        ((PRIORITY_ORDER[nextAction.priority ?? ""] ?? 9) === pa &&
          (SEVERITY_ORDER[nextAction.severity ?? ""] ?? 9) > sa)
      ) {
        nextAction = { ...first, _project: p.name };
      }
    }
  }

  if (loading) {
    return (
      <Shell activeView={activeView} onNavigate={handleNavigate}>
        <span style={{ fontSize: "12px", fontFamily: "var(--font-mono)", color: "var(--ink-text-4)" }}>
          loading…
        </span>
      </Shell>
    );
  }

  if (projectsError && projects.length === 0) {
    return (
      <Shell activeView={activeView} onNavigate={handleNavigate}>
        <div style={{ maxWidth: "420px" }}>
          <p style={{ fontSize: "13px", color: "var(--ink-red)", marginBottom: "1rem" }}>{projectsError}</p>
          <button
            type="button"
            onClick={() => {
              setLoading(true);
              void fetchProjects();
            }}
            style={{ fontSize: "12px", fontFamily: "var(--font-mono)", padding: "6px 14px" }}
          >
            Retry
          </button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell activeView={activeView} onNavigate={handleNavigate}>
      {/* Import modal */}
      {showImport && (
        <ImportModal onImport={handleImport} onClose={() => setShowImport(false)} />
      )}

      {(queueError || removeError) && (
        <div
          style={{
            marginBottom: "1rem",
            padding: "0.65rem 0.85rem",
            fontSize: "11px",
            fontFamily: "var(--font-mono)",
            color: "var(--ink-amber)",
            background: "var(--ink-bg-sunken)",
            border: "0.5px solid var(--ink-border-faint)",
            borderRadius: "var(--radius-md)",
            lineHeight: 1.45,
          }}
        >
          {queueError && (
            <div style={{ marginBottom: removeError ? "0.5rem" : 0 }}>
              <span>{queueError}</span>
              <button
                type="button"
                onClick={() => void fetchQueue()}
                style={{
                  marginLeft: "0.5rem",
                  fontSize: "11px",
                  textDecoration: "underline",
                  cursor: "pointer",
                  border: "none",
                  background: "none",
                  color: "inherit",
                }}
              >
                Retry
              </button>
              <button
                type="button"
                onClick={() => setQueueError(null)}
                aria-label="Dismiss queue message"
                style={{ marginLeft: "0.35rem", opacity: 0.8, border: "none", background: "none", color: "inherit", cursor: "pointer" }}
              >
                ×
              </button>
            </div>
          )}
          {removeError && (
            <div>
              <span>{removeError}</span>
              <button
                type="button"
                onClick={() => setRemoveError(null)}
                aria-label="Dismiss remove error"
                style={{ marginLeft: "0.35rem", opacity: 0.8, border: "none", background: "none", color: "inherit", cursor: "pointer" }}
              >
                ×
              </button>
            </div>
          )}
        </div>
      )}

      {/* Portfolio header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "1.75rem" }}>
        <div>
          <div
            style={{
              fontSize:      "9px",
              fontFamily:    "var(--font-mono)",
              fontWeight:    500,
              color:         "var(--ink-text-4)",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              marginBottom:  "0.25rem",
            }}
          >
            Portfolio
          </div>
          <h1 style={{ fontSize: "17px", fontWeight: 500, margin: 0, color: "var(--ink-text)" }}>
            {projects.length} project{projects.length !== 1 ? "s" : ""}
          </h1>
        </div>
        <button
          type="button"
          onClick={() => setShowImport(true)}
          style={{ fontSize: "11px", fontFamily: "var(--font-mono)", padding: "4px 12px" }}
        >
          Onboard project
        </button>
      </div>

      {/* Metrics */}
      {projects.length > 0 && (
        <div
          style={{
            display:             "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(80px, 1fr))",
            gap:                 "0 2rem",
            borderBottom:        "0.5px solid var(--ink-border-faint)",
            paddingBottom:       "1.25rem",
            marginBottom:        "2rem",
          }}
        >
          <MetricCard label="Projects"  value={projects.length} sub={`${shippable} shippable`} />
          <MetricCard label="Findings"  value={totalFindings} />
          <MetricCard label="Active"    value={totalActive}   accent={totalActive   > 0 ? "var(--ink-amber)" : undefined} />
          <MetricCard label="Resolved"  value={totalResolved} accent={totalResolved > 0 ? "var(--ink-green)" : undefined} />
          <MetricCard label="Blockers"  value={totalBlockers} accent={totalBlockers > 0 ? "var(--ink-red)"   : undefined} />
        </div>
      )}

      {/* Next action hero */}
      {nextAction && (
        <NextActionCard
          title={nextAction.title ?? ""}
          findingId={nextAction.finding_id ?? ""}
          priority={nextAction.priority ?? ""}
          severity={nextAction.severity ?? "nit"}
          projectName={nextAction._project}
          isQueued={isInQueuedSet(queuedFindingIds, nextAction._project, nextAction.finding_id ?? "")}
          onQueue={() => handleQueueRepair(nextAction!.finding_id ?? "", nextAction!._project)}
          onOpen={() => setActiveProject(nextAction!._project)}
        />
      )}

      {/* Orchestration summary */}
      <OrchestrationPanel />

      {/* Empty state */}
      {projects.length === 0 && !showImport && (
        <EmptyState
          icon="◆"
          title="No projects yet. Onboard from a repo or import an open_findings.json to get started."
          action={
            <button
              type="button"
              onClick={() => setShowImport(true)}
              style={{ fontSize: "12px", fontFamily: "var(--font-mono)", padding: "5px 14px" }}
            >
              Onboard project
            </button>
          }
        />
      )}

      {/* Project grid */}
      <div
        style={{
          display:             "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap:                 "0.625rem",
        }}
      >
        {projects.map((p) => (
          <div key={p.name} style={{ position: "relative" }}>
            <ProjectCard project={p} onClick={() => setActiveProject(p.name)} />
            <div style={{ position: "absolute", top: "0.5rem", right: "0.5rem", display: "flex", gap: "0.25rem", opacity: 0.4 }}>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleExport(p); }}
                title="Export"
                style={{ fontSize: "9px", padding: "1px 5px", fontFamily: "var(--font-mono)", background: "var(--ink-bg)" }}
              >
                ↓
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleRemove(p.name); }}
                title="Remove"
                style={{ fontSize: "9px", padding: "1px 5px", fontFamily: "var(--font-mono)", background: "var(--ink-bg)" }}
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Pattern intelligence — below project grid */}
      <PatternPanel projects={projects} />

      {/* Footer */}
      {projects.length > 0 && (
        <div
          style={{
            marginTop:  "3rem",
            fontSize:   "10px",
            fontFamily: "var(--font-mono)",
            color:      "var(--ink-text-4)",
            borderTop:  "0.5px solid var(--ink-border-faint)",
            paddingTop: "1rem",
          }}
        >
          lyra v1.1 · findings persist via api
        </div>
      )}
    </Shell>
  );
}
