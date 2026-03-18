"use client";

import { useState, useRef } from "react";
import type { Project } from "@/lib/types";

interface ImportModalProps {
  onImport: (project: Project) => void;
  onClose:  () => void;
}

export function ImportModal({ onImport, onClose }: ImportModalProps) {
  const [name,     setName]     = useState("");
  const [jsonText, setJsonText] = useState("");
  const [error,    setError]    = useState("");
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function loadFile(file: File) {
    const n = file.name.replace("open_findings", "").replace(".json", "").replace(/^[-_]/, "");
    if (!name && n) setName(n);
    const reader = new FileReader();
    reader.onload = (ev) => setJsonText((ev.target?.result as string) ?? "");
    reader.readAsText(file);
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) loadFile(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.name.endsWith(".json")) loadFile(file);
  }

  function handleSubmit() {
    if (!name.trim()) { setError("Project name required"); return; }
    try {
      const data     = JSON.parse(jsonText);
      const findings = data.open_findings ?? data.findings ?? [];
      if (!Array.isArray(findings)) { setError("No findings array found"); return; }
      onImport({ name: name.trim(), findings });
    } catch (e: unknown) {
      setError("Invalid JSON: " + (e as Error).message);
    }
  }

  return (
    <div
      style={{
        background:   "var(--ink-bg-raised)",
        border:       "0.5px solid var(--ink-border)",
        borderRadius: "var(--radius-lg)",
        padding:      "1.5rem 1.75rem",
        marginBottom: "1.5rem",
      }}
      className="animate-fade-in"
    >
      {/* Header */}
      <div
        style={{
          display:        "flex",
          justifyContent: "space-between",
          alignItems:     "center",
          marginBottom:   "1.25rem",
        }}
      >
        <span style={{ fontSize: "13px", fontWeight: 500, color: "var(--ink-text)" }}>
          Import project
        </span>
        <button
          type="button"
          onClick={onClose}
          style={{ border: "none", background: "transparent", padding: "0 4px", fontSize: "16px", color: "var(--ink-text-4)" }}
          aria-label="Close"
        >
          ×
        </button>
      </div>

      {/* Name */}
      <div style={{ marginBottom: "1rem" }}>
        <label
          style={{
            display:      "block",
            fontSize:     "9px",
            fontFamily:   "var(--font-mono)",
            fontWeight:   500,
            color:        "var(--ink-text-4)",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            marginBottom: "0.375rem",
          }}
        >
          Project name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. relevnt"
        />
      </div>

      {/* Drop zone */}
      <div style={{ marginBottom: "1rem" }}>
        <label
          style={{
            display:      "block",
            fontSize:     "9px",
            fontFamily:   "var(--font-mono)",
            fontWeight:   500,
            color:        "var(--ink-text-4)",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            marginBottom: "0.375rem",
          }}
        >
          open_findings.json
        </label>
        <div
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          style={{
            border:       `0.5px dashed ${dragging ? "var(--ink-border)" : "var(--ink-border-faint)"}`,
            borderRadius: "var(--radius-md)",
            padding:      "1.25rem",
            textAlign:    "center",
            cursor:       "pointer",
            background:   dragging ? "var(--ink-bg-sunken)" : "transparent",
            transition:   "background 0.12s ease, border-color 0.12s ease",
          }}
        >
          <span style={{ fontSize: "11px", color: "var(--ink-text-4)", fontFamily: "var(--font-mono)" }}>
            {jsonText ? "file loaded — click to replace" : "drop file or click to browse"}
          </span>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".json"
          onChange={handleFile}
          style={{ display: "none" }}
        />
      </div>

      {/* Paste fallback */}
      <div style={{ marginBottom: "1rem" }}>
        <label
          style={{
            display:      "block",
            fontSize:     "9px",
            fontFamily:   "var(--font-mono)",
            fontWeight:   500,
            color:        "var(--ink-text-4)",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            marginBottom: "0.375rem",
          }}
        >
          Or paste JSON
        </label>
        <textarea
          value={jsonText}
          onChange={(e) => setJsonText(e.target.value)}
          rows={4}
          placeholder='{"open_findings": [...]}'
          style={{ fontFamily: "var(--font-mono)", fontSize: "11px" }}
        />
      </div>

      {error && (
        <div style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--ink-red)", marginBottom: "0.75rem" }}>
          {error}
        </div>
      )}

      <button type="button" onClick={handleSubmit} style={{ padding: "5px 16px" }}>
        Import
      </button>
    </div>
  );
}
