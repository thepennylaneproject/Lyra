"use client";

import { Badge } from "./Badge";

const SEVERITY_BORDER: Record<string, string> = {
  blocker: "var(--ink-red)",
  major:   "var(--ink-amber)",
  minor:   "var(--ink-blue)",
  nit:     "var(--ink-gray)",
};

interface NextActionCardProps {
  title:       string;
  findingId:   string;
  priority:    string;
  severity:    string;
  projectName: string;
  isQueued:    boolean;
  onQueue:     () => void;
  onOpen:      () => void;
}

export function NextActionCard({
  title,
  findingId,
  priority,
  severity,
  projectName,
  isQueued,
  onQueue,
  onOpen,
}: NextActionCardProps) {
  const accentColor = SEVERITY_BORDER[severity] ?? "var(--ink-gray)";

  return (
    <div
      className="animate-fade-in"
      style={{
        borderLeft:     `3px solid ${accentColor}`,
        background:     "var(--ink-bg-raised)",
        borderRadius:   `0 var(--radius-lg) var(--radius-lg) 0`,
        padding:        "1.25rem 1.5rem",
        marginBottom:   "2rem",
        cursor:         "pointer",
      }}
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onOpen()}
    >
      {/* Label */}
      <div
        style={{
          fontSize:      "9px",
          fontFamily:    "var(--font-mono)",
          fontWeight:    500,
          color:         "var(--ink-text-4)",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          marginBottom:  "0.625rem",
        }}
      >
        Next action
      </div>

      {/* Project + badges */}
      <div
        style={{
          display:    "flex",
          alignItems: "center",
          gap:        "0.5rem",
          marginBottom: "0.375rem",
          flexWrap:   "wrap",
        }}
      >
        <span
          style={{
            fontSize:   "12px",
            color:      "var(--ink-text-3)",
            fontFamily: "var(--font-mono)",
          }}
        >
          {projectName}
        </span>
        <Badge color={severity} small>{severity}</Badge>
        <Badge small>{priority}</Badge>
      </div>

      {/* Title */}
      <div
        style={{
          fontSize:   "15px",
          fontWeight: 500,
          color:      "var(--ink-text)",
          lineHeight: 1.4,
          marginBottom: "0.75rem",
        }}
      >
        {title}
      </div>

      {/* Footer row */}
      <div
        style={{
          display:    "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span
          style={{
            fontSize:   "11px",
            color:      "var(--ink-text-4)",
            fontFamily: "var(--font-mono)",
          }}
        >
          {findingId}
        </span>

        {!isQueued ? (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onQueue();
            }}
            style={{
              fontSize:    "11px",
              fontFamily:  "var(--font-mono)",
              padding:     "3px 10px",
              borderColor: accentColor,
              color:       accentColor,
            }}
          >
            queue repair →
          </button>
        ) : (
          <span
            style={{
              fontSize:   "11px",
              fontFamily: "var(--font-mono)",
              color:      "var(--ink-amber)",
            }}
          >
            queued for repair
          </span>
        )}
      </div>
    </div>
  );
}
