import { useState, useEffect, useCallback, useRef } from "react";

const SEVERITY_ORDER = { blocker: 0, major: 1, minor: 2, nit: 3 };
const PRIORITY_ORDER = { P0: 0, P1: 1, P2: 2, P3: 3 };
const SEVERITY_COLORS = {
  blocker: { bg: "rgba(226,75,74,0.12)", text: "#A32D2D", border: "#E24B4A" },
  major: { bg: "rgba(239,159,39,0.12)", text: "#854F0B", border: "#EF9F27" },
  minor: { bg: "rgba(56,138,221,0.12)", text: "#185FA5", border: "#378ADD" },
  nit: { bg: "rgba(136,135,128,0.10)", text: "#5F5E5A", border: "#B4B2A9" },
};
const STATUS_GROUPS = {
  active: ["open", "accepted", "in_progress"],
  pending: ["fixed_pending_verify"],
  resolved: ["fixed_verified", "wont_fix", "deferred", "duplicate", "converted_to_enhancement"],
};
const TYPE_ICONS = { bug: "\u2022", enhancement: "\u25B2", debt: "\u25C6", question: "?" };

function sortFindings(findings) {
  return [...findings].sort((a, b) => {
    const pa = PRIORITY_ORDER[a.priority] ?? 9;
    const pb = PRIORITY_ORDER[b.priority] ?? 9;
    if (pa !== pb) return pa - pb;
    const sa = SEVERITY_ORDER[a.severity] ?? 9;
    const sb = SEVERITY_ORDER[b.severity] ?? 9;
    return sa - sb;
  });
}

function Badge({ children, color = "gray", small = false }) {
  const colors = SEVERITY_COLORS[color] || { bg: "var(--color-background-secondary)", text: "var(--color-text-secondary)", border: "var(--color-border-tertiary)" };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", padding: small ? "1px 6px" : "2px 8px", borderRadius: "var(--border-radius-md)", background: colors.bg, color: colors.text, fontSize: small ? "11px" : "12px", fontWeight: 500, border: `0.5px solid ${colors.border}`, whiteSpace: "nowrap" }}>
      {children}
    </span>
  );
}

function MetricCard({ label, value, sub, accent }) {
  return (
    <div style={{ background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", padding: "12px 16px", minWidth: 0 }}>
      <div style={{ fontSize: "12px", color: "var(--color-text-tertiary)", marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: "22px", fontWeight: 500, color: accent || "var(--color-text-primary)" }}>{value}</div>
      {sub && <div style={{ fontSize: "11px", color: "var(--color-text-tertiary)", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function ProgressBar({ value, max, color = "#378ADD" }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ flex: 1, height: 6, background: "var(--color-background-secondary)", borderRadius: 3, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 3, transition: "width 0.3s ease" }} />
      </div>
      <span style={{ fontSize: "12px", color: "var(--color-text-secondary)", minWidth: 32, textAlign: "right" }}>{pct}%</span>
    </div>
  );
}

function EmptyState({ icon, title, action }) {
  return (
    <div style={{ textAlign: "center", padding: "3rem 1rem", color: "var(--color-text-tertiary)" }}>
      <div style={{ fontSize: "32px", marginBottom: 8, opacity: 0.4 }}>{icon}</div>
      <div style={{ fontSize: "14px", marginBottom: 12 }}>{title}</div>
      {action}
    </div>
  );
}

function FindingRow({ finding, onClick }) {
  const sc = SEVERITY_COLORS[finding.severity] || SEVERITY_COLORS.nit;
  const isActive = STATUS_GROUPS.active.includes(finding.status);
  return (
    <div onClick={onClick} style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "10px 12px", borderRadius: "var(--border-radius-md)", cursor: "pointer", borderLeft: `3px solid ${sc.border}`, background: isActive ? "transparent" : "var(--color-background-secondary)", opacity: isActive ? 1 : 0.6, transition: "background 0.15s" }} onMouseEnter={e => e.currentTarget.style.background = "var(--color-background-secondary)"} onMouseLeave={e => e.currentTarget.style.background = isActive ? "transparent" : "var(--color-background-secondary)"}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, flexWrap: "wrap" }}>
          <Badge color={finding.severity} small>{finding.severity}</Badge>
          <Badge small>{finding.priority}</Badge>
          <span style={{ fontSize: "11px", color: "var(--color-text-tertiary)", fontFamily: "var(--font-mono)" }}>{finding.finding_id}</span>
        </div>
        <div style={{ fontSize: "13px", fontWeight: 500, color: "var(--color-text-primary)", lineHeight: 1.4 }}>{finding.title}</div>
        <div style={{ display: "flex", gap: 8, marginTop: 4, fontSize: "11px", color: "var(--color-text-tertiary)" }}>
          <span>{TYPE_ICONS[finding.type] || ""} {finding.type}</span>
          <span>{finding.confidence}</span>
          <span>{finding.status}</span>
          {finding.suggested_fix?.estimated_effort && <span>{finding.suggested_fix.estimated_effort}</span>}
        </div>
      </div>
    </div>
  );
}

