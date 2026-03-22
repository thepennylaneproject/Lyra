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
 * Determine the model to use based on routing strategy and configured providers.
 *
 * The router checks which providers are actually available at runtime and picks
 * the best tier for each strategy. You never need to set LYRA_AUDIT_MODEL —
 * just add API keys and the router upgrades automatically.
 *
 * Tier preference order (best → cheapest fallback):
 *   precision:  sonnet → deepseek:v3 → openai:balanced → openai:mini
 *   balanced:   deepseek:v3 → sonnet → openai:balanced → openai:mini
 *   aggressive: openai:mini → haiku → deepseek:v3 → openai:balanced
 *
 * DeepSeek V3 slots into balanced because it matches Sonnet-level code reasoning
 * at ~10× lower cost. Gemini is available via LYRA_AUDIT_MODEL=gemini:flash for
 * large-context full-project scans (1M token window) when needed.
 *
 * LYRA_AUDIT_MODEL is an escape hatch for explicit model selection only.
 */
function resolveModel(): { primary: string; fallback: string | undefined } {
  const configuredModel = process.env.LYRA_AUDIT_MODEL?.trim();
  const strategy = process.env.LYRA_ROUTING_STRATEGY?.trim().toLowerCase() || "balanced";

  // Escape hatch: explicit model override (rarely needed)
  if (configuredModel) {
    if (configuredModel.includes(":")) {
      return { primary: configuredModel, fallback: undefined };
    }
    const inferred = getRegistry().inferProvider(configuredModel);
    return { primary: `${inferred.provider}:${inferred.modelId}`, fallback: undefined };
  }

  // Check which providers are configured at runtime
  const registry = getRegistry();
  const hasAnthropic   = registry.getProvider("anthropic")?.isConfigured()   ?? false;
  const hasDeepSeek    = registry.getProvider("deepseek")?.isConfigured()    ?? false;
  const hasOpenAI      = registry.getProvider("openai")?.isConfigured()      ?? false;
  const hasHuggingFace = registry.getProvider("huggingface")?.isConfigured() ?? false;
  const hasAimlapi     = registry.getProvider("aimlapi")?.isConfigured()     ?? false;

  // Build a ranked list for each strategy and return the first configured pair
  switch (strategy) {
    case "aggressive":
      // Fastest/cheapest — spot checks, iterative feedback loops
      // HuggingFace nano is free; use it first, then escalate
      return hasHuggingFace
        ? { primary: "huggingface:nano",   fallback: hasOpenAI ? "openai:mini" : hasDeepSeek ? "deepseek:v3" : undefined }
        : hasOpenAI
          ? { primary: "openai:mini",       fallback: hasAnthropic ? "anthropic:haiku" : undefined }
          : hasDeepSeek
            ? { primary: "deepseek:v3",     fallback: hasAnthropic ? "anthropic:haiku" : undefined }
            : { primary: "anthropic:haiku", fallback: undefined };

    case "precision":
      // Maximum quality — pre-deploy, investor reviews, security audits
      return hasAnthropic
        ? { primary: "anthropic:sonnet",   fallback: hasOpenAI ? "openai:balanced" : undefined }
        : hasDeepSeek
          ? { primary: "deepseek:v3",      fallback: hasOpenAI ? "openai:balanced" : undefined }
          : { primary: "openai:balanced",  fallback: undefined };

    case "balanced":
    default:
      // Default — DeepSeek V3 preferred (Sonnet-level reasoning at lower cost),
      // Sonnet as fallback for when DeepSeek is not yet configured
      return hasDeepSeek
        ? { primary: "deepseek:v3",        fallback: hasAnthropic ? "anthropic:sonnet" : hasOpenAI ? "openai:balanced" : undefined }
        : hasAnthropic
          ? { primary: "anthropic:sonnet", fallback: hasOpenAI ? "openai:balanced" : undefined }
          : hasAimlapi
            ? { primary: "aimlapi:mid",    fallback: hasOpenAI ? "openai:balanced" : undefined }
            : { primary: "openai:balanced", fallback: undefined };
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

## Already-known findings (do not duplicate these)
${(extras?.knownFindingIds ?? []).length > 0 ? extras?.knownFindingIds?.join("\n") : "(none provided)"}

## Expectations document
${expectations}

## Repository context
${codeContext}

## Output requirements

Produce findings with DIVERSE types — not just "bug". Use all four types:
- "bug": broken behavior, runtime error, incorrect logic
- "debt": working but fragile, missing constraint, type drift, migration gap
- "question": ambiguous intent that requires human decision before code is written
- "enhancement": missing capability that would improve correctness or safety

Use SPECIFIC categories — not just "ux", "logic", or "security". Use fine-grained names like:
  migration-gap, schema-mismatch, missing-rls, n-plus-one, type-drift, error-handling,
  race-condition, missing-error-boundary, auth-bypass, dead-code, missing-validation,
  copy-mismatch, missing-state, broken-flow, a11y-gap, bundle-size, cache-miss

Each finding MUST include:
- A specific proof_hook referencing the actual file path (and line number where possible)
- A concrete suggested_fix with the affected_files listed

Do NOT report on the audit infrastructure itself (draft expectations, missing validation commands). Focus only on issues in the application code.

Do NOT produce near-duplicate findings. If you see multiple instances of the same pattern, report ONE finding that lists all affected locations in its description.

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
