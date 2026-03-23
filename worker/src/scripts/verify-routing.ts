/**
 * verify-routing.ts — Quick routing sanity check for Lyra worker
 *
 * Run with: npx tsx worker/src/scripts/verify-routing.ts
 *
 * Prints the resolved model for each routing strategy based on which
 * providers are actually configured in your .env.local.
 */

import { config as loadDotenv } from "dotenv";
import { resolve } from "path";

// Load keys from .env.local (then .env as fallback) in the worker directory
const workerRoot = resolve(new URL(".", import.meta.url).pathname, "../../..");
loadDotenv({ path: resolve(workerRoot, ".env.local"), override: false });
loadDotenv({ path: resolve(workerRoot, ".env"),       override: false });

import { getRegistry } from "../providers/registry.js";

function resolveModelForStrategy(
  strategy: string,
  hasOpenAI: boolean,
  hasAnthropic: boolean,
  hasDeepSeek: boolean,
  hasHuggingFace: boolean,
  hasAimlapi: boolean,
): { primary: string; fallback: string | undefined } {
  switch (strategy) {
    case "aggressive":
      return hasHuggingFace
        ? { primary: "huggingface:nano", fallback: hasOpenAI ? "openai:mini" : hasDeepSeek ? "deepseek:v3" : undefined }
        : hasOpenAI
          ? { primary: "openai:mini",       fallback: hasAnthropic ? "anthropic:haiku" : undefined }
          : hasDeepSeek
            ? { primary: "deepseek:v3",     fallback: hasAnthropic ? "anthropic:haiku" : undefined }
            : { primary: "anthropic:haiku", fallback: undefined };

    case "precision":
      return hasAnthropic
        ? { primary: "anthropic:sonnet",   fallback: hasOpenAI ? "openai:balanced" : undefined }
        : hasDeepSeek
          ? { primary: "deepseek:v3",      fallback: hasOpenAI ? "openai:balanced" : undefined }
          : { primary: "openai:balanced",  fallback: undefined };

    case "balanced":
    default:
      return hasDeepSeek
        ? { primary: "deepseek:v3",        fallback: hasAnthropic ? "anthropic:sonnet" : hasOpenAI ? "openai:balanced" : undefined }
        : hasAnthropic
          ? { primary: "anthropic:sonnet", fallback: hasOpenAI ? "openai:balanced" : undefined }
          : hasAimlapi
            ? { primary: "aimlapi:mid",    fallback: hasOpenAI ? "openai:balanced" : undefined }
            : { primary: "openai:balanced", fallback: undefined };
  }
}

function main() {
  const registry = getRegistry();

  const hasOpenAI      = registry.getProvider("openai")?.isConfigured()      ?? false;
  const hasAnthropic   = registry.getProvider("anthropic")?.isConfigured()   ?? false;
  const hasDeepSeek    = registry.getProvider("deepseek")?.isConfigured()    ?? false;
  const hasHuggingFace = registry.getProvider("huggingface")?.isConfigured() ?? false;
  const hasAimlapi     = registry.getProvider("aimlapi")?.isConfigured()     ?? false;

  console.log("\n=== Lyra Routing Verification ===\n");

  // Effective model selection per strategy given configured keys
  for (const strategy of ["aggressive", "balanced", "precision"]) {
    const { primary, fallback } = resolveModelForStrategy(strategy, hasOpenAI, hasAnthropic, hasDeepSeek, hasHuggingFace, hasAimlapi);
    const prov = primary.split(":")[0];
    const ok = registry.getProvider(prov)?.isConfigured() ?? false;
    const fallbackProv = fallback?.split(":")[0];
    const fb = fallbackProv ? registry.getProvider(fallbackProv) : null;

    console.log(`Strategy: ${strategy.padEnd(12)} → ${primary.padEnd(25)} [${ok ? "✓" : "✗ not configured"}]`);
    if (fallback) {
      console.log(`  fallback:              ${fallback.padEnd(25)} [${fb?.isConfigured() ? "✓" : "✗ not configured"}]`);
    }
  }

  // Provider status
  console.log("\n=== Provider Status ===\n");
  for (const name of ["openai", "anthropic", "deepseek", "gemini", "huggingface", "aimlapi"]) {
    const p = registry.getProvider(name);
    if (!p) { console.log(`  ${name.padEnd(12)}: not registered`); continue; }
    const ok = p.isConfigured();
    console.log(`  ${name.padEnd(12)}: ${ok ? "✓ configured" : `✗ not configured — ${p.configurationError()}`}`);
  }

  // Env vars (redacted)
  console.log("\n=== Environment ===\n");
  const vars = ["OPENAI_API_KEY", "ANTHROPIC_API_KEY", "DEEPSEEK_API_KEY", "GEMINI_API_KEY", "HF_TOKEN", "AIMLAPI_API_KEY", "LYRA_ROUTING_STRATEGY", "LYRA_AUDIT_MODEL"];
  for (const v of vars) {
    const val = process.env[v];
    const display = val ? (v.includes("KEY") || v.includes("TOKEN") ? `set (${val.slice(0, 8)}...)` : val) : "not set";
    console.log(`  ${v.padEnd(30)}: ${display}`);
  }

  console.log("\n=== Done ===\n");
}

main();
