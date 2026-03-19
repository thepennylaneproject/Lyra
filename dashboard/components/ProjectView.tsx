"use client";

import { useState, useCallback, useEffect } from "react";
import type { Project, Finding, FindingStatus } from "@/lib/types";
import { Badge } from "./Badge";
import { MetricCard } from "./MetricCard";
import { ProgressBar } from "./ProgressBar";
import { EmptyState } from "./EmptyState";
import { FindingRow } from "./FindingRow";
import { FindingDetail } from "./FindingDetail";
import { LinearSync } from "./LinearSync";
import { STATUS_GROUPS, sortFindings } from "@/lib/constants";

type FilterKey = "active" | "pending" | "resolved" | "all";

interface ProjectViewProps {
  project:           Project;
  onBack:            () => void;
  onUpdateFinding:   (projectName: string, findingId: string, status: FindingStatus) => Promise<void>;
  refetchProject:    () => Promise<Project | null>;
  onQueueRepair?:    (findingId: string, projectName: string) => Promise<void>;
  queuedFindingIds?: Set<string>;
}

export function ProjectView({
  project,
  onBack,
  onUpdateFinding,
  refetchProject,
  onQueueRepair,
  queuedFindingIds,
}: ProjectViewProps) {
  const [filter,   setFilter]   = useState<FilterKey>("active");
  const [search,   setSearch]   = useState("");
  const [selected, setSelected] = useState<Finding | null>(null);
  const [findings, setFindings] = useState<Finding[]>(project.findings ?? []);

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
      await onUpdateFinding(project.name, findingId, newStatus);
      const updated = await refetchProject();
      if (updated) setFindings(updated.findings ?? []);
      const f = updated?.findings?.find((x) => x.finding_id === findingId);
      if (f) setSelected({ ...f, status: newStatus });
    },
    [project.name, onUpdateFinding, refetchProject]
  );

  const selectedFinding =
    selected && (findings.find((f) => f.finding_id === selected.finding_id) ?? selected);

  return (
    <div>
      {/* Back + project header */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.875rem", marginBottom: "1.75rem" }}>
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
        {canShip && (
          <span style={{ fontSize: "10px", fontFamily: "var(--font-mono)", color: "var(--ink-green)" }}>
            ✓ ship
          </span>
        )}
        {!canShip && blockers > 0 && (
          <Badge color="blocker">{blockers} blocker{blockers > 1 ? "s" : ""}</Badge>
        )}
      </div>

      {/* Metrics */}
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
        <MetricCard label="Pending"       value={counts.pending} />
        <MetricCard label="Resolved"      value={resolved}       accent={resolved > 0 ? "var(--ink-green)" : undefined} />
        <MetricCard label="Blockers"      value={blockers}       accent={blockers > 0 ? "var(--ink-red)"   : undefined} />
        <MetricCard label="Questions"     value={questions}      accent={questions > 0 ? "var(--ink-blue)" : undefined} />
      </div>

      {/* Progress */}
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

      {/* Linear sync */}
      <LinearSync projectName={project.name} />

      {/* Finding detail panel */}
      {selectedFinding && (
        <FindingDetail
          finding={selectedFinding}
          projectName={project.name}
          onClose={() => setSelected(null)}
          onAction={handleAction}
          onQueueRepair={onQueueRepair}
          queuedFindingIds={queuedFindingIds}
        />
      )}

      {/* Filter bar */}
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
            {f}{f !== "all" && ` (${counts[f] ?? 0})`}
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
            padding:     "3px 8px",
          }}
        />
      </div>

      {/* Finding list */}
      <div style={{ display: "flex", flexDirection: "column", gap: "2px" }}>
        {filtered.length === 0 && (
          <EmptyState
            icon="✓"
            title={filter === "active" ? "No active findings" : "No findings match"}
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
  );
}
