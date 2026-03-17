"use client";

import { useState, useRef } from "react";
import type { Project } from "@/lib/types";

interface ImportModalProps {
  onImport: (project: Project) => void;
  onClose: () => void;
}

export function ImportModal({ onImport, onClose }: ImportModalProps) {
  const [name, setName] = useState("");
  const [jsonText, setJsonText] = useState("");
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const n = file.name
      .replace("open_findings", "")
      .replace(".json", "")
      .replace(/^[-_]/, "");
    if (!name && n) setName(n);
    const reader = new FileReader();
    reader.onload = (ev) => setJsonText(String(ev.target?.result ?? ""));
    reader.readAsText(file);
  }

  async function handleSubmit() {
    if (!name.trim()) {
      setError("Project name required");
      return;
    }
    try {
      const data = JSON.parse(jsonText);
      const findings = data.open_findings ?? data.findings ?? [];
      if (!Array.isArray(findings)) {
        setError("No findings array found");
        return;
      }
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          json: jsonText,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setError(err.error ?? res.statusText);
        return;
      }
      const { project } = await res.json();
      onImport(project);
      onClose();
    } catch (e) {
      setError(
        e instanceof Error ? `Invalid JSON: ${e.message}` : "Invalid JSON"
      );
    }
  }

  return (
    <div
      style={{
        background: "var(--color-background-primary)",
        border: "0.5px solid var(--color-border-tertiary)",
        borderRadius: "var(--border-radius-lg)",
        padding: "1.25rem",
        marginBottom: "1rem",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <span style={{ fontWeight: 500, fontSize: "14px" }}>
          Import project
        </span>
        <button
          type="button"
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--color-text-tertiary)",
          }}
        >
          ×
        </button>
      </div>
      <div style={{ marginBottom: 12 }}>
        <label
          style={{
            fontSize: "12px",
            color: "var(--color-text-secondary)",
            display: "block",
            marginBottom: 4,
          }}
        >
          Project name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. relevnt"
          style={{ width: "100%", fontSize: "13px" }}
        />
      </div>
      <div style={{ marginBottom: 12 }}>
        <label
          style={{
            fontSize: "12px",
            color: "var(--color-text-secondary)",
            display: "block",
            marginBottom: 4,
          }}
        >
          Upload open_findings.json
        </label>
        <input
          ref={fileRef}
          type="file"
          accept=".json"
          onChange={handleFile}
          style={{ fontSize: "12px" }}
        />
      </div>
      <div style={{ marginBottom: 12 }}>
        <label
          style={{
            fontSize: "12px",
            color: "var(--color-text-secondary)",
            display: "block",
            marginBottom: 4,
          }}
        >
          Or paste JSON
        </label>
        <textarea
          value={jsonText}
          onChange={(e) => setJsonText(e.target.value)}
          rows={4}
          placeholder='{"open_findings": [...]}'
          style={{
            width: "100%",
            fontSize: "12px",
            fontFamily: "var(--font-mono)",
          }}
        />
      </div>
      {error && (
        <div
          style={{
            fontSize: "12px",
            color: "var(--color-text-danger)",
            marginBottom: 8,
          }}
        >
          {error}
        </div>
      )}
      <button
        type="button"
        onClick={handleSubmit}
        style={{ fontSize: "13px", padding: "6px 16px" }}
      >
        Import
      </button>
    </div>
  );
}