function FindingDetail({ finding, onClose, onAction }) {
  if (!finding) return null;
  const fix = typeof finding.suggested_fix === "object" ? finding.suggested_fix : {};
  return (
    <div style={{ position: "relative", background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", padding: "1.25rem", marginBottom: "1rem" }}>
      <button onClick={onClose} style={{ position: "absolute", top: 12, right: 12, background: "none", border: "none", cursor: "pointer", fontSize: "16px", color: "var(--color-text-tertiary)" }}>x</button>
      <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
        <Badge color={finding.severity}>{finding.severity}</Badge>
        <Badge>{finding.priority}</Badge>
        <Badge>{finding.type}</Badge>
        <Badge>{finding.status}</Badge>
        <Badge>{finding.confidence}</Badge>
      </div>
      <h3 style={{ fontSize: "16px", fontWeight: 500, margin: "8px 0", color: "var(--color-text-primary)" }}>{finding.title}</h3>
      <p style={{ fontSize: "13px", color: "var(--color-text-secondary)", lineHeight: 1.6, margin: "0 0 12px" }}>{finding.description}</p>

      {finding.proof_hooks?.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: "12px", fontWeight: 500, color: "var(--color-text-secondary)", marginBottom: 4 }}>Proof hooks</div>
          {finding.proof_hooks.map((h, i) => (
            <div key={i} style={{ fontSize: "12px", padding: "4px 8px", background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", marginBottom: 4, fontFamily: "var(--font-mono)" }}>
              <span style={{ color: "var(--color-text-info)" }}>[{h.hook_type || h.type}]</span>{" "}
              <span style={{ color: "var(--color-text-primary)" }}>{h.summary || h.value}</span>
              {h.file && <span style={{ color: "var(--color-text-tertiary)" }}> {h.file}{h.start_line ? `:${h.start_line}` : ""}</span>}
            </div>
          ))}
        </div>
      )}

      {fix.approach && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: "12px", fontWeight: 500, color: "var(--color-text-secondary)", marginBottom: 4 }}>Suggested fix</div>
          <p style={{ fontSize: "13px", color: "var(--color-text-primary)", lineHeight: 1.5, margin: 0 }}>{fix.approach}</p>
          {fix.affected_files?.length > 0 && (
            <div style={{ marginTop: 4, fontSize: "12px", color: "var(--color-text-tertiary)", fontFamily: "var(--font-mono)" }}>
              {fix.affected_files.join(", ")}
            </div>
          )}
          {fix.estimated_effort && <div style={{ marginTop: 4, fontSize: "12px", color: "var(--color-text-secondary)" }}>Effort: {fix.estimated_effort}</div>}
        </div>
      )}

      {finding.history?.length > 0 && (
        <div>
          <div style={{ fontSize: "12px", fontWeight: 500, color: "var(--color-text-secondary)", marginBottom: 4 }}>Timeline ({finding.history.length} events)</div>
          {finding.history.slice(-5).map((ev, i) => (
            <div key={i} style={{ fontSize: "11px", color: "var(--color-text-tertiary)", padding: "2px 0" }}>
              {ev.timestamp?.slice(0, 10)} {ev.actor} - {ev.event}{ev.notes ? `: ${ev.notes.slice(0, 80)}` : ""}
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
        {STATUS_GROUPS.active.includes(finding.status) && (
          <>
            <button onClick={() => onAction(finding.finding_id, "in_progress")} style={{ fontSize: "12px", padding: "4px 12px" }}>Start fix</button>
            <button onClick={() => onAction(finding.finding_id, "deferred")} style={{ fontSize: "12px", padding: "4px 12px" }}>Defer</button>
          </>
        )}
        {finding.status === "in_progress" && (
          <button onClick={() => onAction(finding.finding_id, "fixed_pending_verify")} style={{ fontSize: "12px", padding: "4px 12px" }}>Mark done</button>
        )}
        {finding.status === "fixed_pending_verify" && (
          <button onClick={() => onAction(finding.finding_id, "fixed_verified")} style={{ fontSize: "12px", padding: "4px 12px" }}>Verify fix</button>
        )}
      </div>
    </div>
  );
}

function ProjectView({ project, onBack }) {
  const [filter, setFilter] = useState("active");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState(null);
  const [findings, setFindings] = useState(project.findings || []);

  const filtered = sortFindings(findings.filter(f => {
    const statusMatch = filter === "all" || (STATUS_GROUPS[filter] || []).includes(f.status);
    const searchMatch = !search || f.title?.toLowerCase().includes(search.toLowerCase()) || f.finding_id?.toLowerCase().includes(search.toLowerCase()) || f.category?.toLowerCase().includes(search.toLowerCase());
    return statusMatch && searchMatch;
  }));

  const counts = {
    active: findings.filter(f => STATUS_GROUPS.active.includes(f.status)).length,
    pending: findings.filter(f => STATUS_GROUPS.pending.includes(f.status)).length,
    resolved: findings.filter(f => STATUS_GROUPS.resolved.includes(f.status)).length,
  };
  const blockers = findings.filter(f => f.severity === "blocker" && STATUS_GROUPS.active.includes(f.status)).length;
  const questions = findings.filter(f => f.type === "question" && STATUS_GROUPS.active.includes(f.status)).length;
  const resolved = counts.resolved;
  const total = findings.length;
  const canShip = blockers === 0 && questions === 0 && counts.pending === 0;

  function handleAction(findingId, newStatus) {
    setFindings(prev => prev.map(f => {
      if (f.finding_id === findingId) {
        const updated = { ...f, status: newStatus, history: [...(f.history || []), { timestamp: new Date().toISOString(), actor: "solo-dev", event: newStatus === "deferred" ? "deferred" : newStatus === "in_progress" ? "patch_proposed" : newStatus === "fixed_pending_verify" ? "patch_applied" : "verification_passed", notes: `Status changed to ${newStatus} via dashboard` }] };
        return updated;
      }
      return f;
    }));
    if (selected?.finding_id === findingId) setSelected(prev => ({ ...prev, status: newStatus }));
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: "1rem" }}>
        <button onClick={onBack} style={{ fontSize: "13px", padding: "4px 12px" }}>&larr; Portfolio</button>
        <h2 style={{ fontSize: "18px", fontWeight: 500, margin: 0, color: "var(--color-text-primary)" }}>{project.name}</h2>
        {canShip && <Badge color="nit">Ready to ship</Badge>}
        {!canShip && blockers > 0 && <Badge color="blocker">{blockers} blocker{blockers > 1 ? "s" : ""}</Badge>}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: 8, marginBottom: "1rem" }}>
        <MetricCard label="Total" value={total} />
        <MetricCard label="Active" value={counts.active} accent={counts.active > 0 ? "#EF9F27" : undefined} />
        <MetricCard label="Pending verify" value={counts.pending} />
        <MetricCard label="Resolved" value={resolved} accent={resolved > 0 ? "#1D9E75" : undefined} />
        <MetricCard label="Blockers" value={blockers} accent={blockers > 0 ? "#E24B4A" : undefined} />
        <MetricCard label="Questions" value={questions} accent={questions > 0 ? "#378ADD" : undefined} />
      </div>

      <ProgressBar value={resolved} max={total} color="#1D9E75" />
      <div style={{ fontSize: "11px", color: "var(--color-text-tertiary)", marginTop: 4, marginBottom: "1rem" }}>
        {resolved} of {total} findings resolved
      </div>

      {selected && <FindingDetail finding={findings.find(f => f.finding_id === selected.finding_id) || selected} onClose={() => setSelected(null)} onAction={handleAction} />}

      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap", alignItems: "center" }}>
        {["active", "pending", "resolved", "all"].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ fontSize: "12px", padding: "3px 10px", background: filter === f ? "var(--color-background-secondary)" : "transparent", fontWeight: filter === f ? 500 : 400 }}>{f} {f !== "all" && `(${counts[f] || 0})`}</button>
        ))}
        <input type="text" placeholder="Search findings..." value={search} onChange={e => setSearch(e.target.value)} style={{ marginLeft: "auto", fontSize: "12px", width: 180 }} />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {filtered.length === 0 && <EmptyState icon="\u2713" title={filter === "active" ? "No active findings" : "No findings match"} />}
        {filtered.map(f => <FindingRow key={f.finding_id} finding={f} onClick={() => setSelected(f)} />)}
      </div>
    </div>
  );
}

