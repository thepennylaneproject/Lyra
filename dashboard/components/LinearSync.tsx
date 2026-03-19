"use client";

import { useState, useCallback, useEffect } from "react";
import { apiFetch } from "@/lib/api-fetch";

interface SyncStatus {
  configured: boolean;
  last_sync: string | null;
  synced_count: number;
  in_linear_only: number;
  unsynced_unresolved: number;
}

interface LinearSyncProps {
  projectName: string;
}

export function LinearSync({ projectName }: LinearSyncProps) {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [action, setAction] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await apiFetch(
        `/api/sync/linear/status?project=${encodeURIComponent(projectName)}`
      );
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch {
      setStatus(null);
    }
  }, [projectName]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const push = useCallback(async () => {
    setAction("push");
    try {
      const res = await apiFetch("/api/sync/linear/push", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectName }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) await fetchStatus();
      else alert(data.error ?? "Push failed");
    } finally {
      setAction(null);
    }
  }, [projectName, fetchStatus]);

  const pull = useCallback(async () => {
    setAction("pull");
    try {
      const res = await apiFetch("/api/sync/linear/pull", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectName }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) await fetchStatus();
      else alert(data.error ?? "Pull failed");
    } finally {
      setAction(null);
    }
  }, [projectName, fetchStatus]);

  if (status === null) {
    return (
      <div
        style={{
          fontSize:     "11px",
          fontFamily:   "var(--font-mono)",
          color:        "var(--ink-text-4)",
          marginBottom: "1rem",
        }}
      >
        linear: loading…
      </div>
    );
  }

  if (!status.configured) {
    return (
      <div
        style={{
          fontSize:     "11px",
          fontFamily:   "var(--font-mono)",
          color:        "var(--ink-text-4)",
          marginBottom: "1rem",
        }}
      >
        linear: not configured
      </div>
    );
  }

  return (
    <div
      style={{
        display:      "flex",
        alignItems:   "center",
        gap:          "0.75rem",
        marginBottom: "1rem",
        flexWrap:     "wrap",
      }}
    >
      <span style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--ink-text-4)" }}>
        linear
      </span>
      {status.last_sync && (
        <span style={{ fontSize: "10px", fontFamily: "var(--font-mono)", color: "var(--ink-text-4)" }}>
          {status.last_sync.slice(0, 10)}
        </span>
      )}
      <span style={{ fontSize: "10px", fontFamily: "var(--font-mono)", color: "var(--ink-text-3)" }}>
        {status.synced_count} synced
      </span>
      {status.unsynced_unresolved > 0 && (
        <span style={{ fontSize: "10px", fontFamily: "var(--font-mono)", color: "var(--ink-amber)" }}>
          {status.unsynced_unresolved} to push
        </span>
      )}
      <button
        type="button"
        onClick={push}
        disabled={!!action}
        style={{ fontSize: "10px", fontFamily: "var(--font-mono)", padding: "2px 8px" }}
      >
        {action === "push" ? "…" : "push"}
      </button>
      <button
        type="button"
        onClick={pull}
        disabled={!!action}
        style={{ fontSize: "10px", fontFamily: "var(--font-mono)", padding: "2px 8px" }}
      >
        {action === "pull" ? "…" : "pull"}
      </button>
    </div>
  );
}
