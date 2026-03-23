"use client";

import { useState, useCallback, useEffect, type CSSProperties } from "react";
import type { Project, Finding, FindingStatus } from "@/lib/types";
import { Badge } from "./Badge";
import { MetricCard } from "./MetricCard";
import { ProgressBar } from "./ProgressBar";
import { EmptyState } from "./EmptyState";
import { FindingRow } from "./FindingRow";
import { FindingDetail } from "./FindingDetail";
import { LinearSync } from "./LinearSync";
import { ProjectAuditHistory } from "./ProjectAuditHistory";
import { OnboardingReviewPanel } from "./OnboardingReviewPanel";
import { MaintenancePanel } from "./MaintenancePanel";
import { BulkActionsPanel } from "./BulkActionsPanel";
import { ProjectManagementPanel } from "./ProjectManagementPanel";
import { STATUS_GROUPS, sortFindings } from "@/lib/constants";
import { UI_COPY } from "@/lib/ui-copy";

type FilterKey = "active" | "pending" | "resolved" | "all";

type ProjectTab = "findings" | "operations";

const FILTER_LABELS: Record<FilterKey, string> = {
  active: "active",
  pending: "pending verification",
  resolved: "resolved",
  all: "all",
};

export type RefetchProjectResult = {
  project: Project | null;
  refreshError: string | null;
};

interface ProjectViewProps {
  project:           Project;
  onBack:            () => void;
  onUpdateFinding:   (projectName: string, findingId: string, status: FindingStatus) => Promise<void>;
  refetchProject:    () => Promise<RefetchProjectResult>;
  onQueueRepair?:    (findingId: string, projectName: string) => Promise<void>;
  queuedFindingIds?: Set<string>;
}

const tabButtonStyle = (active: boolean): CSSProperties => ({
  fontSize:    "11px",
  fontFamily:  "var(--font-mono)",
  padding:     "4px 10px",
  background:  active ? "var(--ink-bg-raised)" : "transparent",
  border:      active ? "0.5px solid var(--ink-border)" : "0.5px solid transparent",
  fontWeight:  active ? 500 : 400,
  color:       active ? "var(--ink-text)" : "var(--ink-text-4)",
  borderRadius: "var(--radius-md)",
  cursor:      "pointer",
});