function ProjectCard({ project, onClick }) {
  const findings = project.findings || [];
  const active = findings.filter(f => STATUS_GROUPS.active.includes(f.status));
  const blockers = active.filter(f => f.severity === "blocker").length;
  const resolved = findings.filter(f => STATUS_GROUPS.resolved.includes(f.status)).length;
  const canShip = blockers === 0 && active.filter(f => f.type === "question").length === 0 && findings.filter(f => f.status === "fixed_pending_verify").length === 0;

  return (
    <div onClick={onClick} style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", padding: "1rem 1.25rem", cursor: "pointer", transition: "border-color 0.15s" }} onMouseEnter={e => e.currentTarget.style.borderColor = "var(--color-border-secondary)"} onMouseLeave={e => e.currentTarget.style.borderColor = "var(--color-border-tertiary)"}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <span style={{ fontWeight: 500, fontSize: "14px", color: "var(--color-text-primary)" }}>{project.name}</span>
        {canShip && findings.length > 0 && <Badge color="nit">Ship</Badge>}
        {blockers > 0 && <Badge color="blocker">{blockers}</Badge>}
        {findings.length === 0 && <span style={{ fontSize: "11px", color: "var(--color-text-tertiary)" }}>No data</span>}
      </div>
      {findings.length > 0 && (
        <>
          <ProgressBar value={resolved} max={findings.length} color="#1D9E75" />
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: "11px", color: "var(--color-text-tertiary)" }}>
            <span>{active.length} active</span>
            <span>{resolved}/{findings.length} resolved</span>
          </div>
        </>
      )}
    </div>
  );
}

