"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api-fetch";

export function DashboardLogin({ onSuccess }: { onSuccess: () => void }) {
  const [secret, setSecret] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const res = await apiFetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : "Invalid secret");
        return;
      }
      if (data.auth_required === false) {
        onSuccess();
        return;
      }
      setSecret("");
      onSuccess();
    } catch {
      setError("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      style={{
        minHeight:       "100vh",
        display:         "flex",
        alignItems:      "center",
        justifyContent:  "center",
        padding:         "2rem",
        background:      "var(--ink-bg)",
      }}
    >
      <form
        onSubmit={submit}
        style={{
          width:          "100%",
          maxWidth:       "400px",
          padding:        "1.75rem",
          background:     "var(--ink-bg-raised)",
          border:         "0.5px solid var(--ink-border)",
          borderRadius:   "var(--radius-lg)",
        }}
      >
        <div
          style={{
            fontSize:       "9px",
            fontFamily:     "var(--font-mono)",
            letterSpacing:  "0.1em",
            textTransform:  "uppercase",
            color:          "var(--ink-text-4)",
            marginBottom:   "0.5rem",
          }}
        >
          Lyra dashboard
        </div>
        <h1 style={{ fontSize: "15px", fontWeight: 500, margin: "0 0 1rem" }}>
          Sign in
        </h1>
        <p style={{ fontSize: "12px", color: "var(--ink-text-3)", marginBottom: "1rem", lineHeight: 1.5 }}>
          Enter the same value as{" "}
          <code style={{ fontSize: "11px" }}>DASHBOARD_API_SECRET</code> or{" "}
          <code style={{ fontSize: "11px" }}>ORCHESTRATION_ENQUEUE_SECRET</code>{" "}
          on the server. CI and Netlify functions can use{" "}
          <code style={{ fontSize: "11px" }}>Authorization: Bearer …</code>{" "}
          instead.
        </p>
        <label
          htmlFor="dashboard-secret"
          style={{
            display:       "block",
            fontSize:      "9px",
            fontFamily:    "var(--font-mono)",
            color:         "var(--ink-text-4)",
            marginBottom:  "0.35rem",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          API secret
        </label>
        <input
          id="dashboard-secret"
          type="password"
          autoComplete="current-password"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          style={{
            width:          "100%",
            fontSize:       "13px",
            fontFamily:     "var(--font-mono)",
            padding:        "0.5rem 0.65rem",
            marginBottom:   "1rem",
            boxSizing:      "border-box",
          }}
        />
        {error ? (
          <p style={{ color: "var(--ink-red)", fontSize: "12px", marginBottom: "0.75rem" }}>{error}</p>
        ) : null}
        <button
          type="submit"
          disabled={submitting}
          style={{ fontSize: "12px", fontFamily: "var(--font-mono)", padding: "0.5rem 1rem" }}
        >
          {submitting ? "…" : "Unlock"}
        </button>
      </form>
    </div>
  );
}
