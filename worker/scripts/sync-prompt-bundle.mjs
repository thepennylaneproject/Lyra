#!/usr/bin/env node
/**
 * Copies Lyra prompt files into dist/prompt-bundle/ so the worker can load them
 * from beside compiled JS (works when deploy root is only `worker/` or when
 * LYRA_REPO_ROOT points at a directory without these files).
 *
 * Set LYRA_PROMPT_SOURCE to the repo root that contains core_system_prompt.md
 * and audits/prompts/ (Docker build uses /lyra-root).
 */
import { cpSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const workerRoot = join(__dirname, "..");
const distDir = join(workerRoot, "dist");
const bundleDir = join(distDir, "prompt-bundle");
const sourceRoot =
  process.env.LYRA_PROMPT_SOURCE?.trim() || join(workerRoot, "..");

const coreSrc = join(sourceRoot, "core_system_prompt.md");
const promptsSrc = join(sourceRoot, "audits", "prompts");

if (!existsSync(coreSrc)) {
  console.error(
    "[sync-prompt-bundle] Missing core_system_prompt.md — expected at:",
    coreSrc,
    "\nSet LYRA_PROMPT_SOURCE to the Lyra repository root, or run build from the full monorepo."
  );
  process.exit(1);
}
if (!existsSync(promptsSrc)) {
  console.error(
    "[sync-prompt-bundle] Missing audits/prompts — expected at:",
    promptsSrc
  );
  process.exit(1);
}

mkdirSync(join(bundleDir, "audits"), { recursive: true });
cpSync(coreSrc, join(bundleDir, "core_system_prompt.md"));
cpSync(promptsSrc, join(bundleDir, "audits", "prompts"), { recursive: true });
console.log("[sync-prompt-bundle] wrote", bundleDir);
