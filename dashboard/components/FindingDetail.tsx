import { useState } from "react";
import type { Finding, FindingStatus } from "@/lib/types";
import { Badge } from "./Badge";
import { STATUS_GROUPS } from "@/lib/constants";

interface FindingDetailProps {
  finding: Finding;
  projectName: string;
  onClose: () => void;
  onAction: (findingId: string, newStatus: FindingStatus) => void;
  onQueueRepair?: (findingId: string, projectName: string) => Promise<void>;
  queuedFindingIds?: Set<string>;
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
  const isQueued = queuedFindingIds?.has(finding.finding_id) ?? false;
  const fix =
    typeof finding.suggested_fix === "object" ? finding.suggested_fix : {};
  return (
    <div
      style={{
        position: "relative",
        background: "var(--color-background-primary)",
        border: "0.5px solid var(--color-border-tertiary)",
        borderRadius: "var(--border-radius-lg)",
        padding: "1.25rem",
        marginBottom: "1rem",
      }}
    >
      <button
        type="button"
        onClick={onClose}
        style={{
          position: "absolute",
          top: 12,
          right: 12,
          background: "none",
          border: "none",
          cursor: "pointer",
          fontSize: "16px",
          color: "var(--color-text-tertiary)",
        }}
      >
        ×
      </button>
      <div
        style={{
          display: "flex",
          gap: 6,
          marginBottom: 8,
          flexWrap: "wrap",
        }}
      >
        <Badge color={finding.severity}>{finding.severity}</Badge>
        <Badge>{finding.priority}</Badge>
        <Badge>{finding.type}</Badge>
        <Badge>{finding.status}</Badge>
        <Badge>{finding.confidence ?? ""}</Badge>
      </div>
      <h3
        style={{
          fontSize: "16px",
          fontWeight: 500,
          margin: "8px 0",
          color: "var(--color-text-primary)",
        }}
      >
        {finding.title}
      </h3>
      <p
        style={{
          fontSize: "13px",
          color: "var(--color-text-secondary)",
          lineHeight: 1.6,
          margin: "0 0 12px",
        }}
      >
        {finding.description}
      </p>

      {finding.proof_hooks && finding.proof_hooks.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div
            style={{
              fontSize: "12px",
              fontWeight: 500,
              color: "var(--color-text-secondary)",
              marginBottom: 4,
            }}
          >
            Proof hooks
          </div>
          {finding.proof_hooks.map((h, i) => (
            <div
              key={i}
              style={{
                fontSize: "12px",
                padding: "4px 8px",
                background: "var(--color-background-secondary)",
                borderRadius: "var(--border-radius-md)",
                marginBottom: 4,
                fontFamily: "var(--font-mono)",
              }}
            >
              <span style={{ color: "var(--color-text-info)" }}>
                [{h.hook_type ?? h.type ?? "?"}]
              </span>{" "}
              <span style={{ color: "var(--color-text-primary)" }}>
                {h.summary ?? h.value ?? ""}
              </span>
              {h.file && (
                <span style={{ color: "var(--color-text-tertiary)" }}>
                  {" "}
                  {h.file}
                  {h.start_line != null ? `:${h.start_line}` : ""}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {fix.approach && (
        <div style={{ marginBottom: 12 }}>
          <div
            style={{
              fontSize: "12px",
              fontWeight: 500,
              color: "var(--color-text-secondary)",
              marginBottom: 4,
            }}
          >
            Suggested fix
          </div>
          <p
            style={{
              fontSize: "13px",
              color: "var(--color-text-primary)",
              lineHeight: 1.5,
              margin: 0,
            }}
          >
            {fix.approach}
          </p>
          {fix.affected_files && fix.affected_files.length > 0 && (
            <div
              style={{
                marginTop: 4,
                fontSize: "12px",
                color: "var(--color-text-tertiary)",
                fontFamily: "var(--font-mono)",
              }}
            >
              {fix.affected_files.join(", ")}
            </div>
          )}
          {fix.estimated_effort && (
            <div
              style={{
                marginTop: 4,
                fontSize: "12px",
                color: "var(--color-text-secondary)",
              }}
            >
              Effort: {fix.estimated_effort}
            </div>
          )}
        </div>
      )}

      {finding.history && finding.history.length > 0 && (
        <div>
          <div
            style={{
              fontSize: "12px",
              fontWeight: 500,
              color: "var(--color-text-secondary)",
              marginBottom: 4,
            }}
          >
            Timeline ({finding.history.length} events)
          </div>
          {finding.history.slice(-5).map((ev, i) => (
            <div
              key={i}
              style={{
                fontSize: "11px",
                color: "var(--color-text-tertiary)",
                padding: "2px 0",
              }}
            >
              {ev.timestamp?.slice(0, 10)} {ev.actor} - {ev.event}
              {ev.notes ? `: ${ev.notes.slice(0, 80)}` : ""}
            </div>
          ))}
        </div>
      )}

      <div
        style={{
          display: "flex",
          gap: 8,
          marginTop: 16,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        {STATUS_GROUPS.active.includes(finding.status) && (
          <>
            <button
              type="button"
              onClick={() => onAction(finding.finding_id, "in_progress")}
              style={{ fontSize: "12px", padding: "4px 12px" }}
            >
              Start fix
            </button>
            <button
              type="button"
              onClick={() => onAction(finding.finding_id, "deferred")}
              style={{ fontSize: "12px", padding: "4px 12px" }}
            >
              Defer
            </button>
          </>
        )}
        {finding.status === "in_progress" && (
          <button
            type="button"
            onClick={() =>
              onAction(finding.finding_id, "fixed_pending_verify")
            }
            style={{ fontSize: "12px", padding: "4px 12px" }}
          >
            Mark done
          </button>
        )}
        {finding.status === "fixed_pending_verify" && (
          <button
            type="button"
            onClick={() => onAction(finding.finding_id, "fixed_verified")}
            style={{ fontSize: "12px", padding: "4px 12px" }}
          >
            Verify fix
          </button>
        )}

        {onQueueRepair && !isQueued && (
          <button
            type="button"
            disabled={queueing}
            onClick={async () => {
              setQueueing(true);
              setQueueMsg(null);
              try {
                await onQueueRepair(finding.finding_id, projectName);
                setQueueMsg("Queued.");
              } catch {
                setQueueMsg("Failed to queue.");
              } finally {
                setQueueing(false);
              }
            }}
            style={{
              fontSize: "12px",
              padding: "4px 12px",
              marginLeft: "auto",
              opacity: queueing ? 0.5 : 1,
              cursor: queueing ? "default" : "pointer",
            }}
            title="Send this finding to the repair engine"
          >
            {queueing ? "Queueing…" : "⚙ Queue repair"}
          </button>
        )}
        {isQueued && (
          <span
            style={{
              fontSize: "11px",
              color: "#EF9F27",
              marginLeft: "auto",
              fontFamily: "var(--font-mono)",
            }}
          >
            ⚙ Queued for repair
          </span>
        )}
        {queueMsg && !isQueued && (
          <span style={{ fontSize: "11px", color: "var(--color-text-tertiary)" }}>
            {queueMsg}
          </span>
        )}
      </div>
    </div>
  );
}
