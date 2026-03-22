import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, extname, join } from "node:path";
import { execFileSync } from "node:child_process";
import type {
  AuditKind,
  DecisionEvent,
  OnboardingState,
  Project,
  ProjectArtifact,
  ProjectArtifactVersion,
  ProjectProfileSummary,
  ProjectSourceType,
} from "./types";

const TEXT_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".py",
  ".md",
  ".json",
  ".toml",
  ".yaml",
  ".yml",
  ".sql",
  ".css",
  ".html",
]);

// Onboarding prioritises accuracy over speed — see sampleFiles() for strategy.
const MAX_SAMPLE_FILES = 200;
const MAX_FILE_PREVIEW = 6000;  // chars for general source files
const MAX_KEY_FILE_SIZE = 40_000; // chars — netlify functions, migrations, entry points read in full

const SKIP_DIRS = new Set([
  ".git",
  "node_modules",
  "dist",
  "build",
  ".next",
  ".netlify",
  ".cache",
  ".turbo",
  "out",
  "coverage",
  "__pycache__",
  ".vercel",
  ".svelte-kit",
  ".nuxt",
  ".output",
  "archive_closet",
]);

export interface OnboardRepositoryInput {
  name?: string;
  repository_url?: string;
  default_branch?: string;
  actor?: string;
}

interface RepoAccess {
  path: string;
  sourceType: ProjectSourceType;
  sourceRef: string;
  repositoryUrl?: string;
  cleanup?: () => void;
}

interface RepoSnapshot {
  projectName: string;
  rootPath: string;
  repositoryUrl?: string;
  sourceType: ProjectSourceType;
  sourceRef: string;
  defaultBranch?: string;
  firstCommitDate?: string;
  latestCommitDate?: string;
  commitCount?: number;
  fileCount: number;
  packageName?: string;
  description?: string;
  readmeQuote?: string;
  deploymentSignals: string[];
  liveUrls: string[];
  configFiles: string[];
  scanRoots: string[];
  languages: string[];
  frameworks: string[];
  dependencyGroups: Record<string, string[]>;
  envVars: string[];
  testFiles: string[];
  allFilePaths: string[];
  topLevelTree: Array<{ path: string; note: string }>;
  fileSamples: Array<{ path: string; excerpt: string }>;
  commands: {
    test?: string;
    lint?: string;
    build?: string;
    typecheck?: string;
  };
  stack: Project["stack"];
  profileSummary: ProjectProfileSummary;
}

export function deriveProjectName(input: OnboardRepositoryInput): string {
  const explicit = input.name?.trim();
  if (explicit) return explicit;
  const repo = input.repository_url?.trim();
  if (repo) {
    const cleaned = repo.replace(/\/+$/g, "").replace(/\.git$/i, "");
    const last = cleaned.split("/").filter(Boolean).pop();
    if (last) return last;
  }
  throw new Error("Project name or repository_url is required");
}

export function createDraftProjectFromRepository(
  input: OnboardRepositoryInput
): Project {
  const actor = input.actor?.trim() || "dashboard";
  const access = resolveRepoAccess(input);
  try {
    const snapshot = collectRepoSnapshot(access, input.default_branch, input.name);
    const now = new Date().toISOString();
    const profileArtifact = makeArtifact(
      buildProjectProfile(snapshot),
      "generated",
      "draft"
    );
    const expectationsArtifact = makeArtifact(
      buildExpectations(snapshot),
      "generated",
      "draft"
    );
    const events: DecisionEvent[] = [
      makeDecisionEvent(actor, "onboarding_profile_generated", "profile", {
        after: { version: profileArtifact.draft?.version, source: profileArtifact.draft?.source },
      }),
      makeDecisionEvent(actor, "onboarding_expectations_generated", "expectations", {
        after: { version: expectationsArtifact.draft?.version, source: expectationsArtifact.draft?.source },
      }),
    ];
    const onboardingState: OnboardingState = {
      stage: "operator_review",
      reviewRequired: true,
      updatedAt: now,
      events,
    };
    return {
      name: snapshot.projectName,
      findings: [],
      lastUpdated: now,
      repositoryUrl: snapshot.repositoryUrl,
      status: "draft",
      sourceType: snapshot.sourceType,
      sourceRef: snapshot.sourceRef,
      stack: snapshot.stack,
      auditConfig: {
        defaultBranch: snapshot.defaultBranch,
        scanRoots: snapshot.scanRoots,
        configFiles: snapshot.configFiles,
        commands: snapshot.commands,
      },
      profile: profileArtifact,
      expectations: expectationsArtifact,
      onboardingState,
      decisionHistory: events,
      profileSummary: snapshot.profileSummary,
    };
  } finally {
    access.cleanup?.();
  }
}

function makeArtifact(
  content: string,
  source: "generated" | "manual",
  status: "draft" | "active"
): ProjectArtifact {
  const version: ProjectArtifactVersion = {
    version: 1,
    status,
    content,
    generatedAt: new Date().toISOString(),
    source,
  };
  return status === "active" ? { active: version } : { draft: version };
}

export function makeDecisionEvent(
  actor: string,
  eventType: string,
  targetType: DecisionEvent["target_type"],
  extras: Partial<DecisionEvent> = {}
): DecisionEvent {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    actor,
    event_type: eventType,
    target_type: targetType,
    ...extras,
  };
}

