"use client";

import { useState, useRef } from "react";
import type { Project } from "@/lib/types";

interface ImportModalProps {
  onImport: (project: Project) => Promise<void>;
  onOnboardRepository: (input: {
    name?: string;
    repository_url?: string;
    local_path?: string;
    default_branch?: string;
  }) => Promise<void>;
  onClose:  () => void;
}

export function ImportModal({ onImport, onOnboardRepository, onClose }: ImportModalProps) {
  const [name,      setName]      = useState("");
  const [repoUrl,   setRepoUrl]   = useState("");
  const [localPath, setLocalPath] = useState("");
  const [defaultBranch, setDefaultBranch] = useState("");
  const [jsonText,  setJsonText]  = useState("");
  const [error,     setError]     = useState("");
  const [dragging,  setDragging]  = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Warn on close if there is unsaved input
  const isDirty =
    name.trim().length > 0 ||
    repoUrl.trim().length > 0 ||
    localPath.trim().length > 0 ||
    defaultBranch.trim().length > 0 ||
    jsonText.trim().length > 0;

  const handleClose = () => {
    if (isDirty && !submitting) {
      if (!confirm("Discard unsaved form input?")) {
        return;
      }
    }
    onClose();
  };

  function deriveNameFromRepoUrl(value: string): string {
    try {
      const url = new URL(value);
      const parts = url.pathname.split("/").filter(Boolean);
      return (parts[parts.length - 1] || "").replace(/\.git$/, "");
    } catch {
      const parts = value.split("/").filter(Boolean);
      return (parts[parts.length - 1] || value.trim()).replace(/\.git$/, "");
    }
  }

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

  async function handleSubmit() {
    const trimmedName = name.trim();
    const trimmedRepo = repoUrl.trim();
    const trimmedPath = localPath.trim();
    const trimmedJson = jsonText.trim();
    const projectName = trimmedName || (trimmedRepo ? deriveNameFromRepoUrl(trimmedRepo) : "");

    // Require either: (repo or local path) OR (json findings)
    if (!trimmedRepo && !trimmedPath && !trimmedJson) {
      setError("Provide a repository URL, local path, or JSON findings");
      return;
    }

    // If onboarding from repo/path, must have at least one
    if ((trimmedRepo || trimmedPath) && !projectName) {
      setError("Project name is required or will be derived from repository URL");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      if (trimmedRepo || trimmedPath) {
        await onOnboardRepository({
          name: projectName || undefined,
          repository_url: trimmedRepo || undefined,
          local_path: trimmedPath || undefined,
          default_branch: defaultBranch.trim() || undefined,
        });
        return;
      }
      // Legacy JSON import path
      const data = JSON.parse(trimmedJson);
      const findings = data.open_findings ?? data.findings ?? [];
      if (!Array.isArray(findings)) { setError("No findings array found"); setSubmitting(false); return; }
      await onImport({
        name: projectName,
        findings,
        repositoryUrl: trimmedRepo || undefined,
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
      setSubmitting(false);
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
          Onboard project
        </span>
        <button
          type="button"
          onClick={handleClose}
          style={{ border: "none", background: "transparent", padding: "0 4px", fontSize: "16px", color: "var(--ink-text-4)" }}
          aria-label="Close"
        >
          ×
        </button>
      </div>

      {/* Section 1: Project Identity (Required) */}
      <div style={{ marginBottom: "1.5rem", paddingBottom: "1rem", borderBottom: "0.5px solid var(--ink-border-faint)" }}>
        <div
          style={{
            fontSize: "9px",
            fontFamily: "var(--font-mono)",
            fontWeight: 500,
            color: "var(--ink-text)",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            marginBottom: "0.75rem",
          }}
        >
          ① Project identity <span style={{ color: "var(--ink-red)" }}>required</span>
        </div>

        <div style={{ marginBottom: "0.75rem" }}>
          <label
            style={{
              display: "block",
              fontSize: "9px",
              fontFamily: "var(--font-mono)",
              fontWeight: 500,
              color: "var(--ink-text-4)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginBottom: "0.375rem",
            }}
          >
            Repository URL or local path
          </label>
          <div style={{ fontSize: "10px", color: "var(--ink-text-4)", marginBottom: "0.5rem" }}>
            Provide a repository URL or local path to generate draft onboarding artifacts. Repository URL auto-derives the project name if blank. Project name is optional.
          </div>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Project name (e.g. relevnt)"
            style={{ marginBottom: "0.5rem" }}
          />
          <input
            type="text"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            placeholder="Repository URL (https://github.com/owner/repo)"
            style={{ marginBottom: "0.5rem" }}
          />
          <input
            type="text"
            value={localPath}
            onChange={(e) => setLocalPath(e.target.value)}
            placeholder="Local path (/Users/you/project)"
            style={{ marginBottom: "0.5rem" }}
          />
          <input
            type="text"
            value={defaultBranch}
            onChange={(e) => setDefaultBranch(e.target.value)}
            placeholder="Default branch (optional)"
          />
        </div>
      </div>

      {/* Section 2: Audit Findings (Optional) */}
      <div style={{ marginBottom: "1.5rem" }}>
        <div
          style={{
            fontSize: "9px",
            fontFamily: "var(--font-mono)",
            fontWeight: 500,
            color: "var(--ink-text)",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            marginBottom: "0.75rem",
          }}
        >
          ② Audit findings <span style={{ color: "var(--ink-text-4)" }}>optional</span>
        </div>

        <div style={{ fontSize: "10px", color: "var(--ink-text-4)", marginBottom: "0.75rem" }}>
          Legacy mode only. If you provide a repository URL or local path above, Lyra will generate draft onboarding artifacts instead of importing findings JSON.
        </div>

        {/* File upload */}
        <div style={{ marginBottom: "1rem" }}>
          <label
            style={{
              display: "block",
              fontSize: "9px",
              fontFamily: "var(--font-mono)",
              fontWeight: 500,
              color: "var(--ink-text-4)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginBottom: "0.375rem",
            }}
          >
            Load from file
          </label>
          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            style={{
              border: `0.5px dashed ${dragging ? "var(--ink-border)" : "var(--ink-border-faint)"}`,
              borderRadius: "var(--radius-md)",
              padding: "1.25rem",
              textAlign: "center",
              cursor: "pointer",
              background: dragging ? "var(--ink-bg-sunken)" : "transparent",
              transition: "background 0.12s ease, border-color 0.12s ease",
            }}
          >
            <span style={{ fontSize: "11px", color: "var(--ink-text-4)", fontFamily: "var(--font-mono)" }}>
              {jsonText ? "✓ file loaded" : "drag & drop open_findings.json or click to browse"}
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

        {/* Paste alternative */}
        <div>
          <label
            style={{
              display: "block",
              fontSize: "9px",
              fontFamily: "var(--font-mono)",
              fontWeight: 500,
              color: "var(--ink-text-4)",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginBottom: "0.375rem",
            }}
          >
            Or paste JSON directly
          </label>
          <textarea
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            rows={4}
            placeholder='{"open_findings": [...]}'
            style={{ fontFamily: "var(--font-mono)", fontSize: "11px" }}
          />
        </div>
      </div>

      {error && (
        <div style={{ fontSize: "11px", fontFamily: "var(--font-mono)", color: "var(--ink-red)", marginBottom: "0.75rem" }}>
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={submitting}
        style={{ padding: "5px 16px" }}
      >
        {submitting ? "onboarding…" : "Start onboarding"}
      </button>
    </div>
  );
}
