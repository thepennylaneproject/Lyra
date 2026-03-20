export interface FindingOut {
  finding_id: string;
  title: string;
  description?: string;
  type: string;
  severity: string;
  priority: string;
  status: string;
  category?: string;
  proof_hooks?: Array<{
    file?: string;
    start_line?: number;
    summary?: string;
  }>;
  duplicate_of?: string;
}

export interface CoverageOut {
  coverage_complete?: boolean;
  confidence?: "low" | "medium" | "high";
  checklist_id?: string;
  known_findings_referenced?: string[];
  files_reviewed?: string[];
  modules_reviewed?: string[];
  checklist_passed?: number;
  checklist_total?: number;
  incomplete_reason?: string;
}

export interface AuditLlmResult {
  findings: FindingOut[];
  coverage: CoverageOut;
  model: string;
  raw_response: string;
}

export async function auditWithLlm(
  corePrompt: string,
  auditAgentPrompt: string,
  expectations: string,
  codeContext: string,
  appName: string,
  visualOnly: boolean,
  auditKind?: string,
  extras?: {
    scopeLabel?: string;
    filesInScope?: string[];
    knownFindingIds?: string[];
    checklistId?: string;
    manifestRevision?: string;
  }
): Promise<AuditLlmResult> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) {
    console.warn("[lyra-worker] OPENAI_API_KEY not set; skipping LLM audit");
    return {
      coverage: {
        coverage_complete: false,
        confidence: "low",
        checklist_id: extras?.checklistId,
        incomplete_reason: "OPENAI_API_KEY not configured",
      },
      model: "none",
      raw_response: "OPENAI_API_KEY not configured",
      findings: [
        {
          finding_id: `${appName}-no-api-key`,
          title: "OPENAI_API_KEY not configured",
          description: "Worker cannot run LLM audit without OPENAI_API_KEY.",
          type: "question",
          severity: "minor",
          priority: "P2",
          status: "open",
          category: "config",
        },
      ],
    };
  }

  const model = process.env.LYRA_AUDIT_MODEL?.trim() || "gpt-4o-mini";
  const user = `App name: ${appName}
${visualOnly ? "Focus on visual/UI/UX expectations only.\n" : ""}
${auditKind ? `Primary audit kind: ${auditKind}\n` : ""}
${extras?.manifestRevision ? `Manifest revision: ${extras.manifestRevision}\n` : ""}
${extras?.scopeLabel ? `Audit scope: ${extras.scopeLabel}\n` : ""}
${extras?.checklistId ? `Checklist: ${extras.checklistId}\n` : ""}

## Scope files
${(extras?.filesInScope ?? []).length > 0 ? extras?.filesInScope?.join("\n") : "(scope file list unavailable)"}

## Already-known findings
${(extras?.knownFindingIds ?? []).length > 0 ? extras?.knownFindingIds?.join("\n") : "(none provided)"}

## Expectations document
${expectations}

## Repository context
${codeContext}

Return JSON: { "coverage": { ... }, "findings": [ ... ] } per audit-agent output contract.`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: `${corePrompt}\n\n---\n\n${auditAgentPrompt}` },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
      max_tokens: 4096,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI error ${res.status}: ${err.slice(0, 500)}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const raw = data.choices?.[0]?.message?.content ?? "{}";
  let parsed: { findings?: FindingOut[]; coverage?: CoverageOut };
  try {
    parsed = JSON.parse(raw) as { findings?: FindingOut[]; coverage?: CoverageOut };
  } catch {
    return {
      coverage: {
        coverage_complete: false,
        confidence: "low",
        checklist_id: extras?.checklistId,
        incomplete_reason: "LLM returned non-JSON",
      },
      model,
      raw_response: raw,
      findings: [
        {
          finding_id: `${appName}-parse-error`,
          title: "LLM returned non-JSON",
          description: raw.slice(0, 500),
          type: "bug",
          severity: "minor",
          priority: "P2",
          status: "open",
        },
      ],
    };
  }
  const findings = Array.isArray(parsed.findings) ? parsed.findings : [];
  const coverage = parsed.coverage ?? {};
  return {
    model,
    raw_response: raw,
    coverage: {
      coverage_complete: Boolean(coverage.coverage_complete),
      confidence: coverage.confidence ?? "medium",
      checklist_id: coverage.checklist_id ?? extras?.checklistId,
      known_findings_referenced: Array.isArray(coverage.known_findings_referenced)
        ? coverage.known_findings_referenced
        : [],
      files_reviewed: Array.isArray(coverage.files_reviewed)
        ? coverage.files_reviewed
        : [],
      modules_reviewed: Array.isArray(coverage.modules_reviewed)
        ? coverage.modules_reviewed
        : [],
      checklist_passed:
        typeof coverage.checklist_passed === "number"
          ? coverage.checklist_passed
          : undefined,
      checklist_total:
        typeof coverage.checklist_total === "number"
          ? coverage.checklist_total
          : undefined,
      incomplete_reason:
        typeof coverage.incomplete_reason === "string"
          ? coverage.incomplete_reason
          : undefined,
    },
    findings: findings.map((f, i) => ({
      finding_id: f.finding_id || `${appName}-finding-${i}`,
      title: f.title || "Untitled",
      description: f.description,
      type: (f.type as FindingOut["type"]) || "debt",
      severity: normalizeSeverity(f.severity),
      priority: normalizePriority(f.priority),
      status: "open",
      category: f.category,
      proof_hooks: f.proof_hooks,
      duplicate_of: f.duplicate_of,
    })),
  };
}

function normalizeSeverity(s: string): FindingOut["severity"] {
  const v = (s || "").toLowerCase();
  if (["blocker", "major", "minor", "nit"].includes(v)) return v as FindingOut["severity"];
  if (v === "critical") return "blocker";
  if (v === "warning") return "major";
  if (v === "suggestion") return "minor";
  return "minor";
}

function normalizePriority(s: string): string {
  const v = (s || "").toUpperCase();
  if (["P0", "P1", "P2", "P3"].includes(v)) return v;
  return "P2";
}
