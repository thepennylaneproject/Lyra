"use client";

import { useState, useEffect, useCallback } from "react";
import type { Project, FindingStatus } from "@/lib/types";
import { Badge } from "@/components/Badge";
import { MetricCard } from "@/components/MetricCard";
import { EmptyState } from "@/components/EmptyState";
import { ProjectCard } from "@/components/ProjectCard";
import { ProjectView } from "@/components/ProjectView";
import { ImportModal } from "@/components/ImportModal";
import { EnginePanel } from "@/components/EnginePanel";
import { STATUS_GROUPS, PRIORITY_ORDER, SEVERITY_ORDER, sortFindings } from "@/lib/constants";

export default function Home() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [loading, setLoading] = useState(true);
  const [queuedFindingIds, setQueuedFindingIds] = useState<Set<string>>(new Set());

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch("/api/projects");
      if (res.ok) {
        const data = await res.json();
        setProjects(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error("Failed to fetch projects", e);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchQueue = useCallback(async () => {
    try {
      const res = await fetch("/api/engine/queue");
      if (res.ok) {
        const data = await res.json();
        setQueuedFindingIds(
          new Set((data.queue ?? []).map((j: { finding_id: string }) => j.finding_id))
        );
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchProjects();
    fetchQueue();
  }, [fetchProjects, fetchQueue]);

  const refetchProject = useCallback(async (): Promise<Project | null> => {
    if (!activeProject) return null;
    try {
      const res = await fetch(
        `/api/projects/${encodeURIComponent(activeProject)}`
      );
      if (!res.ok) return null;
      const p = await res.json();
      setProjects((prev) =>
        prev.map((x) => (x.name === activeProject ? p : x))
      );
      return p;
    } catch {
      return null;
    }
  }, [activeProject]);

  const onUpdateFinding = useCallback(
    async (
      projectName: string,
      findingId: string,
      status: FindingStatus
    ) => {
      const res = await fetch(
        `/api/projects/${encodeURIComponent(projectName)}/findings/${encodeURIComponent(findingId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        }
      );
      if (!res.ok) throw new Error("Failed to update finding");
    },
    []
  );

  const handleImport = useCallback((project: Project) => {
    setProjects((prev) => {
      const idx = prev.findIndex((p) => p.name === project.name);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = project;
        return next;
      }
      return [...prev, project];
    });
    setShowImport(false);
  }, []);

  const handleRemove = useCallback(async (name: string) => {
    if (!confirm(`Remove ${name}?`)) return;
    try {
      const res = await fetch(`/api/projects/${encodeURIComponent(name)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setProjects((prev) => prev.filter((p) => p.name !== name));
        if (activeProject === name) setActiveProject(null);
      }
    } catch (e) {
      console.error("Failed to remove project", e);
    }
  }, [activeProject]);

  const handleQueueRepair = useCallback(
    async (findingId: string, projectName: string) => {
      const res = await fetch("/api/engine/queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ finding_id: findingId, project_name: projectName }),
      });
      if (!res.ok) throw new Error("Failed to queue");
      setQueuedFindingIds((prev) => new Set([...prev, findingId]));
    },
    []
  );

  const handleExport = useCallback((project: Project) => {
    const data = JSON.stringify(
      {
        schema_version: "1.1.0",
        open_findings: project.findings ?? [],
      },
      null,
      2
    );
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${project.name}-open_findings.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const currentProject = activeProject
    ? projects.find((p) => p.name === activeProject)
    : null;

  if (currentProject && activeProject) {
    return (
      <main className="p-6 max-w-4xl mx-auto">
        <ProjectView
          project={currentProject}
          onBack={() => setActiveProject(null)}
          onUpdateFinding={onUpdateFinding}
          refetchProject={refetchProject}
          onQueueRepair={handleQueueRepair}
          queuedFindingIds={queuedFindingIds}
        />
      </main>
    );
  }

  const totalFindings = projects.reduce(
    (s, p) => s + (p.findings?.length ?? 0),
    0
  );
  const totalBlockers = projects.reduce(
    (s, p) =>
      s +
      (p.findings ?? []).filter(
        (f) =>
          f.severity === "blocker" && STATUS_GROUPS.active.includes(f.status)
      ).length,
    0
  );
  const totalActive = projects.reduce(
    (s, p) =>
      s +
      (p.findings ?? []).filter((f) => STATUS_GROUPS.active.includes(f.status))
        .length,
    0
  );
  const totalResolved = projects.reduce(
    (s, p) =>
      s +
      (p.findings ?? []).filter((f) =>
        STATUS_GROUPS.resolved.includes(f.status)
      ).length,
    0
  );
  const shippable = projects.filter((p) => {
    const f = p.findings ?? [];
    const b = f.filter(
      (x) =>
        x.severity === "blocker" && STATUS_GROUPS.active.includes(x.status)
    ).length;
    const q = f.filter(
      (x) => x.type === "question" && STATUS_GROUPS.active.includes(x.status)
    ).length;
    return f.length > 0 && b === 0 && q === 0;
  }).length;

  type NextAction = { _project: string; title?: string; finding_id?: string; severity?: string; priority?: string };
  let nextAction: NextAction | null = null;
  for (const p of projects) {
    const sorted = sortFindings(
      (p.findings ?? []).filter((f) => STATUS_GROUPS.active.includes(f.status))
    );
    if (sorted.length > 0) {
      const first = sorted[0];
      const pa = PRIORITY_ORDER[first.priority ?? ""] ?? 9;
      const sa = SEVERITY_ORDER[first.severity ?? ""] ?? 9;
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
      <main className="p-6 max-w-4xl mx-auto">
        <p className="text-zinc-500">Loading…</p>
      </main>
    );
  }

  return (
    <main className="p-6 max-w-4xl mx-auto">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: "1rem",
        }}
      >
        <h1
          style={{
            fontSize: "18px",
            fontWeight: 500,
            margin: 0,
            color: "var(--color-text-primary)",
          }}
        >
          LYRA
        </h1>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            onClick={() => setShowImport(true)}
            style={{ fontSize: "12px", padding: "4px 12px" }}
          >
            Import project
          </button>
        </div>
      </div>

      {showImport && (
        <ImportModal
          onImport={handleImport}
          onClose={() => setShowImport(false)}
        />
      )}

      {projects.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
            gap: 8,
            marginBottom: "1.5rem",
          }}
        >
          <MetricCard
            label="Projects"
            value={projects.length}
            sub={`${shippable} shippable`}
          />
          <MetricCard label="Total findings" value={totalFindings} />
          <MetricCard
            label="Active"
            value={totalActive}
            accent={totalActive > 0 ? "#EF9F27" : undefined}
          />
          <MetricCard
            label="Resolved"
            value={totalResolved}
            accent={totalResolved > 0 ? "#1D9E75" : undefined}
          />
          <MetricCard
            label="Blockers"
            value={totalBlockers}
            accent={totalBlockers > 0 ? "#E24B4A" : undefined}
          />
        </div>
      )}

      <EnginePanel onSyncComplete={fetchProjects} />

      {nextAction && (
        <div
          style={{
            background: "var(--color-background-primary)",
            border: "0.5px solid var(--color-border-tertiary)",
            borderRadius: "var(--border-radius-lg)",
            padding: "12px 16px",
            marginBottom: "1.5rem",
          }}
        >
          <div
            style={{
              fontSize: "12px",
              color: "var(--color-text-tertiary)",
              marginBottom: 6,
            }}
          >
            Next action
          </div>
          <div
            style={{
              display: "flex",
              gap: 6,
              alignItems: "center",
              marginBottom: 4,
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                fontSize: "12px",
                fontWeight: 500,
                color: "var(--color-text-info)",
              }}
            >
              {"_project" in nextAction ? nextAction._project : ""}
            </span>
            <Badge
              color={nextAction.severity ?? "nit"}
              small
            >
              {nextAction.severity}
            </Badge>
            <Badge small>{nextAction.priority}</Badge>
          </div>
          <div
            style={{
              fontSize: "13px",
              fontWeight: 500,
              color: "var(--color-text-primary)",
            }}
          >
            {nextAction.title}
          </div>
          <div
            style={{
              fontSize: "11px",
              color: "var(--color-text-tertiary)",
              marginTop: 4,
              fontFamily: "var(--font-mono)",
            }}
          >
            {nextAction.finding_id}
          </div>
        </div>
      )}

      {projects.length === 0 && !showImport && (
        <EmptyState
          icon="◆"
          title="No projects yet. Import an open_findings.json to get started."
          action={
            <button
              type="button"
              onClick={() => setShowImport(true)}
              style={{ fontSize: "13px", padding: "6px 16px" }}
            >
              Import project
            </button>
          }
        />
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
          gap: 10,
        }}
      >
        {projects.map((p) => (
          <div key={p.name} style={{ position: "relative" }}>
            <ProjectCard
              project={p}
              onClick={() => setActiveProject(p.name)}
            />
            <div
              style={{
                position: "absolute",
                top: 8,
                right: 8,
                display: "flex",
                gap: 4,
                opacity: 0.5,
              }}
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleExport(p);
                }}
                title="Export"
                style={{
                  fontSize: "10px",
                  padding: "2px 6px",
                  background: "transparent",
                  border: "0.5px solid var(--color-border-tertiary)",
                  borderRadius: "var(--border-radius-md)",
                  cursor: "pointer",
                  color: "var(--color-text-tertiary)",
                }}
              >
                ↓
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemove(p.name);
                }}
                title="Remove"
                style={{
                  fontSize: "10px",
                  padding: "2px 6px",
                  background: "transparent",
                  border: "0.5px solid var(--color-border-tertiary)",
                  borderRadius: "var(--border-radius-md)",
                  cursor: "pointer",
                  color: "var(--color-text-tertiary)",
                }}
              >
                ×
              </button>
            </div>
          </div>
        ))}
      </div>

      <div
        style={{
          marginTop: "2rem",
          fontSize: "11px",
          color: "var(--color-text-tertiary)",
          borderTop: "0.5px solid var(--color-border-tertiary)",
          paddingTop: "1rem",
        }}
      >
        LYRA v1.1 — Import each project&apos;s{" "}
        <span style={{ fontFamily: "var(--font-mono)" }}>
          open_findings.json
        </span>{" "}
        to manage your portfolio. Data persists via the dashboard API.
      </div>
    </main>
  );
}
