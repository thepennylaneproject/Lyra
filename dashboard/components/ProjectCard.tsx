import type { Project } from "@/lib/types";
import { Badge } from "./Badge";
import { ProgressBar } from "./ProgressBar";
import { STATUS_GROUPS } from "@/lib/constants";

interface ProjectCardProps {
  project: Project;
  onClick: () => void;
}

export function ProjectCard({ project, onClick }: ProjectCardProps) {
  const findings = project.findings ?? [];
  const active = findings.filter((f) => STATUS_GROUPS.active.includes(f.status));
  const blockers = active.filter((f) => f.severity === "blocker").length;
  const resolved = findings.filter((f) =>
    STATUS_GROUPS.resolved.includes(f.status)
  ).length;
  const canShip =
    blockers === 0 &&
    active.filter((f) => f.type === "question").length === 0 &&
    findings.filter((f) => f.status === "fixed_pending_verify").length === 0;

  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
      style={{
        background: "var(--color-background-primary)",
        border: "0.5px solid var(--color-border-tertiary)",
        borderRadius: "var(--border-radius-lg)",
        padding: "1rem 1.25rem",
        cursor: "pointer",
        transition: "border-color 0.15s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "var(--color-border-secondary)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--color-border-tertiary)";
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <span
          style={{
            fontWeight: 500,
            fontSize: "14px",
            color: "var(--color-text-primary)",
          }}
        >
          {project.name}
        </span>
        {canShip && findings.length > 0 && (
          <Badge color="nit">Ship</Badge>
        )}
        {blockers > 0 && <Badge color="blocker">{blockers}</Badge>}
        {findings.length === 0 && (
          <span
            style={{
              fontSize: "11px",
              color: "var(--color-text-tertiary)",
            }}
          >
            No data
          </span>
        )}
      </div>
      {findings.length > 0 && (
        <>
          <ProgressBar
            value={resolved}
            max={findings.length}
            color="#1D9E75"
          />
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginTop: 6,
              fontSize: "11px",
              color: "var(--color-text-tertiary)",
            }}
          >
            <span>{active.length} active</span>
            <span>
              {resolved}/{findings.length} resolved
            </span>
          </div>
        </>
      )}
    </div>
  );
}
