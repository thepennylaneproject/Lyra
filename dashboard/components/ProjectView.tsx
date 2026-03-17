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
import {
  STATUS_GROUPS,
  sortFindings,
} from "@/lib/constants";

type FilterKey = "active" | "pending" | "resolved" | "all";

interface ProjectViewProps {
  project: Project;
  onBack: () => void;
  onUpdateFinding: (
    projectName: string,
    findingId: string,
    status: FindingStatus
  ) => Promise<void>;
  refetchProject: () => Promise<Project | null>;
  onQueueRepair?: (findingId: string, projectName: string) => Promise<void>;
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
  const [filter, setFilter] = useState<FilterKey>("active");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Finding | null>(null);
  const [findings, setFindings] = useState<Finding[]>(project.findings ?? []);

  useEffect(() => {
    setFindings(project.findings ?? []);
  }, [project.name, project.findings]);

  const filtered = sortFindings(
    findings.filter((f) => {
      const statusMatch =
        filter === "all" ||
        (STATUS_GROUPS[filter] ?? []).includes(f.status);
      const searchLower = search.toLowerCase();
      const searchMatch =
        !search ||
        f.title?.toLowerCase().includes(searchLower) ||
        f.finding_id?.toLowerCase().includes(searchLower) ||
        (f.category?.toLowerCase().includes(searchLower) ?? false);
      return statusMatch && searchMatch;
    })
  );

  const counts = {
    active: findings.filter((f) => STATUS_GROUPS.active.includes(f.status))
      .length,
    pending: findings.filter((f) => STATUS_GROUPS.pending.includes(f.status))
      .length,
    resolved: findings.filter((f) => STATUS_GROUPS.resolved.includes(f.status))
      .length,
  };
  const blockers = findings.filter(
    (f) => f.severity === "blocker" && STATUS_GROUPS.active.includes(f.status)
  ).length;
  const questions = findings.filter(
    (f) => f.type === "question" && STATUS_GROUPS.active.includes(f.status)
  ).length;
  const resolved = counts.resolved;
  const total = findings.length;
  const canShip =
    blockers === 0 && questions === 0 && counts.pending === 0;

  const handleAction = useCallback(
    async (findingId: string, newStatus: FindingStatus) => {
      await onUpdateFinding(project.name, findingId, newStatus);
      const updated = await refetchProject();
      if (updated) setFindings(updated.findings ?? []);
      const f = findings.find((x) => x.finding_id === findingId);
      if (f) setSelected({ ...f, status: newStatus });
    },
    [project.name, onUpdateFinding, refetchProject, findings]
  );
  const selectedFinding =
    selected &&
    (findings.find((f) => f.finding_id === selected.finding_id) ?? selected);

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: "1rem",
        }}
      >
        <button
          type="button"
          onClick={onBack}
          style={{ fontSize: "13px", padding: "4px 12px" }}
        >
          ← Portfolio
        </button>
        <h2
          style={{
            fontSize: "18px",
            fontWeight: 500,
            margin: 0,
            color: "var(--color-text-primary)",
          }}
        >
          {project.name}
        </h2>
        {canShip && <Badge color="nit">Ready to ship</Badge>}
        {!canShip && blockers > 0 && (
          <Badge color="blocker">
            {blockers} blocker{blockers > 1 ? "s" : ""}
          </Badge>
        )}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
          gap: 8,
          marginBottom: "1rem",
        }}
      >
        <MetricCard label="Total" value={total} />
        <MetricCard
          label="Active"
          value={counts.active}
          accent={counts.active > 0 ? "#EF9F27" : undefined}
        />
        <MetricCard label="Pending verify" value={counts.pending} />
        <MetricCard
          label="Resolved"
          value={resolved}
          accent={resolved > 0 ? "#1D9E75" : undefined}
        />
        <MetricCard
          label="Blockers"
          value={blockers}
          accent={blockers > 0 ? "#E24B4A" : undefined}
        />
        <MetricCard
          label="Questions"
          value={questions}
          accent={questions > 0 ? "#378ADD" : undefined}
        />
      </div>

      <ProgressBar value={resolved} max={total} color="#1D9E75" />
      <div
        style={{
          fontSize: "11px",
          color: "var(--color-text-tertiary)",
          marginTop: 4,
          marginBottom: "0.5rem",
        }}
      >
        {resolved} of {total} findings resolved
      </div>

      <LinearSync projectName={project.name} />

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

      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 12,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        {(["active", "pending", "resolved", "all"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            style={{
              fontSize: "12px",
              padding: "3px 10px",
              background:
                filter === f
                  ? "var(--color-background-secondary)"
                  : "transparent",
              fontWeight: filter === f ? 500 : 400,
            }}
          >
            {f} {f !== "all" && `(${counts[f] ?? 0})`}
          </button>
        ))}
        <input
          type="text"
          placeholder="Search findings..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ marginLeft: "auto", fontSize: "12px", width: 180 }}
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {filtered.length === 0 && (
          <EmptyState
            icon="✓"
            title={
              filter === "active" ? "No active findings" : "No findings match"
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
  );
}
