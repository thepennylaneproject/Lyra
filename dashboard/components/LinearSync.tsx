"use client";

import { useState, useCallback, useEffect } from "react";

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
      const res = await fetch(
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
      const res = await fetch("/api/sync/linear/push", {
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
      const res = await fetch("/api/sync/linear/pull", {
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
          fontSize: "12px",
          color: "var(--color-text-tertiary)",
          marginBottom: "1rem",
        }}
      >
        Linear sync: loading…
      </div>
    );
  }

  if (!status.configured) {
    return (
      <div
        style={{
          fontSize: "12px",
          color: "var(--color-text-tertiary)",
          marginBottom: "1rem",
        }}
      >
        Linear sync: set LINEAR_API_KEY and LINEAR_TEAM_ID to enable.
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        marginBottom: "1rem",
        fontSize: "12px",
        color: "var(--color-text-secondary)",
      }}
    >
      <span>Linear:</span>
      {status.last_sync && (
        <span>Last sync: {status.last_sync.slice(0, 19).replace("T", " ")}</span>
      )}
      <span>{status.synced_count} synced</span>
      {status.unsynced_unresolved > 0 && (
        <span>{status.unsynced_unresolved} to push</span>
      )}
      <button
        type="button"
        onClick={push}
        disabled={!!action}
        style={{ fontSize: "11px", padding: "2px 8px" }}
      >
        {action === "push" ? "…" : "Push"}
      </button>
      <button
        type="button"
        onClick={pull}
        disabled={!!action}
        style={{ fontSize: "11px", padding: "2px 8px" }}
      >
        {action === "pull" ? "…" : "Pull"}
      </button>
    </div>
  );
}
