"use client";

import { useState, useEffect, useCallback } from "react";
import type { EngineStatus } from "@/lib/audit-reader";

interface EnginePanelProps {
  onSyncComplete?: () => void;
}

function fmt(dateStr: string | null): string {
  if (!dateStr) return "Never";
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function usd(n: number): string {
  return n === 0 ? "$0.00" : `$${n.toFixed(4)}`;
}

export function EnginePanel({ onSyncComplete }: EnginePanelProps) {
  const [status, setStatus] = useState<EngineStatus | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/engine/status");
      if (res.ok) setStatus(await res.json());
    } catch {}
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const handleSync = async () => {
    setSyncing(true);
    setSyncMsg(null);
    try {
      const res = await fetch("/api/sync/audit", { method: "POST" });
      const data = await res.json();
      setSyncMsg(data.message ?? (res.ok ? "Done." : "Sync failed."));
      if (res.ok) {
        await fetchStatus();
        onSyncComplete?.();
      }
    } catch (e) {
      setSyncMsg("Sync failed.");
    } finally {
      setSyncing(false);
    }
  };

  const pill = (label: string, value: string | number, accent?: string) => (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 2,
      }}
    >
      <span
        style={{
          fontSize: "14px",
          fontWeight: 600,
          color: accent ?? "var(--color-text-primary)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </span>
      <span style={{ fontSize: "10px", color: "var(--color-text-tertiary)" }}>
        {label}
      </span>
    </div>
  );

  return (
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
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 10,
        }}
      >
        <span
          style={{
            fontSize: "11px",
            fontWeight: 500,
            color: "var(--color-text-tertiary)",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          Engine
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {syncMsg && (
            <span
              style={{
                fontSize: "11px",
                color: "var(--color-text-tertiary)",
                fontStyle: "italic",
              }}
            >
              {syncMsg}
            </span>
          )}
          <button
            type="button"
            onClick={handleSync}
            disabled={syncing}
            style={{
              fontSize: "11px",
              padding: "3px 10px",
              opacity: syncing ? 0.5 : 1,
              cursor: syncing ? "default" : "pointer",
            }}
          >
            {syncing ? "Syncing…" : "↓ Sync audit output"}
          </button>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: 8,
        }}
      >
        {pill("Last audit", status ? fmt(status.last_audit_date) : "—")}
        {pill("Audit runs", status?.audit_run_count ?? "—")}
        {pill("Repair runs", status?.repair_run_count ?? "—")}
        {pill(
          "In queue",
          status?.queue_size ?? "—",
          status && status.queue_size > 0 ? "#EF9F27" : undefined
        )}
        {pill(
          "Total cost",
          status ? usd(status.total_cost_usd) : "—",
          status && status.total_cost_usd > 0 ? "#1D9E75" : undefined
        )}
      </div>
    </div>
  );
}
