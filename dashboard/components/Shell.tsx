"use client";

import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/api-fetch";
import type { EngineStatus } from "@/lib/audit-reader";

const AGENTS = [
  { key: "audit",       label: "Audit agent" },
  { key: "patch",       label: "Patch agent" },
  { key: "synthesizer", label: "Synthesizer" },
];

type AgentState = "idle" | "active" | "error";
export type NavView = "portfolio" | "engine";

interface ShellProps {
  children:    React.ReactNode;
  activeView:  NavView;
  onNavigate:  (view: NavView) => void;
}

function AgentDot({ state }: { state: AgentState }) {
  const colors: Record<AgentState, string> = {
    idle:   "var(--ink-text-4)",
    active: "var(--ink-green)",
    error:  "var(--ink-red)",
  };
  return (
    <span
      style={{
        display:      "inline-block",
        width:        6,
        height:       6,
        borderRadius: "50%",
        background:   colors[state],
        flexShrink:   0,
        animation:    state === "active" ? "pulse-dot 2s ease-in-out infinite" : undefined,
      }}
    />
  );
}

export function Shell({ children, activeView, onNavigate }: ShellProps) {
  const [engineStatus, setEngineStatus] = useState<EngineStatus | null>(null);
  const [syncing,      setSyncing]      = useState(false);
  const [syncMsg,      setSyncMsg]      = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await apiFetch("/api/engine/status");
      if (res.ok) setEngineStatus(await res.json());
    } catch {}
  }, []);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  const handleSync = async () => {
    setSyncing(true);
    setSyncMsg(null);
    try {
      const res  = await apiFetch("/api/sync/audit", { method: "POST" });
      const data = await res.json();
      setSyncMsg(data.message ?? (res.ok ? "Synced." : "Failed."));
      if (res.ok) await fetchStatus();
    } catch {
      setSyncMsg("Failed.");
    } finally {
      setSyncing(false);
    }
  };

  const queueSize  = engineStatus?.queue_size ?? 0;
  const auditRuns  = engineStatus?.audit_run_count ?? 0;
  const repairRuns = engineStatus?.repair_run_count ?? 0;

  const agentStates: Record<string, AgentState> = {
    audit:       syncing ? "active" : auditRuns  > 0 ? "idle" : "idle",
    patch:       queueSize > 0 ? "active" : repairRuns > 0 ? "idle" : "idle",
    synthesizer: "idle",
  };

  function fmtDate(d: string | null): string {
    if (!d) return "never";
    try {
      return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    } catch { return d; }
  }

  const NAV_ITEMS: { key: NavView; label: string }[] = [
    { key: "portfolio", label: "Portfolio" },
    { key: "engine",    label: "Repair queue" },
  ];

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--ink-bg)" }}>
      {/* ── Sidebar ── */}
      <aside
        style={{
          width:         "var(--sidebar-width)",
          minWidth:      "var(--sidebar-width)",
          borderRight:   "0.5px solid var(--ink-border-faint)",
          display:       "flex",
          flexDirection: "column",
          padding:       "1.75rem 0 1.25rem",
          position:      "sticky",
          top:           0,
          height:        "100vh",
          background:    "var(--ink-bg)",
        }}
      >
        {/* Wordmark */}
        <div style={{ padding: "0 1.25rem", marginBottom: "2rem" }}>
          <span
            style={{
              fontFamily:   "var(--font-serif)",
              fontSize:     "19px",
              fontStyle:    "italic",
              color:        "var(--ink-text)",
              letterSpacing: "0.01em",
            }}
          >
            Lyra
          </span>
        </div>

        {/* Agents */}
        <div style={{ padding: "0 1.25rem", marginBottom: "1.5rem" }}>
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
            Agents
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {AGENTS.map(({ key, label }) => (
              <div key={key} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <AgentDot state={agentStates[key] ?? "idle"} />
                <span style={{ fontSize: "12px", color: "var(--ink-text-3)" }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Divider */}
        <div
          style={{
            height:     "0.5px",
            background: "var(--ink-border-faint)",
            margin:     "0 1.25rem 1.25rem",
          }}
        />

        {/* Nav */}
        <nav
          style={{
            padding:       "0 1.25rem",
            display:       "flex",
            flexDirection: "column",
            gap:           "0.125rem",
          }}
        >
          {NAV_ITEMS.map(({ key, label }) => {
            const isActive = activeView === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => onNavigate(key)}
                style={{
                  textAlign:    "left",
                  fontSize:     "13px",
                  fontFamily:   "var(--font-sans)",
                  color:        isActive ? "var(--ink-text)" : "var(--ink-text-3)",
                  fontWeight:   isActive ? 500 : 400,
                  background:   isActive ? "var(--ink-bg-raised)" : "transparent",
                  border:       "none",
                  borderRadius: "var(--radius-md)",
                  padding:      "4px 8px",
                  cursor:       "pointer",
                  transition:   "background 0.1s, color 0.1s",
                  display:      "flex",
                  alignItems:   "center",
                  gap:          "0.5rem",
                }}
              >
                {label}
                {key === "engine" && queueSize > 0 && (
                  <span
                    style={{
                      fontSize:     "9px",
                      fontFamily:   "var(--font-mono)",
                      background:   "var(--ink-amber-bg)",
                      color:        "var(--ink-amber)",
                      border:       "0.5px solid var(--ink-amber-border)",
                      borderRadius: "3px",
                      padding:      "1px 5px",
                      lineHeight:   1,
                    }}
                  >
                    {queueSize}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Engine footer */}
        <div style={{ padding: "0 1.25rem" }}>
          {syncMsg && (
            <div
              style={{
                fontSize:     "11px",
                color:        "var(--ink-text-4)",
                marginBottom: "0.375rem",
                fontFamily:   "var(--font-mono)",
              }}
            >
              {syncMsg}
            </div>
          )}
          {engineStatus && (
            <div
              style={{
                fontSize:     "11px",
                color:        "var(--ink-text-4)",
                fontFamily:   "var(--font-mono)",
                marginBottom: "0.375rem",
                lineHeight:   1.5,
              }}
            >
              <span>{engineStatus.audit_run_count} audits</span>
              {" · "}
              <span>{engineStatus.repair_run_count} repairs</span>
              {queueSize > 0 && (
                <span style={{ color: "var(--ink-amber)" }}>
                  {" · "}{queueSize} queued
                </span>
              )}
              <br />
              <span>Last: {fmtDate(engineStatus.last_audit_date)}</span>
            </div>
          )}
          <button
            type="button"
            onClick={handleSync}
            disabled={syncing}
            style={{
              fontSize:   "11px",
              fontFamily: "var(--font-mono)",
              border:     "none",
              background: "transparent",
              padding:    "0",
              color:      syncing ? "var(--ink-text-4)" : "var(--ink-text-3)",
              cursor:     syncing ? "default" : "pointer",
            }}
          >
            {syncing ? "syncing…" : "sync now"}
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main
        style={{
          flex:     1,
          minWidth: 0,
          padding:  "2.5rem 3rem",
          maxWidth: "calc(var(--content-max) + 6rem)",
        }}
      >
        {children}
      </main>
    </div>
  );
}
