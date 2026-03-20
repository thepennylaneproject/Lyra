import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, extname, dirname, resolve } from "node:path";

const TEXT_EXT = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".json",
  ".md",
  ".yml",
  ".yaml",
  ".toml",
  ".css",
  ".html",
]);

const DEFAULT_MAX_FILE_CHARS = 6000;
const DEFAULT_MAX_FILES = 12;
/** Bounded excerpt from the app’s intelligence report (`*_report.md` in the mirror tree). */
const MAX_REPORT_CHARS = 12000;

export interface AuditScope {
  scopeType?: string;
  scopePaths?: string[];
  files?: string[];
  baseRef?: string;
  headRef?: string;
  maxFiles?: number;
  maxCharsPerFile?: number;
}

function findIntelligenceReportPath(scanRoot: string): string | null {
  if (!existsSync(scanRoot)) return null;
  let entries: string[];
  try {
    entries = readdirSync(scanRoot);
  } catch {
    return null;
  }
  const candidates = entries
    .filter((n) => {
      const lower = n.toLowerCase();
      return lower.endsWith(".md") && lower.includes("report");
    })
    .sort();
  const direct = candidates[0];
  if (direct) return join(scanRoot, direct);
  for (const name of entries) {
    const sub = join(scanRoot, name);
    let st: ReturnType<typeof statSync>;
    try {
      st = statSync(sub);
    } catch {
      continue;
    }
    if (!st.isDirectory()) continue;
    let subEntries: string[];
    try {
      subEntries = readdirSync(sub);
    } catch {
      continue;
    }
    const subCand = subEntries
      .filter((n) => {
        const lower = n.toLowerCase();
        return lower.endsWith(".md") && lower.includes("report");
      })
      .sort()[0];
    if (subCand) return join(sub, subCand);
  }
  return null;
}

export function readIntelligenceReportExcerpt(
  repoRoot: string,
  scanDir: string
): string | null {
  const root = join(repoRoot, scanDir);
  const reportPath = findIntelligenceReportPath(root);
  if (!reportPath) return null;
  try {
    let text = readFileSync(reportPath, "utf-8");
    if (text.length > MAX_REPORT_CHARS) {
      text =
        text.slice(0, MAX_REPORT_CHARS) +
        "\n\n/* report truncated for token budget */";
    }
    const rel = reportPath.replace(repoRoot + "/", "");
    return `--- ${rel} (intelligence report) ---\n${text}`;
  } catch {
    return null;
  }
}

/**
 * Report excerpt (if any) plus explicitly selected source files for the audit LLM user message.
 */
export function buildCodeContextForAudit(
  repoRoot: string,
  scanRoots: string[],
  scope: AuditScope = {}
): string {
  const maxFiles = scope.maxFiles ?? DEFAULT_MAX_FILES;
  const maxCharsPerFile = scope.maxCharsPerFile ?? DEFAULT_MAX_FILE_CHARS;
  const report = scanRoots
    .map((dir) => readIntelligenceReportExcerpt(repoRoot, dir))
    .find(Boolean);
  const sampled = gatherCodeContext(repoRoot, scanRoots, scope);
  const declaredCount =
    Array.isArray(scope.files) && scope.files.length > 0
      ? scope.files.length
      : undefined;
  const sampleBlock = `## Repository files (${scope.scopeType ?? "project"} scope${declaredCount ? ` — ${declaredCount} files selected` : ` — up to ${maxFiles} text files`}, ${maxCharsPerFile} chars each)\n\n${sampled}`;
  if (report) {
    return `${report}\n\n${sampleBlock}`;
  }
  return sampleBlock;
}

function collectFiles(
  dir: string,
  out: string[],
  depth: number,
  maxFiles: number
): void {
  if (out.length >= maxFiles || depth > 5 || !existsSync(dir)) return;
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const name of entries) {
    if (name === "node_modules" || name === ".git" || name === "dist" || name === "build") continue;
    const full = join(dir, name);
    let st: ReturnType<typeof statSync>;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) {
      collectFiles(full, out, depth + 1, maxFiles);
    } else if (st.isFile() && st.size < 500_000) {
      const ext = extname(name).toLowerCase();
      if (TEXT_EXT.has(ext)) out.push(full);
    }
    if (out.length >= maxFiles * 3) return;
  }
}

