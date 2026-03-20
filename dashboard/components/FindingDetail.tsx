import { useState } from "react";
import type { Finding, FindingStatus } from "@/lib/types";
import { Badge } from "./Badge";
import { STATUS_GROUPS } from "@/lib/constants";
import { isInQueuedSet } from "@/lib/finding-validation";

const WORKFLOW_HINTS: Record<FindingStatus, string> = {
  open: "Finding is new and unresolved. Start work or defer.",
  accepted: "Finding is acknowledged and pending action.",
  in_progress: "You're actively working on this fix.",
  fixed_pending_verify: "Fix is implemented; awaiting verification.",
  fixed_verified: "Fix has been verified and is complete.",
  wont_fix: "You've decided not to fix this.",
  deferred: "Fix postponed for later.",
  duplicate: "This is a duplicate of another finding.",
  converted_to_enhancement: "This has been converted to an enhancement request.",
};

const SEVERITY_BORDER: Record<string, string> = {
  blocker: "var(--ink-red)",
  major:   "var(--ink-amber)",
  minor:   "var(--ink-blue)",
  nit:     "var(--ink-border)",
};

interface FindingDetailProps {
  finding:           Finding;
  projectName:       string;
  onClose:           () => void;
  onAction:          (findingId: string, newStatus: FindingStatus) => void;
  onQueueRepair?:    (findingId: string, projectName: string) => Promise<void>;
  queuedFindingIds?: Set<string>;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize:      "9px",
        fontFamily:    "var(--font-mono)",
        fontWeight:    500,
        color:         "var(--ink-text-4)",
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        marginBottom:  "0.5rem",
      }}
    >
      {children}
    </div>
  );
}

