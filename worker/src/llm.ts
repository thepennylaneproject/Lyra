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

import { getRegistry } from "./providers/registry.js";

export interface AuditLlmResult {
  findings: FindingOut[];
  coverage: CoverageOut;
  model: string;
  provider: string;
  raw_response: string;
  costUsd?: number;
}

/**
 * Determine the model to use based on routing strategy and configuration.
 * Supports multiple formats:
 *   - "openai:mini" (explicit provider:model format)
 *   - "gpt-4o-mini" (inferred as openai:mini)
 *   - "claude-3.5-sonnet" (inferred as anthropic:sonnet)
 *
 * Auto-select logic: for each strategy, picks the best *configured* provider
 * so you automatically get cheap DeepSeek when the key is set, and fall back
 * to Sonnet (quality) or mini (safe default) otherwise.
 *
 *   aggressive  →  haiku  → mini          (cheapest)
 *   balanced    →  deepseek:chat → sonnet → mini  (best value; cost-efficient default)
 *   precision   →  sonnet → balanced      (highest quality)
 */
export function resolveModel(): { primary: string; fallback: string | undefined } {
  const configuredModel = process.env.LYRA_AUDIT_MODEL?.trim();
  const strategy = process.env.LYRA_ROUTING_STRATEGY?.trim().toLowerCase() || "balanced";
  const registry = getRegistry();

  // Escape hatch: explicit model override (rarely needed)
  if (configuredModel) {
    if (configuredModel.includes(":")) {
      return { primary: configuredModel, fallback: undefined };
    }
    // Infer provider from model name
    const inferred = registry.inferProvider(configuredModel);
    return { primary: `${inferred.provider}:${inferred.modelId}`, fallback: "openai:mini" };
  }

  // Auto-select best configured provider per strategy
  const deepseekOk = registry.getProvider("deepseek")?.isConfigured() ?? false;
  const anthropicOk = registry.getProvider("anthropic")?.isConfigured() ?? false;

  switch (strategy) {
    case "aggressive":
      // Cheapest: haiku > mini
      if (anthropicOk) return { primary: "anthropic:haiku", fallback: "openai:mini" };
      return { primary: "openai:mini", fallback: undefined };

    case "precision":
      // Highest quality: sonnet > balanced
      if (anthropicOk) return { primary: "anthropic:sonnet", fallback: "openai:balanced" };
      return { primary: "openai:balanced", fallback: "openai:mini" };

    case "balanced":
    default:
      // Best value: deepseek:chat (~10x cheaper than sonnet, strong code analysis)
      // → fall back to sonnet if no DeepSeek key, then mini as last resort
      if (deepseekOk) return { primary: "deepseek:chat", fallback: anthropicOk ? "anthropic:haiku" : "openai:mini" };
      if (anthropicOk) return { primary: "anthropic:sonnet", fallback: "openai:mini" };
      return { primary: "openai:mini", fallback: undefined };
  }
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
  const registry = getRegistry();
  const { primary, fallback } = resolveModel();

  // Check if at least one provider is configured
  const primaryRef = primary.split(":");
  const primaryProvider = registry.getProvider(primaryRef[0]);

  if (!primaryProvider || !primaryProvider.isConfigured()) {
    const fallbackRef = fallback?.split(":");
    const fallbackProvider = fallbackRef ? registry.getProvider(fallbackRef[0]) : null;

    if (!fallbackProvider || !fallbackProvider.isConfigured()) {
      console.warn(
        `[lyra-worker] No LLM provider configured. Set OPENAI_API_KEY or ANTHROPIC_API_KEY`
      );
      return {
        coverage: {
          coverage_complete: false,
          confidence: "low",
          checklist_id: extras?.checklistId,
          incomplete_reason: "No LLM provider configured",
        },
        model: "none",
        provider: "none",
        raw_response: "No LLM provider configured",
        findings: [
          {
            finding_id: `${appName}-no-llm-provider`,
            title: "No LLM provider configured",
            description:
              "Worker cannot run LLM audit without OPENAI_API_KEY or ANTHROPIC_API_KEY.",
            type: "question",
            severity: "minor",
            priority: "P2",
            status: "open",
            category: "config",
          },
        ],
      };
    }
  }

  const user = `App name: ${appName}
${visualOnly ? "Focus on visual/UI/UX expectations only.\n" : ""}
${auditKind ? `Primary audit kind: ${auditKind}\n` : ""}
${extras?.manifestRevision ? `Manifest revision: ${extras.manifestRevision}\n` : ""}
${extras?.scopeLabel ? `Audit scope: ${extras.scopeLabel}\n` : ""}
${extras?.checklistId ? `Checklist: ${extras.checklistId}\n` : ""}

## Scope files
${(extras?.filesInScope ?? []).length > 0 ? extras?.filesInScope?.join("\n") : "(scope file list unavailable)"}

## Already-known findings (do NOT re-report these IDs unless you have new evidence)
${(extras?.knownFindingIds ?? []).length > 0 ? extras?.knownFindingIds?.join("\n") : "(none provided)"}

## Expectations document
${expectations}

## Repository context
${codeContext}

## Output rules
- Each finding_id MUST be unique within this response. Never emit duplicate IDs.
- Cover a DIVERSE mix of finding types (bug, security, performance, ux, debt, config, etc.) — do not cluster all findings under one type.
- Do NOT repeat findings whose IDs appear in the "already-known findings" list above, unless you have new evidence that meaningfully changes the description or severity.
- Emit findings only for issues you can substantiate with specific file or line references in the code context above.

Return JSON: { "coverage": { ... }, "findings": [ ... ] } per audit-agent output contract.`;

  let llmResponse;
  try {
    llmResponse = await registry.call(primary, fallback, {
      systemPrompt: `${corePrompt}\n\n---\n\n${auditAgentPrompt}`,
      userPrompt: user,
      responseFormat: "json_object",
      temperature: 0.2,
      maxTokens: 12288,
    });
  } catch (error) {
    console.error("[lyra-worker] LLM call failed:", error);
    return {
      coverage: {
        coverage_complete: false,
        confidence: "low",
        checklist_id: extras?.checklistId,
        incomplete_reason: `LLM error: ${error instanceof Error ? error.message : String(error)}`,
      },
      model: "error",
      provider: "error",
      raw_response: String(error),
      findings: [
        {
          finding_id: `${appName}-llm-error`,
          title: "LLM call failed",
          description: error instanceof Error ? error.message : String(error),
          type: "question",
          severity: "minor",
          priority: "P2",
          status: "open",
        },
      ],
    };
  }

  const raw = llmResponse.content;
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
      model: llmResponse.model,
      provider: llmResponse.provider,
      raw_response: raw,
      costUsd: llmResponse.costUsd,
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
    model: llmResponse.model,
    provider: llmResponse.provider,
    costUsd: llmResponse.costUsd,
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