export function ProjectView({
  project,
  onBack,
  onUpdateFinding,
  refetchProject,
  onQueueRepair,
  queuedFindingIds,
}: ProjectViewProps) {
  const showOnboarding =
    (project.status ?? "active") === "draft" ||
    Boolean(project.onboardingState?.reviewRequired);
  const [opsHydrated, setOpsHydrated] = useState({
    bulk: false,
    linear: false,
    history: false,
  });
  const [tab, setTab] = useState<ProjectTab>("findings");
  const [filter,   setFilter]   = useState<FilterKey>("active");
  const [search,   setSearch]   = useState("");
  const [selected, setSelected] = useState<Finding | null>(null);
  const [findings, setFindings] = useState<Finding[]>(project.findings ?? []);
  const [actionError, setActionError] = useState<string | null>(null);
  /** Set to server error detail when save succeeded but refetch failed */
  const [refreshAfterSaveError, setRefreshAfterSaveError] = useState<string | null>(null);

  useEffect(() => {
    setFindings(project.findings ?? []);
  }, [project.name, project.findings]);

  const filtered = sortFindings(
    findings.filter((f) => {
      const statusMatch  = filter === "all" || (STATUS_GROUPS[filter] ?? []).includes(f.status);
      const searchLower  = search.toLowerCase();
      const searchMatch  = !search
        || f.title?.toLowerCase().includes(searchLower)
        || f.finding_id?.toLowerCase().includes(searchLower)
        || (f.category?.toLowerCase().includes(searchLower) ?? false);
      return statusMatch && searchMatch;
    })
  );

  const counts = {
    active:   findings.filter((f) => STATUS_GROUPS.active.includes(f.status)).length,
    pending:  findings.filter((f) => STATUS_GROUPS.pending.includes(f.status)).length,
    resolved: findings.filter((f) => STATUS_GROUPS.resolved.includes(f.status)).length,
  };
  const blockers  = findings.filter((f) => f.severity === "blocker" && STATUS_GROUPS.active.includes(f.status)).length;
  const questions = findings.filter((f) => f.type === "question" && STATUS_GROUPS.active.includes(f.status)).length;
  const resolved  = counts.resolved;
  const total     = findings.length;
  const canShip   = blockers === 0 && questions === 0 && counts.pending === 0;

  const handleAction = useCallback(
    async (findingId: string, newStatus: FindingStatus) => {
      setActionError(null);
      setRefreshAfterSaveError(null);
      try {
        await onUpdateFinding(project.name, findingId, newStatus);
        setFindings((prev) =>
          prev.map((f) => (f.finding_id === findingId ? { ...f, status: newStatus } : f))
        );
        setSelected((prev) =>
          prev?.finding_id === findingId ? { ...prev, status: newStatus } : prev
        );
        const { project: refreshed, refreshError } = await refetchProject();
        if (refreshed) {
          setFindings(refreshed.findings ?? []);
          const f = refreshed.findings?.find((x) => x.finding_id === findingId);
          if (f) setSelected(f);
        } else if (refreshError) {
          setRefreshAfterSaveError(refreshError);
        }
      } catch (e) {
        const msg =
          error instanceof Error ? error.message : "Could not update finding. Check connection and try again.";
        setActionError(msg);
      }
    },
    [project.name, onUpdateFinding, refetchProject]
  );

  const selectedFinding =
    selected && (findings.find((f) => f.finding_id === selected.finding_id) ?? selected);

  const tabItems: { id: ProjectTab; label: string }[] = [
    { id: "findings", label: "Findings" },
    { id: "operations", label: "Project & operations" },
  ];

  return (
    <div>
      {/* Back + project header */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.875rem", marginBottom: "1rem" }}>
        <button
          type="button"
          onClick={onBack}
          style={{ fontSize: "11px", fontFamily: "var(--font-mono)", padding: "3px 10px" }}
        >
          ← portfolio
        </button>
        <h2 style={{ fontSize: "17px", fontWeight: 500, margin: 0, color: "var(--ink-text)" }}>
          {project.name}
        </h2>
        {project.repositoryUrl && (
          <a
            href={project.repositoryUrl}
            target="_blank"
            rel="noreferrer"
            style={{ fontSize: "10px", fontFamily: "var(--font-mono)", color: "var(--ink-text-4)" }}
          >
            repo
          </a>
        )}
        {(project.status ?? "active") === "draft" && (
          <Badge color="minor">draft</Badge>
        )}
        {canShip && (
          <span style={{ fontSize: "10px", fontFamily: "var(--font-mono)", color: "var(--ink-green)" }} title="No blockers or open questions. Ready to deploy.">
            ✓ ready to deploy
          </span>
        )}
        {!canShip && blockers > 0 && (
          <Badge color="blocker">{blockers} blocker{blockers > 1 ? "s" : ""}</Badge>
        )}
        <span style={{ marginLeft: "auto" }} />
        <a
          href={`/api/projects/${encodeURIComponent(project.name)}/export-findings`}
          download
          title={UI_COPY.exportOpenFindingsTitle}
          style={{
            fontSize: "10px",
            fontFamily: "var(--font-mono)",
            color: "var(--ink-text-3)",
            textDecoration: "none",
            borderBottom: "0.5px solid var(--ink-border-faint)",
            paddingBottom: "1px",
          }}
        >
          {UI_COPY.exportOpenFindingsJson}
        </a>
      </div>

      <div
        role="tablist"
        aria-label="Project sections"
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "0.25rem",
          marginBottom: "1.5rem",
          borderBottom: "0.5px solid var(--ink-border-faint)",
          paddingBottom: "0.75rem",
        }}
      >
        {tabItems.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            style={tabButtonStyle(tab === id)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "operations" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>

          {/* ── Project management ──────────────────────────────── */}
          <details
            style={{
              border: "0.5px solid var(--ink-border-faint)",
              borderRadius: "var(--radius-md)",
              padding: "0.5rem 0.75rem",
              background: "var(--ink-bg-sunken)",
            }}
          >
            <summary
              style={{
                fontSize: "11px",
                fontFamily: "var(--font-mono)",
                color: "var(--ink-text-3)",
                cursor: "pointer",
              }}
            >
              Project management
            </summary>
            <div style={{ marginTop: "1rem" }}>
              <ProjectManagementPanel
                project={project}
                onDeleted={onBack}
                onUpdated={async () => { await refetchProject(); }}
              />
            </div>
          </details>

          <details
            open={showOnboarding}
            style={{
              border: "0.5px solid var(--ink-border-faint)",
              borderRadius: "var(--radius-md)",
              padding: "0.5rem 0.75rem",
              background: "var(--ink-bg-sunken)",
            }}
          >
            <summary
              style={{
                fontSize: "11px",
                fontFamily: "var(--font-mono)",
                color: "var(--ink-text-3)",
                cursor: "pointer",
              }}
            >
              {UI_COPY.opsSectionSetup}
            </summary>
            <div style={{ marginTop: "1rem" }}>
              {showOnboarding ? (
                <OnboardingReviewPanel
                  project={project}
                  onUpdated={async () => {
                    await refetchProject();
                  }}
                />
              ) : (
                <p style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--ink-text-4)", margin: 0 }}>
                  No setup review required for this project.
                </p>
              )}
            </div>
          </details>

          <details
            style={{
              border: "0.5px solid var(--ink-border-faint)",
              borderRadius: "var(--radius-md)",
              padding: "0.5rem 0.75rem",
              background: "var(--ink-bg-sunken)",
            }}
            onToggle={(e) => {
              if ((e.target as HTMLDetailsElement).open) {
                setOpsHydrated((s) => ({ ...s, bulk: true }));
              }
            }}
          >
            <summary
              style={{
                fontSize: "11px",
                fontFamily: "var(--font-mono)",
                color: "var(--ink-text-3)",
                cursor: "pointer",
              }}
            >
              {UI_COPY.opsSectionBulk}
            </summary>
            <div style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              {opsHydrated.bulk ? (
                <>
                  <BulkActionsPanel
                    activeProject={project.name}
                    onActionComplete={() => {
                      void refetchProject();
                    }}
                  />
                  <MaintenancePanel projectName={project.name} />
                </>
              ) : (
                <p style={{ fontSize: "10px", fontFamily: "var(--font-mono)", color: "var(--ink-text-4)", margin: 0 }}>
                  Expand to load bulk tools and backlog.
                </p>
              )}
            </div>
          </details>

          <details
            style={{
              border: "0.5px solid var(--ink-border-faint)",
              borderRadius: "var(--radius-md)",
              padding: "0.5rem 0.75rem",
              background: "var(--ink-bg-sunken)",
            }}
            onToggle={(e) => {
              if ((e.target as HTMLDetailsElement).open) {
                setOpsHydrated((s) => ({ ...s, linear: true }));
              }
            }}
          >
            <summary
              style={{
                fontSize: "11px",
                fontFamily: "var(--font-mono)",
                color: "var(--ink-text-3)",
                cursor: "pointer",
              }}
            >
              {UI_COPY.opsSectionLinear}
            </summary>
            <div style={{ marginTop: "1rem" }}>
              {opsHydrated.linear ? (
                <LinearSync
                  projectName={project.name}
                  onRefresh={async () => { await refetchProject(); }}
                />
              ) : (
                <p style={{ fontSize: "10px", fontFamily: "var(--font-mono)", color: "var(--ink-text-4)", margin: 0 }}>
                  Expand to load Linear sync.
                </p>
              )}
            </div>
          </details>

          <details
            style={{
              border: "0.5px solid var(--ink-border-faint)",
              borderRadius: "var(--radius-md)",
              padding: "0.5rem 0.75rem",
              background: "var(--ink-bg-sunken)",
            }}
            onToggle={(e) => {
              if ((e.target as HTMLDetailsElement).open) {
                setOpsHydrated((s) => ({ ...s, history: true }));
              }
            }}
          >
            <summary
              style={{
                fontSize: "11px",
                fontFamily: "var(--font-mono)",
                color: "var(--ink-text-3)",
                cursor: "pointer",
              }}
            >
              {UI_COPY.opsSectionHistory}
            </summary>
            <div style={{ marginTop: "1rem" }}>
              {opsHydrated.history ? (
                <ProjectAuditHistory projectName={project.name} projectStatus={project.status} />
              ) : (
                <p style={{ fontSize: "10px", fontFamily: "var(--font-mono)", color: "var(--ink-text-4)", margin: 0 }}>
                  Expand to load audit run history.
                </p>
              )}
            </div>
          </details>
        </div>
      )}

      {tab === "findings" && (
        <>
          <div
            style={{
              display:             "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(90px, 1fr))",
              gap:                 "0 2rem",
              marginBottom:        "1.5rem",
              borderBottom:        "0.5px solid var(--ink-border-faint)",
              paddingBottom:       "1.25rem",
            }}
          >
            <MetricCard label="Total"         value={total} />
            <MetricCard label="Active"        value={counts.active}  accent={counts.active  > 0 ? "var(--ink-amber)" : undefined} />
            <MetricCard label="Pending verification" value={counts.pending} />
            <MetricCard label="Resolved"      value={resolved}       accent={resolved > 0 ? "var(--ink-green)" : undefined} />
            <MetricCard label="Blockers"      value={blockers}       accent={blockers > 0 ? "var(--ink-red)"   : undefined} />
            <MetricCard label="Questions"     value={questions}      accent={questions > 0 ? "var(--ink-blue)" : undefined} />
            {project.manifest && <MetricCard label="Manifest modules" value={project.manifest.modules.length} />}
          </div>

          {project.manifest && (
            <div
              style={{
                marginBottom: "1rem",
                fontSize: "10px",
                fontFamily: "var(--font-mono)",
                color: "var(--ink-text-4)",
                lineHeight: 1.45,
              }}
            >
              Coverage map: {project.manifest.domains.length} domains, revision {project.manifest.revision.slice(0, 8)}.
            </div>
          )}

          <div style={{ marginBottom: "0.375rem" }}>
            <ProgressBar
              value={resolved}
              max={total}
              segments={[
                { value: counts.active,   color: "var(--ink-amber)" },
                { value: counts.pending,  color: "var(--ink-blue)" },
                { value: resolved,        color: "var(--ink-green)" },
              ]}
            />
          </div>
          <div style={{ fontSize: "10px", fontFamily: "var(--font-mono)", color: "var(--ink-text-4)", marginBottom: "1.5rem" }}>
            {resolved} of {total} resolved
          </div>

          {actionError && (
            <div
              role="alert"
              style={{
                marginBottom: "1rem",
                padding: "0.65rem 0.85rem",
                fontSize: "11px",
                fontFamily: "var(--font-mono)",
                color: "var(--ink-red)",
                background: "var(--ink-bg-sunken)",
                border: "0.5px solid var(--ink-border-faint)",
                borderRadius: "var(--radius-md)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: "0.75rem",
              }}
            >
              <span>{actionError}</span>
              <button
                type="button"
                onClick={() => setActionError(null)}
                aria-label="Dismiss"
                style={{ flexShrink: 0, border: "none", background: "transparent", color: "var(--ink-text-4)", cursor: "pointer", padding: "0 4px" }}
              >
                ×
              </button>
            </div>
          )}

          {refreshAfterSaveError !== null && (
            <div
              role="status"
              style={{
                marginBottom: "1rem",
                padding: "0.65rem 0.85rem",
                fontSize: "11px",
                fontFamily: "var(--font-mono)",
                color: "var(--ink-amber)",
                background: "var(--ink-bg-sunken)",
                border: "0.5px solid var(--ink-border-faint)",
                borderRadius: "var(--radius-md)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: "0.75rem",
              }}
            >
              <div style={{ lineHeight: 1.5 }}>
                <div style={{ color: "var(--ink-text-2)", marginBottom: "0.35rem" }}>
                  {UI_COPY.findingSavedLine}
                </div>
                <div>
                  {UI_COPY.findingRefreshFailedLine}{" "}
                  <span style={{ color: "var(--ink-text-3)" }}>{refreshAfterSaveError}</span>
                </div>
                <div style={{ marginTop: "0.35rem", color: "var(--ink-text-4)" }}>
                  {UI_COPY.findingRefreshFailedHint}
                </div>
              </div>
              <div style={{ display: "flex", gap: "0.35rem", flexShrink: 0 }}>
                <button
                  type="button"
                  onClick={() => void refetchProject().then(({ project: p, refreshError }) => {
                    if (p) {
                      setFindings(p.findings ?? []);
                      setRefreshAfterSaveError(null);
                    } else if (refreshError) {
                      setRefreshAfterSaveError(refreshError);
                    }
                  })}
                  style={{ fontSize: "11px", border: "none", background: "none", color: "inherit", cursor: "pointer", textDecoration: "underline", padding: 0 }}
                >
                  Retry
                </button>
                <button
                  type="button"
                  onClick={() => setRefreshAfterSaveError(null)}
                  aria-label="Dismiss"
                  style={{ border: "none", background: "transparent", color: "var(--ink-text-4)", cursor: "pointer", padding: "0 4px" }}
                >
                  ×
                </button>
              </div>
            </div>
          )}

          <div className="project-findings-split">
            <div>
              <div
                style={{
                  display:     "flex",
                  gap:         "0.25rem",
                  marginBottom: "0.75rem",
                  flexWrap:    "wrap",
                  alignItems:  "center",
                  borderBottom: "0.5px solid var(--ink-border-faint)",
                  paddingBottom: "0.75rem",
                }}
              >
                {(["active", "pending", "resolved", "all"] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFilter(f)}
                    style={{
                      fontSize:    "11px",
                      fontFamily:  "var(--font-mono)",
                      padding:     "2px 8px",
                      background:  filter === f ? "var(--ink-bg-raised)" : "transparent",
                      border:      filter === f ? "0.5px solid var(--ink-border)" : "0.5px solid transparent",
                      fontWeight:  filter === f ? 500 : 400,
                      color:       filter === f ? "var(--ink-text)" : "var(--ink-text-4)",
                    }}
                  >
                    {FILTER_LABELS[f]}{f !== "all" && ` (${counts[f] ?? 0})`}
                  </button>
                ))}
                <input
                  type="text"
                  placeholder="search findings…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  aria-label="Search findings"
                  style={{
                    marginLeft:  "auto",
                    fontSize:    "11px",
                    fontFamily:  "var(--font-mono)",
                    width:       "160px",
                    maxWidth:    "100%",
                    padding:     "3px 8px",
                  }}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
                {filtered.length === 0 && (
                  <EmptyState
                    icon={
                      total === 0 ? "◆" :
                      filter === "active" && resolved === total ? "✓" :
                      "→"
                    }
                    title={
                      total === 0
                        ? "No findings. Run an audit to discover issues."
                        : filter === "active" && resolved === total
                        ? "All findings resolved. Ready to deploy."
                        : filter === "active"
                        ? "No active findings"
                        : "No findings match this filter"
                    }
                  />
                )}
                {filtered.map((f) => (
                  <FindingRow
                    key={f.finding_id}
                    finding={f}
                    onClick={() => setSelected(f)}
                  />
                ))}
              </div>
            </div>

            <div className="project-findings-split-detail">
              {selectedFinding ? (
                <FindingDetail
                  finding={selectedFinding}
                  projectName={project.name}
                  onClose={() => setSelected(null)}
                  onAction={handleAction}
                  onQueueRepair={onQueueRepair}
                  queuedFindingIds={queuedFindingIds}
                />
              ) : (
                <div
                  style={{
                    fontSize: "11px",
                    fontFamily: "var(--font-mono)",
                    color: "var(--ink-text-4)",
                    lineHeight: 1.5,
                    padding: "1rem 0",
                  }}
                >
                  Select a finding from the list to review details and actions.
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