function resolveRepoAccess(input: OnboardRepositoryInput): RepoAccess {
  const repoUrl = input.repository_url?.trim();
  if (!repoUrl) {
    throw new Error("repository_url is required");
  }

  const branch = input.default_branch?.trim();
  const cloneArgs = ["clone", "--depth", "1"];
  if (branch) {
    cloneArgs.push("-b", branch);
  }
  cloneArgs.push(repoUrl);

  const target = mkdtempSync(join(tmpdir(), "lyra-onboard-"));
  cloneArgs.push(target);
  try {
    // Full clone — no depth limit so commit history, count, and dates are accurate.
    // This takes longer than --depth 1 but onboarding correctness is worth it.
    execFileSync("git", ["clone", repoUrl, target], {
      stdio: "pipe",
      encoding: "utf8",
      timeout: 180_000,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Could not clone repository: ${message}`);
  }

  return {
    path: target,
    sourceType: "git_url",
    sourceRef: repoUrl,
    repositoryUrl: repoUrl,
    cleanup: () => {
      try {
        execFileSync("rm", ["-rf", target], { stdio: "ignore" });
      } catch {
        /* ignore */
      }
    },
  };
}

function collectRepoSnapshot(access: RepoAccess, defaultBranch?: string, providedName?: string): RepoSnapshot {
  const root = access.path;
  const pkg = readJsonIfExists(join(root, "package.json"));
  const pyproject = readTextIfExists(join(root, "pyproject.toml"));
  const requirements = readTextIfExists(join(root, "requirements.txt"));
  const readmePath = findReadme(root);
  const readmeText = readmePath ? readTextIfExists(readmePath) : "";
  const files = listFiles(root);
  const scanRoots = detectScanRoots(files);
  const configFiles = detectConfigFiles(files);
  const topLevelTree = describeTopLevel(root);
  const dependencyGroups = groupDependencies(pkg, requirements);
  const envVars = extractEnvVars(files, root);
  const testFiles = files.filter((file) => /(^|\/)(test|tests|__tests__|spec)[/._-]/i.test(file));
  const packageScripts =
    pkg && typeof pkg === "object" && typeof pkg.scripts === "object"
      ? (pkg.scripts as Record<string, string>)
      : {};
  const languages = detectLanguages(files);
  const frameworks = detectFrameworks(pkg, pyproject, files);
  const deploymentSignals = detectDeploymentSignals(files, root);
  const liveUrls = extractUrls(files, root).filter((url) => /^https?:\/\//.test(url));
  const gitInfo = readGitInfo(root);
  const stack = {
    language: languages[0] || guessPrimaryLanguage(files),
    framework: frameworks[0] || "unknown",
    build: detectBuildTool(pkg, files),
    hosting: detectHosting(files),
    database: detectDatabase(pkg, pyproject, files),
    css: detectCss(pkg, files),
  };
  const projectName =
    deriveProjectName({
      name:
        providedName ||
        (pkg && typeof pkg.name === "string" && pkg.name) ||
        basename(root),
    });
  return {
    projectName,
    rootPath: root,
    repositoryUrl: access.repositoryUrl,
    sourceType: access.sourceType,
    sourceRef: access.sourceRef,
    defaultBranch: defaultBranch || gitInfo.defaultBranch,
    firstCommitDate: gitInfo.firstCommitDate,
    latestCommitDate: gitInfo.latestCommitDate,
    commitCount: gitInfo.commitCount,
    fileCount: files.length,
    packageName: pkg && typeof pkg.name === "string" ? pkg.name : undefined,
    description:
      (pkg && typeof pkg.description === "string" && pkg.description) ||
      undefined,
    readmeQuote: extractReadmeQuote(readmeText),
    deploymentSignals,
    liveUrls: [...new Set(liveUrls)].slice(0, 10),
    configFiles,
    scanRoots,
    languages,
    frameworks,
    dependencyGroups,
    envVars,
    testFiles,
    allFilePaths: files,
    topLevelTree,
    fileSamples: sampleFiles(files, root),
    commands: {
      test: packageScripts.test,
      lint: packageScripts.lint,
      build: packageScripts.build,
      typecheck: packageScripts.typecheck,
    },
    stack,
    profileSummary: {
      status: classifyRepoStatus(files, testFiles, deploymentSignals),
      languages,
      frameworks,
      deployment:
        deploymentSignals.length > 0 ? deploymentSignals.join(", ") : "not detected",
      liveUrls: [...new Set(liveUrls)].slice(0, 5),
    },
  };
}

function buildProjectProfile(snapshot: RepoSnapshot): string {
  const verified = (value?: string | number | null) =>
    value == null || value === "" ? "[NOT FOUND IN CODEBASE]" : String(value);
  const readmeSection = snapshot.readmeQuote
    ? `Quoted from README or metadata:\n> ${snapshot.readmeQuote}\n`
    : "[NOT FOUND IN CODEBASE]";
  const treeBlock = snapshot.topLevelTree
    .map((entry) => `- \`${entry.path}\` — ${entry.note}`)
    .join("\n");
  const dependencyTable = Object.entries(snapshot.dependencyGroups)
    .map(([label, deps]) => `### ${label}\n${deps.length > 0 ? deps.map((d) => `- ${d}`).join("\n") : "- [NOT FOUND IN CODEBASE]"}`)
    .join("\n\n");

  return `# ${snapshot.projectName} — Codebase Intelligence Audit

## SECTION 1: PROJECT IDENTITY

### 1. Project Name
${verified(snapshot.packageName || snapshot.projectName)} [VERIFIED]

### 2. Repository URL
${verified(snapshot.repositoryUrl)} ${snapshot.repositoryUrl ? "[VERIFIED]" : ""}

### 3. One-Line Description
${readmeSection}
Cleaner version: ${verified(snapshot.description || snapshot.readmeQuote)} [VERIFIED OR DIRECTLY QUOTED]

### 4. Project Status
${verified(snapshot.profileSummary.status)} [INFERRED FROM CODEBASE SIGNALS]

### 5. Commit Dates
- First commit: ${verified(snapshot.firstCommitDate)}
- Most recent commit: ${verified(snapshot.latestCommitDate)}

### 6. Total Number of Commits
${verified(snapshot.commitCount)}

### 7. Deployment Status
${snapshot.deploymentSignals.length > 0 ? snapshot.deploymentSignals.join(", ") : "[NOT FOUND IN CODEBASE]"}

### 8. Live URLs
${snapshot.liveUrls.length > 0 ? snapshot.liveUrls.map((url) => `- ${url}`).join("\n") : "[NOT FOUND IN CODEBASE]"}

## SECTION 2: TECHNICAL ARCHITECTURE

### 1. Primary Languages and Frameworks
- Languages: ${snapshot.languages.join(", ") || "[NOT FOUND IN CODEBASE]"}
- Frameworks: ${snapshot.frameworks.join(", ") || "[NOT FOUND IN CODEBASE]"}

### 2. Full Dependency List
${dependencyTable}

### 3. Project Structure
${treeBlock || "- [NOT FOUND IN CODEBASE]"}

### 4. Architecture Pattern
${snapshot.frameworks.length > 0 ? `${snapshot.frameworks.join(", ")} application structure detected.` : "[NOT FOUND IN CODEBASE]"}

### 5. Database / Storage Layer
${verified(snapshot.stack?.database)} [VERIFIED OR INFERRED FROM CONFIG]

### 6. API Layer
${buildApiLayerSection(snapshot)}

### 7. External Service Integrations
${detectIntegrationsFromDependencies(snapshot.dependencyGroups, snapshot.fileSamples).join("\n") || "[NOT FOUND IN CODEBASE]"}

### 8. AI/ML Components
${detectAiSignals(snapshot.dependencyGroups, snapshot.fileSamples)}

### 9. Authentication and Authorization Model
${detectAuthSignals(snapshot.dependencyGroups, snapshot.fileSamples)}

### 10. Environment Variables
${snapshot.envVars.length > 0 ? snapshot.envVars.map((name) => `- ${name}`).join("\n") : "[NOT FOUND IN CODEBASE]"}

## SECTION 3: FEATURE INVENTORY

${buildFeatureInventory(snapshot)}

## SECTION 4: DESIGN SYSTEM & BRAND

${detectDesignSignals(snapshot.fileSamples, snapshot.configFiles, snapshot.dependencyGroups)}

## SECTION 5: DATA & SCALE SIGNALS

${buildScaleSection(snapshot)}

## SECTION 6: MONETIZATION & BUSINESS LOGIC

${detectBillingSignals(snapshot.dependencyGroups, snapshot.fileSamples)}

## SECTION 7: CODE QUALITY & MATURITY SIGNALS

${buildCodeQualitySection(snapshot)}

## SECTION 8: ECOSYSTEM CONNECTIONS

${snapshot.repositoryUrl ? `- Primary repository: ${snapshot.repositoryUrl}` : "[NOT FOUND IN CODEBASE]"}

## SECTION 9: WHAT'S MISSING (CRITICAL)

${buildGapsSection(snapshot)}

## SECTION 10: EXECUTIVE SUMMARY

${buildExecutiveSummary(snapshot)}

\`\`\`
---
AUDIT METADATA
Project: ${snapshot.projectName}
Date: ${new Date().toISOString().slice(0, 10)}
Agent: lyra-onboarding-foundation
Codebase access: full repo
Confidence level: medium; deterministic repo inspection without runtime execution
Sections with gaps: sections depending on runtime, external services, and undocumented product intent
Total files analyzed: ${snapshot.fileCount}
---
\`\`\``;
}

function buildExpectations(snapshot: RepoSnapshot): string {
  const scanRoots = snapshot.scanRoots.length > 0
    ? snapshot.scanRoots.map((dir) => `- \`${dir}\``).join("\n")
    : "- \`.\`";
  const configFiles = snapshot.configFiles.length > 0
    ? snapshot.configFiles.map((file) => `- \`${file}\``).join("\n")
    : "- [NOT FOUND IN CODEBASE]";
  const commands = formatCommands(snapshot.commands);
  return `# ${snapshot.projectName} — Expectations Document

> Generated from repository inspection on ${new Date().toISOString().slice(0, 10)}
> Review required before activation

---

## 1. Project Identity

- Project name: \`${snapshot.projectName}\`
- Source type: \`${snapshot.sourceType}\`
- Source ref: \`${snapshot.sourceRef}\`
- Default branch: \`${snapshot.defaultBranch ?? "not detected"}\`

## 2. Audit Scope Defaults

Lyra should treat these paths as the default project scope unless a narrower audit scope is selected:
${scanRoots}

Config files to keep in scope:
${configFiles}

## 3. Stack Constraints

- Primary language: \`${snapshot.stack?.language ?? "unknown"}\`
- Framework: \`${snapshot.stack?.framework ?? "unknown"}\`
- Build: \`${snapshot.stack?.build ?? "unknown"}\`
- Hosting: \`${snapshot.stack?.hosting ?? "unknown"}\`
- Database: \`${snapshot.stack?.database ?? "unknown"}\`
- CSS: \`${snapshot.stack?.css ?? "unknown"}\`

## 4. Validation Commands

${commands}

## 5. Audit Expectations

### 5.1 Review required before autonomous action
Generated profile and expectations are draft artifacts until explicitly activated.

### 5.2 Scope-aware audits
Lyra should prefer \`file\`, \`directory\`, \`selection\`, or \`diff\` scopes when provided. \`project\` scope should use the default scan roots above.

### 5.3 Evidence standard
Every finding should cite file paths and, when possible, line anchors from the scanned scope. Missing evidence should lower confidence.

### 5.4 Command safety
If validation commands are unavailable or fail to run, Lyra should record the gap rather than claiming verification.

### 5.5 Activation gate
Only active expectations should drive production audit runs. Draft expectations remain review artifacts.

## 6. Notes For Operator Review

- Confirm scan roots are correct for this repo.
- Confirm commands before enabling automated validation.
- Add project-specific rules after the first reviewed audit if needed.
`;
}

function listFiles(root: string): string[] {
  const out: string[] = [];
  const walk = (dir: string, depth: number) => {
    if (depth > 6) return;
    let entries: string[] = [];
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }
    for (const name of entries) {
      if (SKIP_DIRS.has(name)) continue;
      const full = join(dir, name);
      let st;
      try {
        st = statSync(full);
      } catch {
        continue;
      }
      if (st.isDirectory()) {
        walk(full, depth + 1);
      } else if (st.isFile()) {
        out.push(full.replace(root + "/", ""));
      }
    }
  };
  walk(root, 0);
  return out.sort();
}

function detectScanRoots(files: string[]): string[] {
  const roots = new Set<string>();
  for (const file of files) {
    const top = file.split("/").slice(0, 2).join("/");
    if (/^(src|app|apps|packages|server|api|services|worker|dashboard)(\/|$)/.test(file)) {
      roots.add(top.endsWith("/") ? top : `${top}/`);
    }
  }
  if (roots.size === 0) roots.add("./");
  return [...roots].sort();
}

function detectConfigFiles(files: string[]): string[] {
  return files.filter((file) =>
    /(^|\/)(package\.json|tsconfig.*\.json|pyproject\.toml|requirements\.txt|vercel\.json|netlify\.toml|docker-compose.*|Dockerfile|tailwind\.config.*|next\.config.*|vite\.config.*|supabase\/|migrations\/)/i.test(file)
  ).slice(0, 20);
}

function describeTopLevel(root: string): Array<{ path: string; note: string }> {
  const entries = readdirSync(root).filter((name) => !name.startsWith(".")).slice(0, 20);
  return entries.map((name) => ({
    path: name,
    note: inferTopLevelPurpose(name),
  }));
}

function inferTopLevelPurpose(name: string): string {
  if (name === "src" || name === "app") return "primary application code";
  if (name === "apps") return "multi-app workspace";
  if (name === "packages") return "shared packages";
  if (name === "tests" || name === "__tests__") return "tests";
  if (name === "docs") return "documentation";
  if (name === "supabase" || name === "db") return "database and migrations";
  if (name === "scripts") return "scripts and tooling";
  return "repository content";
}

function readJsonIfExists(filePath: string): Record<string, unknown> | null {
  if (!existsSync(filePath)) return null;
  try {
    return JSON.parse(readFileSync(filePath, "utf8")) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function readTextIfExists(filePath: string): string {
  if (!existsSync(filePath)) return "";
  try {
    return readFileSync(filePath, "utf8");
  } catch {
    return "";
  }
}

function findReadme(root: string): string | null {
  for (const candidate of ["README.md", "readme.md", "README", "Readme.md"]) {
    const full = join(root, candidate);
    if (existsSync(full)) return full;
  }
  return null;
}

function extractReadmeQuote(text: string): string | undefined {
  const line = text
    .split(/\r?\n/)
    .map((value) => value.trim())
    .find((value) => value && !value.startsWith("#"));
  return line || undefined;
}

// Files that define actual runtime behaviour — read in full so signal detection
// isn't cut off mid-function.
function isKeyFile(file: string): boolean {
  return (
    /^netlify\/functions\//i.test(file) ||
    /^supabase\/migrations\//i.test(file) ||
    /^supabase\/functions\//i.test(file) ||
    /\/(src|app)\/(main|index|App)\.(ts|tsx|js|jsx)$/i.test(file) ||
    /^(src|app)\/(main|index|App)\.(ts|tsx|js|jsx)$/i.test(file) ||
    /^(src|app)\/.*\/(index|route|server)\.(ts|js)$/i.test(file)
  );
}

function sampleFiles(files: string[], root: string): Array<{ path: string; excerpt: string }> {
  const textFiles = files.filter((file) => TEXT_EXTENSIONS.has(extname(file).toLowerCase()));

  // Tier 0 — always read in full: serverless functions, DB migrations, entry points
  // Tier 1 — primary source trees (read up to MAX_FILE_PREVIEW each)
  // Tier 2 — other .ts/.js/.py files
  // Tier 3 — config, docs, everything else
  const priority = (file: string): number => {
    if (isKeyFile(file)) return 0;
    if (/^(src|app|lib|server|api|pages|components|features|hooks|domain|services|modules)\//i.test(file)) return 1;
    if (/\.(ts|tsx|js|jsx|py)$/.test(file)) return 2;
    return 3;
  };

  const sorted = [...textFiles].sort((a, b) => priority(a) - priority(b) || a.localeCompare(b));
  const picked = sorted.slice(0, MAX_SAMPLE_FILES);

  return picked.map((file) => {
    const text = readTextIfExists(join(root, file));
    const limit = isKeyFile(file) ? MAX_KEY_FILE_SIZE : MAX_FILE_PREVIEW;
    return {
      path: file,
      excerpt: text.slice(0, limit) || "(empty file)",
    };
  });
}

function detectLanguages(files: string[]): string[] {
  const langs = new Set<string>();
  for (const file of files) {
    const ext = extname(file).toLowerCase();
    if (ext === ".ts" || ext === ".tsx") langs.add("TypeScript");
    if (ext === ".js" || ext === ".jsx") langs.add("JavaScript");
    if (ext === ".py") langs.add("Python");
    if (ext === ".rb") langs.add("Ruby");
    if (ext === ".go") langs.add("Go");
    if (ext === ".rs") langs.add("Rust");
    if (ext === ".sql") langs.add("SQL");
  }
  return [...langs];
}

function guessPrimaryLanguage(files: string[]): string {
  const counts = new Map<string, number>();
  for (const file of files) {
    const ext = extname(file).toLowerCase();
    counts.set(ext, (counts.get(ext) ?? 0) + 1);
  }
  const winner = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  if (winner === ".py") return "python";
  if (winner === ".ts" || winner === ".tsx") return "typescript";
  if (winner === ".js" || winner === ".jsx") return "javascript";
  return "unknown";
}

function detectFrameworks(
  pkg: Record<string, unknown> | null,
  pyproject: string,
  files: string[]
): string[] {
  const deps = dependencyNames(pkg);
  const frameworks = new Set<string>();
  if (deps.has("next")) frameworks.add("Next.js");
  if (deps.has("react")) frameworks.add("React");
  if (deps.has("express")) frameworks.add("Express");
  if (deps.has("@nestjs/core")) frameworks.add("NestJS");
  if (deps.has("fastify")) frameworks.add("Fastify");
  if (pyproject.includes("fastapi")) frameworks.add("FastAPI");
  if (pyproject.includes("django")) frameworks.add("Django");
  if (pyproject.includes("flask")) frameworks.add("Flask");
  if (files.some((file) => file.startsWith("supabase/functions/"))) frameworks.add("Supabase");
  return [...frameworks];
}

function groupDependencies(
  pkg: Record<string, unknown> | null,
  requirements: string
): Record<string, string[]> {
  const deps = packageDependencyMap(pkg);
  const all = [
    ...Object.entries(deps.dependencies),
    ...Object.entries(deps.devDependencies),
  ].map(([name, version]) => `${name}@${version}`);
  const out: Record<string, string[]> = {
    "Core framework dependencies": all.filter((value) => /(next|react|vue|svelte|express|nestjs|fastify)/i.test(value)),
    "UI / styling libraries": all.filter((value) => /(tailwind|radix|chakra|mui|styled|framer)/i.test(value)),
    "API / data layer": all.filter((value) => /(pg|prisma|drizzle|supabase|trpc|graphql|axios)/i.test(value)),
    "AI / ML integrations": all.filter((value) => /(openai|anthropic|langchain|huggingface|replicate)/i.test(value)),
    Authentication: all.filter((value) => /(auth|clerk|lucia|next-auth|passport)/i.test(value)),
    Testing: all.filter((value) => /(jest|vitest|playwright|cypress|pytest|testing-library)/i.test(value)),
    "Build tooling": all.filter((value) => /(vite|webpack|turbo|eslint|typescript|tsup|rollup)/i.test(value)),
    Other: all.filter((value) =>
      !/(next|react|vue|svelte|express|nestjs|fastify|tailwind|radix|chakra|mui|styled|framer|pg|prisma|drizzle|supabase|trpc|graphql|axios|openai|anthropic|langchain|huggingface|replicate|auth|clerk|lucia|next-auth|passport|jest|vitest|playwright|cypress|pytest|testing-library|vite|webpack|turbo|eslint|typescript|tsup|rollup)/i.test(value)
    ),
  };
  if (requirements.trim()) {
    const python = requirements
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"));
    out["Python requirements"] = python;
  }
  return out;
}

function packageDependencyMap(pkg: Record<string, unknown> | null): {
  dependencies: Record<string, string>;
  devDependencies: Record<string, string>;
} {
  return {
    dependencies:
      pkg && typeof pkg.dependencies === "object" && pkg.dependencies
        ? (pkg.dependencies as Record<string, string>)
        : {},
    devDependencies:
      pkg && typeof pkg.devDependencies === "object" && pkg.devDependencies
        ? (pkg.devDependencies as Record<string, string>)
        : {},
  };
}

function dependencyNames(pkg: Record<string, unknown> | null): Set<string> {
  const deps = packageDependencyMap(pkg);
  return new Set([
    ...Object.keys(deps.dependencies),
    ...Object.keys(deps.devDependencies),
  ]);
}

function extractEnvVars(files: string[], root: string): string[] {
  const vars = new Set<string>();
  for (const file of files.slice(0, 100)) {
    const ext = extname(file).toLowerCase();
    if (!TEXT_EXTENSIONS.has(ext)) continue;
    const text = readTextIfExists(join(root, file));
    for (const match of text.matchAll(/\b(?:process\.env|os\.environ(?:\.get)?|getenv)\.?(?:\[\s*['"]|get\(\s*['"])?([A-Z][A-Z0-9_]+)/g)) {
      if (match[1]) vars.add(match[1]);
    }
    for (const match of text.matchAll(/\b([A-Z][A-Z0-9_]{2,})\b/g)) {
      const name = match[1];
      if (/^(NEXT_PUBLIC_|VITE_|SUPABASE_|OPENAI_|DATABASE_|REDIS_|AUTH_|API_)/.test(name)) vars.add(name);
    }
  }
  return [...vars].sort().slice(0, 80);
}

function detectDeploymentSignals(files: string[], root: string): string[] {
  const out: string[] = [];
  if (files.includes("netlify.toml")) out.push("Netlify config detected");
  if (files.includes("vercel.json")) out.push("Vercel config detected");
  if (files.some((file) => /Dockerfile|docker-compose/i.test(file))) out.push("Docker config detected");
  if (files.some((file) => file.startsWith(".github/workflows/"))) out.push("GitHub Actions detected");
  if (files.some((file) => /render\.yaml|fly\.toml/i.test(file))) out.push("Additional deploy config detected");
  const envExample = ["README.md", "README"].map((name) => join(root, name)).find((file) => existsSync(file));
  if (envExample && readTextIfExists(envExample).match(/https?:\/\//)) out.push("README references external URLs");
  return out;
}

// Domains that are always service dashboards / documentation, never a live app URL
const SERVICE_DOMAINS = [
  "app.supabase.com", "supabase.com", "dashboard.stripe.com", "stripe.com",
  "platform.openai.com", "console.anthropic.com", "aimlapi.com",
  "aistudio.google.com", "platform.deepseek.com", "console.mistral.ai",
  "dashboard.cohere.com", "cohere.com", "openai.com", "anthropic.com",
  "github.com", "npmjs.com", "docs.github.com", "developer.mozilla.org",
  "tailwindcss.com", "reactjs.org", "nextjs.org", "vitejs.dev",
  "cloudinary.com", "posthog.com", "linear.app",
];

function isServiceUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return SERVICE_DOMAINS.some((domain) => host === domain || host.endsWith(`.${domain}`));
  } catch {
    return true; // malformed URLs are not live app URLs
  }
}

function extractUrls(files: string[], root: string): string[] {
  const urls = new Set<string>();
  for (const file of files.slice(0, 100)) {
    const text = readTextIfExists(join(root, file));
    for (const match of text.matchAll(/https?:\/\/[^\s'")<>]+/g)) {
      const url = match[0].replace(/[.,;]+$/, ""); // strip trailing punctuation
      if (!isServiceUrl(url)) urls.add(url);
    }
  }
  return [...urls];
}

function readGitInfo(root: string): {
  defaultBranch?: string;
  firstCommitDate?: string;
  latestCommitDate?: string;
  commitCount?: number;
} {
  try {
    const defaultBranch = execFileSync("git", ["-C", root, "rev-parse", "--abbrev-ref", "HEAD"], {
      encoding: "utf8",
      stdio: "pipe",
    }).trim();
    const latestCommitDate = execFileSync("git", ["-C", root, "log", "-1", "--format=%cI"], {
      encoding: "utf8",
      stdio: "pipe",
    }).trim();
    const firstCommitDate = execFileSync("git", ["-C", root, "log", "--reverse", "--format=%cI"], {
      encoding: "utf8",
      stdio: "pipe",
    })
      .split(/\r?\n/)
      .find(Boolean)
      ?.trim();
    const commitCount = Number(
      execFileSync("git", ["-C", root, "rev-list", "--count", "HEAD"], {
        encoding: "utf8",
        stdio: "pipe",
      }).trim()
    );
    return { defaultBranch, firstCommitDate, latestCommitDate, commitCount };
  } catch {
    return {};
  }
}

function detectBuildTool(pkg: Record<string, unknown> | null, files: string[]): string {
  const deps = dependencyNames(pkg);
  if (deps.has("vite")) return "vite";
  if (deps.has("next")) return "next";
  if (deps.has("turbo")) return "turborepo";
  if (files.some((file) => file === "Makefile")) return "make";
  return "unknown";
}

function detectHosting(files: string[]): string {
  if (files.includes("netlify.toml")) return "netlify";
  if (files.includes("vercel.json")) return "vercel";
  if (files.some((file) => /Dockerfile|docker-compose/i.test(file))) return "docker";
  return "unknown";
}

function detectDatabase(
  pkg: Record<string, unknown> | null,
  pyproject: string,
  files: string[]
): string {
  const deps = dependencyNames(pkg);
  if (deps.has("@supabase/supabase-js") || files.some((file) => file.startsWith("supabase/"))) return "supabase";
  if (deps.has("pg") || deps.has("postgres")) return "postgresql";
  if (deps.has("sqlite3") || pyproject.includes("sqlite")) return "sqlite";
  if (deps.has("prisma")) return "prisma";
  if (deps.has("drizzle-orm")) return "drizzle";
  return "unknown";
}

function detectCss(pkg: Record<string, unknown> | null, files: string[]): string {
  const deps = dependencyNames(pkg);
  if (deps.has("tailwindcss") || files.some((file) => /tailwind\.config/i.test(file))) return "tailwind";
  if (files.some((file) => extname(file).toLowerCase() === ".css")) return "css";
  return "unknown";
}

function classifyRepoStatus(
  files: string[],
  testFiles: string[],
  deploymentSignals: string[]
): string {
  if (files.length < 10) return "concept";
  if (deploymentSignals.length === 0 && testFiles.length === 0) return "prototype";
  if (deploymentSignals.length === 0) return "alpha";
  if (testFiles.length > 0 && deploymentSignals.length > 0) return "beta";
  return "alpha";
}

function buildApiLayerSection(snapshot: RepoSnapshot): string {
  const lines: string[] = [];

  // Detect API functions/routes from file paths
  const apiFunctions = snapshot.fileSamples.filter((s) =>
    /^(netlify\/functions|api|app\/api|pages\/api|server\/api|src\/api)/i.test(s.path)
  );
  // Match files named exactly route.ts / route.js (Next.js App Router convention),
  // not components whose name contains "Route" (e.g. ProtectedRoute.tsx)
  const routeFiles = snapshot.fileSamples.filter((s) =>
    /[/\\]route\.(ts|js)$|[/\\]endpoint\.(ts|js)$/i.test(s.path)
  );
  const allApiFiles = [...apiFunctions, ...routeFiles];

  if (allApiFiles.length > 0) {
    lines.push(`**API endpoints detected (${allApiFiles.length}):**`);
    for (const f of allApiFiles.slice(0, 25)) {
      // Try to infer HTTP method and purpose from excerpt
      const methods = new Set<string>();
      if (/GET|req\.method.*GET/i.test(f.excerpt)) methods.add("GET");
      if (/POST|req\.method.*POST/i.test(f.excerpt)) methods.add("POST");
      if (/PATCH|PUT/i.test(f.excerpt)) methods.add("PATCH");
      if (/DELETE/i.test(f.excerpt)) methods.add("DELETE");
      const methodStr = methods.size > 0 ? `[${[...methods].join("/")}]` : "";
      lines.push(`- \`${f.path}\` ${methodStr}`);
    }
    if (allApiFiles.length > 25) {
      lines.push(`- ... + ${allApiFiles.length - 25} more endpoints`);
    }
  }

  // Check for API config patterns
  const configApiFiles = snapshot.configFiles.filter((f) => /api|route|server/i.test(f));
  if (configApiFiles.length > 0 && allApiFiles.length === 0) {
    lines.push(`**API config files:** ${configApiFiles.map((f) => `\`${f}\``).join(", ")}`);
  }

  if (lines.length === 0) return "[NOT FOUND IN CODEBASE]";
  return lines.join("\n");
}

function buildScaleSection(snapshot: RepoSnapshot): string {
  const lines: string[] = [];

  lines.push(`| Signal | Value |`);
  lines.push(`|---|---|`);
  lines.push(`| Total files scanned | ${snapshot.fileCount} |`);
  lines.push(`| Source files sampled | ${snapshot.fileSamples.length} |`);
  lines.push(`| Test files | ${snapshot.testFiles.length} |`);
  lines.push(`| Config files | ${snapshot.configFiles.length} |`);
  lines.push(`| Commits | ${snapshot.commitCount ?? "unknown"} |`);

  if (snapshot.firstCommitDate && snapshot.latestCommitDate) {
    const first = new Date(snapshot.firstCommitDate);
    const latest = new Date(snapshot.latestCommitDate);
    const weeks = Math.round((latest.getTime() - first.getTime()) / (7 * 24 * 60 * 60 * 1000));
    lines.push(`| Repository age | ~${weeks} weeks |`);
    if (snapshot.commitCount && weeks > 0) {
      lines.push(`| Commit velocity | ~${Math.round(snapshot.commitCount / Math.max(weeks, 1))}/week |`);
    }
  }

  // Performance patterns detected
  const perfSignals = new Set<string>();
  for (const sample of snapshot.fileSamples) {
    const e = sample.excerpt;
    if (/React\.lazy|lazy\(|Suspense/i.test(e)) perfSignals.add("Code splitting (React.lazy)");
    if (/useMemo|useCallback|memo\(/i.test(e)) perfSignals.add("Memoization");
    if (/staleTime|cacheTime|react-query/i.test(e)) perfSignals.add("Query caching");
    if (/p-limit|concurrency|throttle/i.test(e)) perfSignals.add("Concurrency control");
    if (/aggregate|materialized|daily_/i.test(e)) perfSignals.add("Pre-computed aggregates");
    if (/sha.?256|hash|dedup/i.test(e)) perfSignals.add("Content deduplication");
  }
  if (perfSignals.size > 0) {
    lines.push("");
    lines.push(`**Performance patterns:** ${[...perfSignals].join(", ")}`);
  }

  return lines.join("\n");
}

function buildCodeQualitySection(snapshot: RepoSnapshot): string {
  const lines: string[] = [];

  // Commands
  lines.push(`**Validation commands:**`);
  lines.push(formatCommands(snapshot.commands));
  lines.push("");

  // Test coverage
  if (snapshot.testFiles.length > 0) {
    lines.push(`**Test files (${snapshot.testFiles.length}):** ${snapshot.testFiles.slice(0, 10).map((f) => `\`${f}\``).join(", ")}${snapshot.testFiles.length > 10 ? ` + ${snapshot.testFiles.length - 10} more` : ""}`);
  } else {
    lines.push("**Testing:** No test files detected ⚠️");
  }

  // Linting / type checking
  const deps = Object.values(snapshot.dependencyGroups).flat();
  const qualityTools = new Set<string>();
  if (deps.some((d) => /eslint/i.test(d))) qualityTools.add("ESLint");
  if (deps.some((d) => /prettier/i.test(d))) qualityTools.add("Prettier");
  if (deps.some((d) => /stylelint/i.test(d))) qualityTools.add("Stylelint");
  if (deps.some((d) => /typescript/i.test(d))) qualityTools.add("TypeScript");
  if (deps.some((d) => /storybook/i.test(d))) qualityTools.add("Storybook");
  if (deps.some((d) => /chromatic/i.test(d))) qualityTools.add("Chromatic");
  if (qualityTools.size > 0) {
    lines.push(`**Quality tooling:** ${[...qualityTools].join(", ")}`);
  }

  // CI/CD
  const ciFiles = snapshot.configFiles.filter((f) =>
    /workflow|ci\.yml|ci\.yaml|\.github\/workflows/i.test(f)
  );
  if (ciFiles.length > 0) {
    lines.push(`**CI/CD:** ${ciFiles.map((f) => `\`${f}\``).join(", ")}`);
  }

  // Code patterns
  const patterns = new Set<string>();
  for (const sample of snapshot.fileSamples) {
    const e = sample.excerpt;
    if (/ErrorBoundary|error.boundary/i.test(e)) patterns.add("Error boundaries");
    if (/try\s*\{[\s\S]*catch/i.test(e)) patterns.add("Structured error handling");
    if (/console\.error|console\.warn/i.test(e)) patterns.add("Console logging");
    if (/zod|z\.object|z\.string/i.test(e)) patterns.add("Zod validation");
    if (/ajv|jsonschema/i.test(e)) patterns.add("JSON Schema validation");
  }
  if (patterns.size > 0) {
    lines.push(`**Code patterns:** ${[...patterns].join(", ")}`);
  }

  return lines.join("\n\n");
}

function buildGapsSection(snapshot: RepoSnapshot): string {
  const gaps: Array<{ gap: string; severity: string; notes: string }> = [];

  // Check for missing test coverage
  if (snapshot.testFiles.length === 0) {
    gaps.push({ gap: "No test suite detected", severity: "High", notes: "No test files found in the repository" });
  } else if (snapshot.testFiles.length < 5 && snapshot.fileCount > 100) {
    gaps.push({ gap: "Low test coverage", severity: "Medium", notes: `${snapshot.testFiles.length} test files for ${snapshot.fileCount} total files` });
  }

  // Check for missing deployment
  if (snapshot.deploymentSignals.length === 0) {
    gaps.push({ gap: "No deployment configuration", severity: "High", notes: "No Netlify, Vercel, Docker, or CI/CD config detected" });
  }

  // Check for error monitoring
  const deps = Object.values(snapshot.dependencyGroups).flat();
  if (!deps.some((d) => /sentry|bugsnag|datadog|newrelic/i.test(d))) {
    gaps.push({ gap: "No error monitoring service", severity: "Medium", notes: "No Sentry, Bugsnag, or similar dependency found" });
  }

  // Check for env documentation
  if (snapshot.envVars.length > 5 && !snapshot.configFiles.some((f) => /\.env\.example|\.env\.template/i.test(f))) {
    gaps.push({ gap: "No .env.example file", severity: "Low", notes: `${snapshot.envVars.length} env vars used but no template file for onboarding` });
  }

  // Security signals
  for (const sample of snapshot.fileSamples) {
    if (/Access-Control-Allow-Origin.*\*/i.test(sample.excerpt)) {
      gaps.push({ gap: "Wildcard CORS policy", severity: "High", notes: `Found in \`${sample.path}\` — should be origin-specific` });
      break;
    }
  }

  // Missing README
  if (!snapshot.readmeQuote) {
    gaps.push({ gap: "Missing or empty README", severity: "Low", notes: "No description found in README" });
  }

  if (gaps.length === 0) {
    return "No critical gaps detected from static analysis. A runtime audit is recommended to verify.";
  }

  const table = gaps.map((g) => `| ${g.gap} | ${g.severity} | ${g.notes} |`).join("\n");
  return `| Gap | Severity | Notes |
|---|---|---|
${table}

**Recommended next steps:**
1. Review and tighten the generated expectations document.
2. Confirm scan roots and commands before activating audits.
3. Run a scoped full audit after activation.
4. Address high-severity gaps before production deployment.
5. Capture operator decisions so Lyra can calibrate future audits.`;
}

function buildExecutiveSummary(snapshot: RepoSnapshot): string {
  const name = snapshot.projectName;
  const status = snapshot.profileSummary.status ?? "working";
  const framework = snapshot.frameworks[0] ?? snapshot.languages[0] ?? "a custom stack";
  const age = (() => {
    if (!snapshot.firstCommitDate || !snapshot.latestCommitDate) return "";
    const weeks = Math.round(
      (new Date(snapshot.latestCommitDate).getTime() - new Date(snapshot.firstCommitDate).getTime()) /
        (7 * 24 * 60 * 60 * 1000)
    );
    return ` over ~${weeks} weeks`;
  })();
  const commitInfo = snapshot.commitCount ? ` with ${snapshot.commitCount} commits${age}` : "";

  // Count features
  const hasAuth = snapshot.fileSamples.some((s) => /auth|login|session/i.test(s.path));
  const hasBilling = snapshot.fileSamples.some((s) => /billing|stripe|checkout|subscription/i.test(s.path));
  const hasAi = snapshot.fileSamples.some((s) => /(ai|llm|provider|model|completion)/i.test(s.path));
  const hasApi = snapshot.fileSamples.some((s) => /^(netlify\/functions|api|app\/api|pages\/api)/i.test(s.path));

  const capabilities: string[] = [];
  if (hasAuth) capabilities.push("authentication");
  if (hasBilling) capabilities.push("billing");
  if (hasAi) capabilities.push("AI integration");
  if (hasApi) capabilities.push("serverless API layer");
  if (snapshot.stack?.database !== "unknown") capabilities.push(`${snapshot.stack?.database} database`);

  const capabilityStr = capabilities.length > 0
    ? ` The codebase includes ${capabilities.join(", ")}.`
    : "";

  const testStr = snapshot.testFiles.length > 0
    ? `${snapshot.testFiles.length} test files provide partial coverage.`
    : "No test suite was detected.";

  const deployStr = snapshot.deploymentSignals.length > 0
    ? `Deployment is configured via ${snapshot.deploymentSignals[0].replace(" detected", "").toLowerCase()}.`
    : "No deployment configuration was detected.";

  return `**${name}** is a **${status}** ${framework} project${commitInfo}.${capabilityStr}

${testStr} ${deployStr}

This profile was generated from static repository analysis. Sections marked [NOT FOUND IN CODEBASE] require manual review or a deeper audit pass. The next step is to review the generated expectations, activate the project, and run scoped audits to produce actionable findings.`;
}

function buildFeatureInventory(snapshot: RepoSnapshot): string {
  // Use all file paths for categorization — fileSamples only covers 40 files
  // out of potentially hundreds, which makes large repos look nearly empty.
  const files = snapshot.allFilePaths;
  // Group files into feature areas by path pattern
  const areas: Record<string, { files: string[]; signals: Set<string> }> = {};
  const categorize = (file: string): string => {
    if (/\/(auth|login|signup|register|password|session)\b/i.test(file)) return "Authentication";
    if (/\/(billing|checkout|subscription|payment|stripe|pricing|webhook)/i.test(file)) return "Billing & Payments";
    if (/\/(ai|llm|provider|router|completion|prompt|model|agent)/i.test(file)) return "AI / ML Integration";
    if (/\/(api|function|endpoint|route)\b/i.test(file) && !/test/i.test(file)) return "API Endpoints";
    if (/\/(component|ui|widget|modal|panel|button|form|layout|page|view)/i.test(file)) return "UI Components";
    if (/\/(hook|use[A-Z])/i.test(file)) return "React Hooks";
    if (/\/(migration|schema|seed|sql)/i.test(file)) return "Database / Migrations";
    if (/\/(test|spec|__tests__)/i.test(file)) return "Testing";
    if (/\/(style|css|theme|token|design)/i.test(file)) return "Design System";
    if (/\/(asset|image|upload|media|storage|cloudinary)/i.test(file)) return "Asset Management";
    if (/\/(config|setting|env)/i.test(file)) return "Configuration";
    if (/\/(script|tool|util|helper|lib)/i.test(file)) return "Utilities & Scripts";
    if (/\/(doc|readme|guide|changelog)/i.test(file)) return "Documentation";
    if (/\/(onboarding|wizard|tour|welcome)/i.test(file)) return "Onboarding";
    if (/\/(dashboard|admin|metric|analytics)/i.test(file)) return "Admin / Analytics";
    if (/\/(flow|canvas|workflow|pipeline|node)/i.test(file)) return "Workflow Engine";
    return "Other";
  };

  for (const file of files) {
    const area = categorize(file);
    if (!areas[area]) areas[area] = { files: [], signals: new Set() };
    areas[area].files.push(file);
  }

  // Also scan samples for deeper signals
  for (const sample of snapshot.fileSamples) {
    const area = categorize(sample.path);
    if (!areas[area]) continue;
    const e = sample.excerpt.toLowerCase();
    if (e.includes("export default") || e.includes("export function")) areas[area].signals.add("exports");
    if (e.includes("fetch(") || e.includes("axios")) areas[area].signals.add("HTTP calls");
    if (e.includes("usestate") || e.includes("useeffect")) areas[area].signals.add("React state");
    if (e.includes("create table") || e.includes("alter table")) areas[area].signals.add("DDL");
    if (e.includes("rls") || e.includes("row level")) areas[area].signals.add("RLS");
    if (e.includes("stripe")) areas[area].signals.add("Stripe integration");
    if (e.includes("jwt") || e.includes("bearer") || e.includes("getuser")) areas[area].signals.add("JWT auth");
  }

  const sorted = Object.entries(areas)
    .filter(([, v]) => v.files.length > 0)
    .sort((a, b) => b[1].files.length - a[1].files.length);

  if (sorted.length === 0) return "- [NOT FOUND IN CODEBASE]";

  const lines = sorted.map(([area, data]) => {
    const fileList = data.files.slice(0, 5).map((f) => `\`${f}\``).join(", ");
    const extra = data.files.length > 5 ? ` + ${data.files.length - 5} more` : "";
    const signals = data.signals.size > 0 ? ` — signals: ${[...data.signals].join(", ")}` : "";
    return `| **${area}** | ${data.files.length} files | ${fileList}${extra}${signals} |`;
  });

  return `| Feature Area | Files | Key Paths |
|---|---|---|
${lines.join("\n")}`;
}

function detectIntegrationsFromDependencies(
  groups: Record<string, string[]>,
  samples?: Array<{ path: string; excerpt: string }>
): string[] {
  const integrations = new Map<string, string>();
  const depList = Object.values(groups).flat();

  // Dependency-based detection
  const depSignals: Array<[RegExp, string, string]> = [
    [/stripe/i, "Stripe", "Subscription billing, checkout, webhooks"],
    [/supabase/i, "Supabase", "PostgreSQL DB, Auth, Storage"],
    [/openai/i, "OpenAI", "AI completions"],
    [/anthropic/i, "Anthropic", "AI completions (Claude)"],
    [/sentry/i, "Sentry", "Error monitoring"],
    [/cloudinary/i, "Cloudinary", "Image/asset CDN"],
    [/posthog/i, "PostHog", "Product analytics"],
    [/octokit/i, "GitHub (Octokit)", "GitHub API integration"],
    [/resend|sendgrid|nodemailer/i, "Email Service", "Transactional email"],
    [/redis|ioredis|bullmq/i, "Redis", "Caching / job queue"],
    [/twilio/i, "Twilio", "SMS / communications"],
    [/aws-sdk|@aws/i, "AWS", "Cloud infrastructure"],
    [/firebase/i, "Firebase", "Backend-as-a-service"],
    [/deepseek/i, "DeepSeek", "AI completions"],
    [/huggingface/i, "HuggingFace", "AI/ML models"],
    [/mistral/i, "Mistral", "AI completions"],
    [/cohere/i, "Cohere", "AI completions"],
  ];

  for (const dep of depList) {
    for (const [pattern, name, purpose] of depSignals) {
      if (pattern.test(dep)) integrations.set(name, purpose);
    }
  }

  // Code-based detection from samples
  if (samples) {
    for (const sample of samples) {
      const e = sample.excerpt;
      if (/DEEPSEEK_API_KEY|deepseek\.com/i.test(e) && !integrations.has("DeepSeek"))
        integrations.set("DeepSeek", "AI completions (inferred from code)");
      if (/GEMINI_API_KEY|generativelanguage\.googleapis/i.test(e) && !integrations.has("Google Gemini"))
        integrations.set("Google Gemini", "AI completions (inferred from code)");
      if (/TAVILY_API_KEY/i.test(e) && !integrations.has("Tavily"))
        integrations.set("Tavily", "Web search / RAG (inferred from code)");
      if (/BRAVE_SEARCH/i.test(e) && !integrations.has("Brave Search"))
        integrations.set("Brave Search", "Web search (inferred from code)");
      if (/AIMLAPI/i.test(e) && !integrations.has("AimlAPI"))
        integrations.set("AimlAPI", "AI aggregator (inferred from code)");
    }
  }

  return [...integrations.entries()].map(([name, purpose]) => `- **${name}** — ${purpose}`);
}

function detectAiSignals(
  groups: Record<string, string[]>,
  samples: Array<{ path: string; excerpt: string }>
): string {
  const deps = Object.values(groups).flat().filter((dep) =>
    /(openai|anthropic|langchain|huggingface|replicate|deepseek|mistral|cohere|aimlapi)/i.test(dep)
  );
  const lines: string[] = [];

  if (deps.length > 0) {
    lines.push(`**AI dependencies:** ${deps.join(", ")}`);
  }

  // Scan samples for provider implementations, routers, prompt patterns
  const providerFiles = samples.filter((s) =>
    /(provider|router|model|ai|llm|agent|completion|prompt)/i.test(s.path)
  );
  if (providerFiles.length > 0) {
    lines.push(`**AI-related source files:** ${providerFiles.map((s) => `\`${s.path}\``).join(", ")}`);
  }

  // Detect specific patterns
  const patterns: Array<[RegExp, string]> = [
    [/class\s+\w*(Router|Provider|Agent)/i, "Provider/Router architecture"],
    [/streaming|server-sent|SSE|ReadableStream/i, "Streaming completions"],
    [/embedding|vector|semantic.search/i, "Embeddings / vector search"],
    [/prompt.*template|system.*prompt/i, "Prompt templating"],
    [/fallback.*provider|retry.*provider/i, "Multi-provider fallback"],
    [/token.*count|cost.*estimat|usage.*track/i, "Token/cost tracking"],
    [/agent.*catalog|agent.*preset/i, "Agent presets/catalog"],
    [/benchmark|evaluat/i, "Model benchmarking"],
    [/retrieval|rag|search.*context/i, "RAG / retrieval augmentation"],
  ];

  const detectedPatterns = new Set<string>();
  for (const sample of samples) {
    for (const [pattern, label] of patterns) {
      if (pattern.test(sample.excerpt)) detectedPatterns.add(label);
    }
  }
  if (detectedPatterns.size > 0) {
    lines.push(`**Detected patterns:** ${[...detectedPatterns].join(", ")}`);
  }

  if (lines.length === 0) {
    if (samples.some((s) => /prompt|completion|gpt|claude/i.test(s.excerpt))) {
      return "AI-related strings detected in code but no structured AI subsystem found.";
    }
    return "[NOT FOUND IN CODEBASE]";
  }
  return lines.join("\n\n");
}

function detectAuthSignals(
  groups: Record<string, string[]>,
  samples: Array<{ path: string; excerpt: string }>
): string {
  const deps = Object.values(groups).flat().filter((dep) =>
    /(auth|clerk|lucia|next-auth|passport|supabase)/i.test(dep)
  );
  const lines: string[] = [];
  if (deps.length > 0) {
    lines.push(`**Auth libraries:** ${deps.join(", ")}`);
  }

  const authFiles = samples.filter((s) =>
    /(auth|login|signup|register|session|callback|password)/i.test(s.path)
  );
  if (authFiles.length > 0) {
    lines.push(`**Auth-related files:** ${authFiles.map((s) => `\`${s.path}\``).join(", ")}`);
  }

  const methods = new Set<string>();
  for (const sample of samples) {
    const e = sample.excerpt;
    if (/supabase\.auth|getUser|getSession/i.test(e)) methods.add("Supabase Auth (JWT)");
    if (/signInWith(Password|OAuth|Otp)/i.test(e)) methods.add("Email/password + OAuth");
    if (/oauth.*callback|github.*auth/i.test(e)) methods.add("OAuth callback flow");
    if (/ProtectedRoute|GuestRoute|RequireAuth/i.test(e)) methods.add("Route guards");
    if (/RLS|row.level.security/i.test(e)) methods.add("Row-Level Security");
    if (/Bearer|authorization.*header/i.test(e)) methods.add("Bearer token verification");
    if (/password.*reset|forgot.*password/i.test(e)) methods.add("Password reset flow");
  }
  if (methods.size > 0) {
    lines.push(`**Auth methods:** ${[...methods].join(", ")}`);
  }

  if (lines.length === 0) {
    if (samples.some((s) => /login|session|token|auth/i.test(s.excerpt))) {
      return "Auth-related code paths detected in sampled files.";
    }
    return "[NOT FOUND IN CODEBASE]";
  }
  return lines.join("\n\n");
}

function detectDesignSignals(
  samples: Array<{ path: string; excerpt: string }>,
  configFiles: string[],
  dependencyGroups?: Record<string, string[]>
): string {
  const lines: string[] = [];
  const deps = dependencyGroups ? Object.values(dependencyGroups).flat() : [];

  // CSS framework
  if (configFiles.some((f) => /tailwind/i.test(f)) || deps.some((d) => /tailwindcss/i.test(d))) {
    lines.push("**CSS framework:** Tailwind CSS");
  }
  if (deps.some((d) => /framer-motion/i.test(d))) lines.push("**Animation:** Framer Motion");
  if (deps.some((d) => /radix-ui/i.test(d))) lines.push("**Primitives:** Radix UI");
  if (deps.some((d) => /lucide|heroicons|phosphor/i.test(d))) lines.push("**Icons:** Icon library detected");

  // Component patterns
  const uiFiles = samples.filter((s) =>
    /(component|modal|button|panel|layout|toast|form|card|badge|meter)/i.test(s.path)
  );
  if (uiFiles.length > 0) {
    lines.push(`**UI component files (${uiFiles.length}):** ${uiFiles.slice(0, 8).map((s) => `\`${s.path}\``).join(", ")}${uiFiles.length > 8 ? " + more" : ""}`);
  }

  // Design tokens / theme
  const tokenFiles = samples.filter((s) =>
    /(token|theme|design-system|palette|color)/i.test(s.path)
  );
  if (tokenFiles.length > 0) {
    lines.push(`**Design token / theme files:** ${tokenFiles.map((s) => `\`${s.path}\``).join(", ")}`);
  }

  // Storybook
  if (deps.some((d) => /storybook/i.test(d)) || configFiles.some((f) => /storybook/i.test(f))) {
    lines.push("**Component documentation:** Storybook");
  }

  // Dark mode
  if (samples.some((s) => /darkMode|dark.*theme|theme.*dark|class.*dark/i.test(s.excerpt))) {
    lines.push("**Dark mode:** Supported");
  }

  if (lines.length === 0) {
    if (samples.some((s) => /className|style|css/i.test(s.excerpt))) {
      return "UI styling detected in source files but no structured design system found.";
    }
    return "[NOT FOUND IN CODEBASE]";
  }
  return lines.join("\n\n");
}

function detectBillingSignals(
  groups: Record<string, string[]>,
  samples: Array<{ path: string; excerpt: string }>
): string {
  const deps = Object.values(groups).flat().filter((dep) => /(stripe|paypal|billing|paddle)/i.test(dep));
  const lines: string[] = [];

  if (deps.length > 0) {
    lines.push(`**Payment libraries:** ${deps.join(", ")}`);
  }

  const billingFiles = samples.filter((s) =>
    /(billing|checkout|subscription|payment|stripe|pricing|webhook|invoice)/i.test(s.path)
  );
  if (billingFiles.length > 0) {
    lines.push(`**Billing-related files:** ${billingFiles.map((s) => `\`${s.path}\``).join(", ")}`);
  }

  const signals = new Set<string>();
  for (const sample of samples) {
    const e = sample.excerpt;
    if (/checkout.*session|createCheckout/i.test(e)) signals.add("Checkout flow");
    if (/webhook.*event|constructEvent/i.test(e)) signals.add("Webhook handling");
    if (/customer.*portal/i.test(e)) signals.add("Customer portal");
    if (/subscription.*status|cancel.*subscription/i.test(e)) signals.add("Subscription lifecycle");
    if (/idempoten|webhook_events/i.test(e)) signals.add("Idempotent webhook processing");
    if (/tier|plan.*limit|feature.*gate/i.test(e)) signals.add("Tier-based feature gating");
    if (/free|pro|team|enterprise/i.test(e) && /plan|tier|pricing/i.test(e)) signals.add("Multi-tier pricing");
  }
  if (signals.size > 0) {
    lines.push(`**Billing patterns:** ${[...signals].join(", ")}`);
  }

  if (lines.length === 0) {
    if (samples.some((s) => /pricing|subscription|plan/i.test(s.excerpt))) {
      return "Pricing or plan strings detected in sampled files.";
    }
    return "[NOT FOUND IN CODEBASE]";
  }
  return lines.join("\n\n");
}

function formatCommands(commands: RepoSnapshot["commands"]): string {
  const lines = [
    commands.test ? `- Test: \`${commands.test}\`` : "- Test: [NOT FOUND IN CODEBASE]",
    commands.lint ? `- Lint: \`${commands.lint}\`` : "- Lint: [NOT FOUND IN CODEBASE]",
    commands.build ? `- Build: \`${commands.build}\`` : "- Build: [NOT FOUND IN CODEBASE]",
    commands.typecheck ? `- Typecheck: \`${commands.typecheck}\`` : "- Typecheck: [NOT FOUND IN CODEBASE]",
  ];
  return lines.join("\n");
}

export function updateOnboardingArtifacts(
  project: Project,
  input: {
    actor?: string;
    profileContent?: string;
    expectationsContent?: string;
    approveProfile?: boolean;
    approveExpectations?: boolean;
    activate?: boolean;
    notes?: string;
  }
): Project {
  const actor = input.actor?.trim() || "dashboard";
  const now = new Date().toISOString();
  const decisionHistory = [...(project.decisionHistory ?? [])];
  const onboardingEvents = [...(project.onboardingState?.events ?? [])];
  let nextProfile = project.profile ?? {};
  let nextExpectations = project.expectations ?? {};
  let nextStatus = project.status ?? "draft";
  const onboardingState: OnboardingState = {
    stage: project.onboardingState?.stage ?? "operator_review",
    reviewRequired: true,
    updatedAt: now,
    ...project.onboardingState,
  };

  if (typeof input.profileContent === "string") {
    const previous = nextProfile.draft ?? nextProfile.active;
    nextProfile = {
      ...nextProfile,
      draft: {
        version: (previous?.version ?? 0) + 1,
        status: "draft",
        content: input.profileContent,
        generatedAt: now,
        source: "manual",
      },
    };
    const draftVersion = nextProfile.draft?.version ?? previous?.version ?? 1;
    const event = makeDecisionEvent(actor, "profile_edited", "profile", {
      notes: input.notes,
      before: { version: previous?.version },
      after: { version: draftVersion },
    });
    decisionHistory.push(event);
    onboardingEvents.push(event);
  }

  if (typeof input.expectationsContent === "string") {
    const previous = nextExpectations.draft ?? nextExpectations.active;
    nextExpectations = {
      ...nextExpectations,
      draft: {
        version: (previous?.version ?? 0) + 1,
        status: "draft",
        content: input.expectationsContent,
        generatedAt: now,
        source: "manual",
      },
    };
    const draftVersion = nextExpectations.draft?.version ?? previous?.version ?? 1;
    const event = makeDecisionEvent(actor, "expectations_edited", "expectations", {
      notes: input.notes,
      before: { version: previous?.version },
      after: { version: draftVersion },
    });
    decisionHistory.push(event);
    onboardingEvents.push(event);
  }

  if (input.approveProfile && nextProfile.draft) {
    const approvedDraft = nextProfile.draft;
    nextProfile = {
      ...nextProfile,
      active: { ...approvedDraft, status: "active" },
    };
    onboardingState.profileApprovedAt = now;
    const activeVersion = nextProfile.active?.version ?? approvedDraft.version;
    const event = makeDecisionEvent(actor, "profile_approved", "profile", {
      notes: input.notes,
      after: { version: activeVersion },
    });
    decisionHistory.push(event);
    onboardingEvents.push(event);
  }

  if (input.approveExpectations && nextExpectations.draft) {
    const approvedDraft = nextExpectations.draft;
    nextExpectations = {
      ...nextExpectations,
      active: { ...approvedDraft, status: "active" },
    };
    onboardingState.expectationsApprovedAt = now;
    const activeVersion =
      nextExpectations.active?.version ?? approvedDraft.version;
    const event = makeDecisionEvent(actor, "expectations_approved", "expectations", {
      notes: input.notes,
      after: { version: activeVersion },
    });
    decisionHistory.push(event);
    onboardingEvents.push(event);
  }

  if (input.activate) {
    if (!nextProfile.active || !nextExpectations.active) {
      throw new Error("Profile and expectations must both be approved before activation");
    }
    nextStatus = "active";
    onboardingState.stage = "completed";
    onboardingState.reviewRequired = false;
    onboardingState.activatedAt = now;
    const event = makeDecisionEvent(actor, "project_activated", "project", {
      notes: input.notes,
    });
    decisionHistory.push(event);
    onboardingEvents.push(event);
  } else {
    onboardingState.stage = "operator_review";
    onboardingState.reviewRequired = true;
  }

  onboardingState.updatedAt = now;
  onboardingState.events = onboardingEvents;

  return {
    ...project,
    profile: nextProfile,
    expectations: nextExpectations,
    status: nextStatus,
    onboardingState,
    decisionHistory,
    lastUpdated: now,
  };
}

export function summarizeAuditDecision(
  actor: string,
  eventType: string,
  targetType: DecisionEvent["target_type"],
  args: {
    auditKind?: AuditKind;
    scopeType?: DecisionEvent["scope_type"];
    scopePaths?: string[];
    notes?: string;
    before?: Record<string, unknown>;
    after?: Record<string, unknown>;
  }
): DecisionEvent {
  return makeDecisionEvent(actor, eventType, targetType, {
    notes: args.notes,
    audit_kind: args.auditKind,
    scope_type: args.scopeType,
    scope_paths: args.scopePaths,
    before: args.before,
    after: args.after,
  });
}

// ── Cluster-Aware Onboarding Utilities ─────────────────────────────────────────

export async function collectGitHistory(repoPath: string): Promise<string> {
  try {
    const log = execFileSync("git", ["-C", repoPath, "log", "-n", "100", "--oneline", "--stat"], {
      encoding: "utf8",
      stdio: "pipe",
    });
    return log.slice(0, 15000);
  } catch (e) {
    return "Git history unavailable: " + (e instanceof Error ? e.message : String(e));
  }
}

export async function collectDependencyManifest(repoPath: string): Promise<string> {
  const pkgPath = join(repoPath, "package.json");
  if (!existsSync(pkgPath)) return "No package.json found.";
  try {
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    return JSON.stringify(deps, null, 2);
  } catch (e) {
    return "Failed to parse dependencies.";
  }
}

export async function generateModuleManifest(repoPath: string): Promise<Record<string, unknown>> {
  const tree = describeTopLevel(repoPath);
  return {
    revision: "v1-onboarding",
    generated_at: new Date().toISOString(),
    source_root: repoPath,
    exhaustiveness: "exhaustive",
    modules: tree.map((t) => ({
      name: t.path,
      path: t.path,
      description: t.note,
      complexity: "medium",
      dependencies: [],
    })),
    domains: [],
  };
}

export async function generateCssTokenMap(repoPath: string): Promise<string> {
  const out = [];
  const candidates = [
    "tailwind.config.js",
    "tailwind.config.ts",
    "globals.css",
    "src/globals.css",
    "src/index.css",
    "styles/globals.css",
    "src/styles/globals.css" // Added based on Lyra project structure
  ];
  for (const f of candidates) {
    const p = join(repoPath, f);
    if (existsSync(p)) {
      out.push(`--- ${f} ---\n` + readFileSync(p, "utf8").slice(0, 3000));
    }
  }
  return out.length > 0 ? out.join("\n\n") : "No standard CSS token maps found.";
}