export function gatherCodeContext(
  repoRoot: string,
  scanRoots: string[],
  scope: AuditScope = {}
): string {
  const maxFiles = scope.maxFiles ?? DEFAULT_MAX_FILES;
  const maxCharsPerFile = scope.maxCharsPerFile ?? DEFAULT_MAX_FILE_CHARS;
  const files = resolveScopeFiles(repoRoot, scanRoots, scope, maxFiles);
  if (files.length === 0) {
    return "(no readable source files in selected scope)";
  }
  const parts: string[] = [];
  for (const f of files.slice(0, maxFiles)) {
    const rel = f.replace(repoRoot + "/", "");
    try {
      let text = readFileSync(f, "utf-8");
      if (text.length > maxCharsPerFile) {
        text = text.slice(0, maxCharsPerFile) + "\n/* truncated */";
      }
      parts.push(`--- ${rel} ---\n${text}`);
    } catch {
      /* skip */
    }
  }
  return parts.join("\n\n") || "(no readable source files)";
}

export function resolveScopeFiles(
  repoRoot: string,
  scanRoots: string[],
  scope: AuditScope,
  maxFiles: number
): string[] {
  if (Array.isArray(scope.files) && scope.files.length > 0) {
    return uniqueSorted(
      scope.files
        .map((rel) => resolve(repoRoot, rel))
        .filter((full) => existsSync(full) && statSync(full).isFile())
    ).slice(0, maxFiles);
  }
  const scopeType = scope.scopeType ?? "project";
  const candidates: string[] = [];
  const inputPaths =
    Array.isArray(scope.scopePaths) && scope.scopePaths.length > 0
      ? scope.scopePaths
      : scanRoots;

  if (scopeType === "file" || scopeType === "selection") {
    for (const rel of inputPaths) {
      const full = resolve(repoRoot, rel);
      if (existsSync(full) && statSync(full).isFile()) candidates.push(full);
    }
    return uniqueSorted(candidates);
  }

  if (scopeType === "diff") {
    const diffFiles = gitDiffFiles(repoRoot, scope.baseRef, scope.headRef);
    for (const rel of diffFiles) {
      const full = resolve(repoRoot, rel);
      if (existsSync(full) && statSync(full).isFile() && TEXT_EXT.has(extname(full).toLowerCase())) {
        candidates.push(full);
      }
    }
    return uniqueSorted(candidates).slice(0, maxFiles);
  }

  const roots = scopeType === "directory" ? inputPaths : scanRoots;
  for (const rel of roots) {
    const full = resolve(repoRoot, rel);
    if (!existsSync(full)) continue;
    const st = statSync(full);
    if (st.isFile()) {
      candidates.push(full);
      continue;
    }
    if (st.isDirectory()) {
      collectFiles(full, candidates, 0, maxFiles);
    }
  }
  return uniqueSorted(candidates).slice(0, maxFiles);
}

function uniqueSorted(values: string[]): string[] {
  return [...new Set(values)].sort();
}

function gitDiffFiles(
  repoRoot: string,
  baseRef?: string,
  headRef?: string
): string[] {
  if (!baseRef || !headRef) return [];
  try {
    const out = execFileSync(
      "git",
      ["-C", repoRoot, "diff", "--name-only", `${baseRef}...${headRef}`],
      { encoding: "utf8", stdio: "pipe" }
    );
    return out
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => line.replace(/^\.?\//, ""));
  } catch {
    return [];
  }
}

export function readExpectations(repoRoot: string, expectationsPath: string): string {
  const full = join(repoRoot, expectationsPath);
  if (!existsSync(full)) {
    const fallback = resolveExpectationsFromProjectRoot(repoRoot);
    if (fallback) {
      return readFileSync(fallback, "utf-8");
    }
    return `(missing file: ${expectationsPath})`;
  }
  try {
    return readFileSync(full, "utf-8");
  } catch {
    return `(unreadable: ${expectationsPath})`;
  }
}

function resolveExpectationsFromProjectRoot(repoRoot: string): string | null {
  const direct = join(repoRoot, "audits", "expectations.md");
  if (existsSync(direct)) return direct;
  const profile = join(repoRoot, "expectations.md");
  if (existsSync(profile)) return profile;
  return null;
}