export function FindingDetail({
  finding,
  projectName,
  onClose,
  onAction,
  onQueueRepair,
  queuedFindingIds,
}: FindingDetailProps) {
  const [queueing, setQueueing] = useState(false);
  const [queueMsg, setQueueMsg] = useState<string | null>(null);
  const [actionInFlight, setActionInFlight] = useState<string | null>(null);
  const isQueued = isInQueuedSet(queuedFindingIds, projectName, finding.finding_id);
  const fix      = typeof finding.suggested_fix === "object" ? finding.suggested_fix : {};
  const stripe   = SEVERITY_BORDER[finding.severity ?? ""] ?? "var(--ink-border)";

  const handleAction = async (status: FindingStatus) => {
    setActionInFlight(status);
    try {
      await onAction(finding.finding_id, status);
    } finally {
      setActionInFlight(null);
    }
  };

  return (
    <div
      className="animate-fade-in"
      style={{
        position:     "relative",
        background:   "var(--ink-bg-raised)",
        border:       "0.5px solid var(--ink-border-faint)",
        borderLeft:   `3px solid ${stripe}`,
        borderRadius: `0 var(--radius-lg) var(--radius-lg) 0`,
        padding:      "1.5rem 1.75rem",
        marginBottom: "1.25rem",
      }}
    >
      {/* Close */}
      <button
        type="button"
        onClick={onClose}
        style={{
          position:    "absolute",
          top:         "0.875rem",
          right:       "0.875rem",
          border:      "none",
          background:  "transparent",
          padding:     "0 4px",
          fontSize:    "16px",
          color:       "var(--ink-text-4)",
          lineHeight:  1,
        }}
        aria-label="Close"
      >
        ×
      </button>

      {/* Badges row */}
      <div
        style={{
          display:    "flex",
          gap:        "0.375rem",
          marginBottom: "0.75rem",
          flexWrap:   "wrap",
        }}
      >
        <Badge color={finding.severity}>{finding.severity}</Badge>
        <Badge>{finding.priority}</Badge>
        <Badge>{finding.type}</Badge>
        <Badge>{finding.status?.replace(/_/g, " ")}</Badge>
        {finding.confidence && <Badge>{finding.confidence}</Badge>}
      </div>

      {/* Title */}
      <h3
        style={{
          fontSize:     "15px",
          fontWeight:   500,
          margin:       "0 0 0.625rem",
          color:        "var(--ink-text)",
          lineHeight:   1.4,
          paddingRight: "1.5rem",
        }}
      >
        {finding.title}
      </h3>

      {/* ID */}
      <div
        style={{
          fontSize:     "10px",
          fontFamily:   "var(--font-mono)",
          color:        "var(--ink-text-4)",
          marginBottom: "1rem",
        }}
      >
        {finding.finding_id}
      </div>

      {/* Description */}
      <p
        style={{
          fontSize:     "13px",
          color:        "var(--ink-text-2)",
          lineHeight:   1.65,
          margin:       "0 0 1.25rem",
        }}
      >
        {finding.description}
      </p>

      {/* Proof hooks */}
      {finding.proof_hooks && finding.proof_hooks.length > 0 && (
        <div style={{ marginBottom: "1.25rem" }}>
          <SectionLabel>Proof hooks</SectionLabel>
          <div
            style={{
              background:   "var(--ink-bg-sunken)",
              border:       "0.5px solid var(--ink-border-faint)",
              borderRadius: "var(--radius-md)",
              padding:      "0.625rem 0.75rem",
              display:      "flex",
              flexDirection: "column",
              gap:          "0.375rem",
            }}
          >
            {finding.proof_hooks.map((h, i) => (
              <div key={i} style={{ fontSize: "11px", fontFamily: "var(--font-mono)", lineHeight: 1.5 }}>
                <span style={{ color: "var(--ink-blue)" }}>
                  [{h.hook_type ?? h.type ?? "?"}]
                </span>{" "}
                <span style={{ color: "var(--ink-text-2)" }}>
                  {h.summary ?? h.value ?? ""}
                </span>
                {h.file && (
                  <span style={{ color: "var(--ink-text-4)" }}>
                    {" "}{h.file}{h.start_line != null ? `:${h.start_line}` : ""}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Suggested fix */}
      {fix.approach && (
        <div style={{ marginBottom: "1.25rem" }}>
          <SectionLabel>Suggested fix</SectionLabel>
          <p style={{ fontSize: "13px", color: "var(--ink-text-2)", lineHeight: 1.6, margin: 0 }}>
            {fix.approach}
          </p>
          {fix.affected_files && fix.affected_files.length > 0 && (
            <div
              style={{
                marginTop:  "0.5rem",
                fontSize:   "11px",
                fontFamily: "var(--font-mono)",
                color:      "var(--ink-text-4)",
              }}
            >
              {fix.affected_files.join(", ")}
            </div>
          )}
          {fix.estimated_effort && (
            <div style={{ marginTop: "0.25rem", fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--ink-text-3)" }}>
              effort: {fix.estimated_effort}
            </div>
          )}
        </div>
      )}

      {/* Timeline */}
      {finding.history && finding.history.length > 0 && (
        <div style={{ marginBottom: "1.25rem" }}>
          <SectionLabel>Timeline</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            {finding.history.slice(-5).map((ev, i) => (
              <div
                key={i}
                style={{
                  fontSize:   "11px",
                  fontFamily: "var(--font-mono)",
                  color:      "var(--ink-text-4)",
                  lineHeight: 1.5,
                }}
              >
                <span style={{ color: "var(--ink-text-3)" }}>{ev.timestamp?.slice(0, 10)}</span>
                {" "}{ev.actor} · {ev.event}
                {ev.notes ? ` — ${ev.notes.slice(0, 80)}` : ""}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Status workflow hint */}
      {finding.status && (
        <div
          style={{
            fontSize: "12px",
            color: "var(--ink-text-2)",
            lineHeight: 1.5,
            marginBottom: "1rem",
            padding: "0.75rem 0.85rem",
            background: "var(--ink-bg-sunken)",
            borderRadius: "var(--radius-md)",
            border: "0.5px solid var(--ink-border-faint)",
          }}
        >
          <strong style={{ color: "var(--ink-text)" }}>Status:</strong>{" "}
          {WORKFLOW_HINTS[finding.status] ?? "Unknown status"}
        </div>
      )}

      {/* Actions */}
      <div
        style={{
          display:      "flex",
          gap:          "0.5rem",
          alignItems:   "center",
          flexWrap:     "wrap",
          borderTop:    "0.5px solid var(--ink-border-faint)",
          paddingTop:   "1rem",
          marginTop:    "0.25rem",
        }}
      >
        {STATUS_GROUPS.active.includes(finding.status) && (
          <>
            <button
              type="button"
              disabled={actionInFlight !== null}
              onClick={() => handleAction("in_progress")}
            >
              {actionInFlight === "in_progress" ? "…" : "Start fix"}
            </button>
            <button
              type="button"
              disabled={actionInFlight !== null}
              onClick={() => handleAction("deferred")}
            >
              {actionInFlight === "deferred" ? "…" : "Defer"}
            </button>
          </>
        )}
        {finding.status === "in_progress" && (
          <button
            type="button"
            disabled={actionInFlight !== null}
            onClick={() => handleAction("fixed_pending_verify")}
          >
            {actionInFlight === "fixed_pending_verify" ? "…" : "Mark done"}
          </button>
        )}
        {finding.status === "fixed_pending_verify" && (
          <button
            type="button"
            disabled={actionInFlight !== null}
            onClick={() => handleAction("fixed_verified")}
          >
            {actionInFlight === "fixed_verified" ? "…" : "Verify fix"}
          </button>
        )}

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          {onQueueRepair && !isQueued && (
            <button
              type="button"
              disabled={queueing}
              onClick={async () => {
                setQueueing(true);
                setQueueMsg(null);
                try {
                  await onQueueRepair(finding.finding_id, projectName);
                  setQueueMsg("✓ queued for repair");
                } catch {
                  setQueueMsg("✗ failed to queue");
                } finally {
                  setQueueing(false);
                }
              }}
              style={{
                borderColor: stripe,
                color:       stripe,
                fontFamily:  "var(--font-mono)",
                fontSize:    "11px",
              }}
              title="Send to repair engine"
            >
              {queueing ? "queueing…" : "queue repair →"}
            </button>
          )}
          {isQueued && (
            <span style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--ink-amber)" }}>
              queued for repair
            </span>
          )}
          {queueMsg && !isQueued && (
            <span
              style={{
                fontSize: "11px",
                fontFamily: "var(--font-mono)",
                color: queueMsg.includes("✓") ? "var(--ink-green)" : "var(--ink-red)",
              }}
            >
              {queueMsg}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
