import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";

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

const MAX_FILE_CHARS = 6000;
const MAX_FILES = 12;

function collectFiles(dir: string, out: string[], depth: number): void {
  if (out.length >= MAX_FILES || depth > 5 || !existsSync(dir)) return;
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
      collectFiles(full, out, depth + 1);
    } else if (st.isFile() && st.size < 500_000) {
      const ext = extname(name).toLowerCase();
      if (TEXT_EXT.has(ext)) out.push(full);
    }
    if (out.length >= MAX_FILES * 3) return;
  }
}

export function gatherCodeContext(repoRoot: string, scanDir: string): string {
  const root = join(repoRoot, scanDir);
  if (!existsSync(root)) {
    return `(directory missing: ${scanDir})`;
  }
  const files: string[] = [];
  collectFiles(root, files, 0);
  files.sort();
  const picked = files.slice(0, MAX_FILES);
  const parts: string[] = [];
  for (const f of picked) {
    const rel = f.replace(repoRoot + "/", "");
    try {
      let text = readFileSync(f, "utf-8");
      if (text.length > MAX_FILE_CHARS) {
        text = text.slice(0, MAX_FILE_CHARS) + "\n/* truncated */";
      }
      parts.push(`--- ${rel} ---\n${text}`);
    } catch {
      /* skip */
    }
  }
  return parts.join("\n\n") || "(no readable source files)";
}

export function readExpectations(repoRoot: string, expectationsPath: string): string {
  const full = join(repoRoot, expectationsPath);
  if (!existsSync(full)) {
    return `(missing file: ${expectationsPath})`;
  }
  try {
    return readFileSync(full, "utf-8");
  } catch {
    return `(unreadable: ${expectationsPath})`;
  }
}