function ImportModal({ onImport, onClose }) {
  const [name, setName] = useState("");
  const [jsonText, setJsonText] = useState("");
  const [error, setError] = useState("");
  const fileRef = useRef(null);

  function handleFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const n = file.name.replace("open_findings", "").replace(".json", "").replace(/^[-_]/, "");
    if (!name && n) setName(n);
    const reader = new FileReader();
    reader.onload = (ev) => setJsonText(ev.target?.result || "");
    reader.readAsText(file);
  }

  function handleSubmit() {
    if (!name.trim()) { setError("Project name required"); return; }
    try {
      const data = JSON.parse(jsonText);
      const findings = data.open_findings || data.findings || [];
      if (!Array.isArray(findings)) { setError("No findings array found"); return; }
      onImport({ name: name.trim(), findings });
    } catch (e) { setError("Invalid JSON: " + e.message); }
  }

  return (
    <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", padding: "1.25rem", marginBottom: "1rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <span style={{ fontWeight: 500, fontSize: "14px" }}>Import project</span>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-tertiary)" }}>x</button>
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: "12px", color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>Project name</label>
        <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. relevnt" style={{ width: "100%", fontSize: "13px" }} />
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: "12px", color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>Upload open_findings.json</label>
        <input ref={fileRef} type="file" accept=".json" onChange={handleFile} style={{ fontSize: "12px" }} />
      </div>
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontSize: "12px", color: "var(--color-text-secondary)", display: "block", marginBottom: 4 }}>Or paste JSON</label>
        <textarea value={jsonText} onChange={e => setJsonText(e.target.value)} rows={4} placeholder='{"open_findings": [...]}' style={{ width: "100%", fontSize: "12px", fontFamily: "var(--font-mono)" }} />
      </div>
      {error && <div style={{ fontSize: "12px", color: "var(--color-text-danger)", marginBottom: 8 }}>{error}</div>}
      <button onClick={handleSubmit} style={{ fontSize: "13px", padding: "6px 16px" }}>Import</button>
    </div>
  );
}

