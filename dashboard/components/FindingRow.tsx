import type { Finding } from "@/lib/types";
import { Badge } from "./Badge";
import { STATUS_GROUPS, TYPE_ICONS, getSeverityColors } from "@/lib/constants";

interface FindingRowProps {
  finding: Finding;
  onClick: () => void;
}

export function FindingRow({ finding, onClick }: FindingRowProps) {
  const sc = getSeverityColors(finding.severity);
  const isActive = STATUS_GROUPS.active.includes(finding.status);
  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        padding: "10px 12px",
        borderRadius: "var(--border-radius-md)",
        cursor: "pointer",
        borderLeft: `3px solid ${sc.border}`,
        background: isActive ? "transparent" : "var(--color-background-secondary)",
        opacity: isActive ? 1 : 0.6,
        transition: "background 0.15s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "var(--color-background-secondary)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = isActive
          ? "transparent"
          : "var(--color-background-secondary)";
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginBottom: 4,
            flexWrap: "wrap",
          }}
        >
          <Badge color={finding.severity} small>
            {finding.severity}
          </Badge>
          <Badge small>{finding.priority}</Badge>
          <span
            style={{
              fontSize: "11px",
              color: "var(--color-text-tertiary)",
              fontFamily: "var(--font-mono)",
            }}
          >
            {finding.finding_id}
          </span>
        </div>
        <div
          style={{
            fontSize: "13px",
            fontWeight: 500,
            color: "var(--color-text-primary)",
            lineHeight: 1.4,
          }}
        >
          {finding.title}
        </div>
        <div
          style={{
            display: "flex",
            gap: 8,
            marginTop: 4,
            fontSize: "11px",
            color: "var(--color-text-tertiary)",
          }}
        >
          <span>
            {TYPE_ICONS[finding.type] ?? ""} {finding.type}
          </span>
          <span>{finding.confidence}</span>
          <span>{finding.status}</span>
          {finding.suggested_fix?.estimated_effort && (
            <span>{finding.suggested_fix.estimated_effort}</span>
          )}
        </div>
      </div>
    </div>
  );
}