export default function LYRADashboard() {
  const [projects, setProjects] = useState([]);
  const [activeProject, setActiveProject] = useState(null);
  const [showImport, setShowImport] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const result = await window.storage.get("lyra-projects");
        if (result?.value) {
          setProjects(JSON.parse(result.value));
        }
      } catch (e) {}
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (!loaded) return;
    (async () => {
      try {
        await window.storage.set("lyra-projects", JSON.stringify(projects));
      } catch (e) {}
    })();
  }, [projects, loaded]);

  function handleImport(proj) {
    setProjects(prev => {
      const idx = prev.findIndex(p => p.name === proj.name);
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], findings: proj.findings, lastUpdated: new Date().toISOString() };
        return updated;
      }
      return [...prev, { ...proj, lastUpdated: new Date().toISOString() }];
    });
    setShowImport(false);
  }

  function handleRemove(name) {
    setProjects(prev => prev.filter(p => p.name !== name));
  }

  function handleExport(project) {
    const data = JSON.stringify({ schema_version: "1.1.0", open_findings: project.findings }, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${project.name}-open_findings.json`; a.click();
    URL.revokeObjectURL(url);
  }

  if (activeProject) {
    const proj = projects.find(p => p.name === activeProject);
    if (proj) return <ProjectView project={proj} onBack={() => setActiveProject(null)} />;
  }

  const totalFindings = projects.reduce((s, p) => s + (p.findings?.length || 0), 0);
  const totalBlockers = projects.reduce((s, p) => s + (p.findings || []).filter(f => f.severity === "blocker" && STATUS_GROUPS.active.includes(f.status)).length, 0);
  const totalActive = projects.reduce((s, p) => s + (p.findings || []).filter(f => STATUS_GROUPS.active.includes(f.status)).length, 0);
  const totalResolved = projects.reduce((s, p) => s + (p.findings || []).filter(f => STATUS_GROUPS.resolved.includes(f.status)).length, 0);
  const shippable = projects.filter(p => {
    const f = p.findings || [];
    const b = f.filter(x => x.severity === "blocker" && STATUS_GROUPS.active.includes(x.status)).length;
    const q = f.filter(x => x.type === "question" && STATUS_GROUPS.active.includes(x.status)).length;
    return f.length > 0 && b === 0 && q === 0;
  }).length;

  let nextAction = null;
  for (const p of projects) {
    const sorted = sortFindings((p.findings || []).filter(f => STATUS_GROUPS.active.includes(f.status)));
    if (sorted.length > 0 && (!nextAction || (PRIORITY_ORDER[sorted[0].priority] ?? 9) < (PRIORITY_ORDER[nextAction.priority] ?? 9) || ((PRIORITY_ORDER[sorted[0].priority] ?? 9) === (PRIORITY_ORDER[nextAction.priority] ?? 9) && (SEVERITY_ORDER[sorted[0].severity] ?? 9) < (SEVERITY_ORDER[nextAction.severity] ?? 9)))) {
      nextAction = { ...sorted[0], _project: p.name };
    }
  }

  return (
    <div style={{ padding: "1rem 0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "1rem" }}>
        <h2 style={{ fontSize: "18px", fontWeight: 500, margin: 0, color: "var(--color-text-primary)" }}>LYRA</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setShowImport(true)} style={{ fontSize: "12px", padding: "4px 12px" }}>Import project</button>
        </div>
      </div>

      {showImport && <ImportModal onImport={handleImport} onClose={() => setShowImport(false)} />}

      {projects.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 8, marginBottom: "1.5rem" }}>
          <MetricCard label="Projects" value={projects.length} sub={`${shippable} shippable`} />
          <MetricCard label="Total findings" value={totalFindings} />
          <MetricCard label="Active" value={totalActive} accent={totalActive > 0 ? "#EF9F27" : undefined} />
          <MetricCard label="Resolved" value={totalResolved} accent={totalResolved > 0 ? "#1D9E75" : undefined} />
          <MetricCard label="Blockers" value={totalBlockers} accent={totalBlockers > 0 ? "#E24B4A" : undefined} />
        </div>
      )}

      {nextAction && (
        <div style={{ background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-lg)", padding: "12px 16px", marginBottom: "1.5rem" }}>
          <div style={{ fontSize: "12px", color: "var(--color-text-tertiary)", marginBottom: 6 }}>Next action</div>
          <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 4, flexWrap: "wrap" }}>
            <span style={{ fontSize: "12px", fontWeight: 500, color: "var(--color-text-info)" }}>{nextAction._project}</span>
            <Badge color={nextAction.severity} small>{nextAction.severity}</Badge>
            <Badge small>{nextAction.priority}</Badge>
          </div>
          <div style={{ fontSize: "13px", fontWeight: 500, color: "var(--color-text-primary)" }}>{nextAction.title}</div>
          <div style={{ fontSize: "11px", color: "var(--color-text-tertiary)", marginTop: 4, fontFamily: "var(--font-mono)" }}>{nextAction.finding_id}</div>
        </div>
      )}

      {projects.length === 0 && !showImport && (
        <EmptyState icon="\u25C8" title="No projects yet. Import an open_findings.json to get started." action={<button onClick={() => setShowImport(true)} style={{ fontSize: "13px", padding: "6px 16px" }}>Import project</button>} />
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
        {projects.map(p => (
          <div key={p.name} style={{ position: "relative" }}>
            <ProjectCard project={p} onClick={() => setActiveProject(p.name)} />
            <div style={{ position: "absolute", top: 8, right: 8, display: "flex", gap: 4, opacity: 0.5 }}>
              <button onClick={e => { e.stopPropagation(); handleExport(p); }} title="Export" style={{ fontSize: "10px", padding: "2px 6px", background: "transparent", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", cursor: "pointer", color: "var(--color-text-tertiary)" }}>&darr;</button>
              <button onClick={e => { e.stopPropagation(); if (confirm(`Remove ${p.name}?`)) handleRemove(p.name); }} title="Remove" style={{ fontSize: "10px", padding: "2px 6px", background: "transparent", border: "0.5px solid var(--color-border-tertiary)", borderRadius: "var(--border-radius-md)", cursor: "pointer", color: "var(--color-text-tertiary)" }}>x</button>
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: "2rem", fontSize: "11px", color: "var(--color-text-tertiary)", borderTop: "0.5px solid var(--color-border-tertiary)", paddingTop: "1rem" }}>
        LYRA v1.1 -- Import each project's <span style={{ fontFamily: "var(--font-mono)" }}>open_findings.json</span> to manage your portfolio. Data persists across sessions.
      </div>
    </div>
  );
}
