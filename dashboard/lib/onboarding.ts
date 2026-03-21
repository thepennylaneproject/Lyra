import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, extname, join, resolve } from "node:path";
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

const MAX_SAMPLE_FILES = 40;
const MAX_FILE_PREVIEW = 2400;

export interface OnboardRepositoryInput {
  name?: string;
  repository_url?: string;
  local_path?: string;
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
  const local = input.local_path?.trim();
  if (local) return basename(local);
  throw new Error("Project name, repository_url, or local_path is required");
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
  const local = input.local_path?.trim();
  if (local) {
    const full = resolve(local);
    if (!existsSync(full) || !statSync(full).isDirectory()) {
      throw new Error(`Local path does not exist: ${full}`);
    }
    return {
      path: full,
      sourceType: "local_path",
      sourceRef: full,
      repositoryUrl: input.repository_url?.trim() || undefined,
    };
  }

  const repoUrl = input.repository_url?.trim();
  if (!repoUrl) {
    throw new Error("repository_url or local_path is required");
  }

  const target = mkdtempSync(join(tmpdir(), "lyra-onboard-"));
  try {
    execFileSync("git", ["clone", "--depth", "1", repoUrl, target], {
      stdio: "pipe",
      encoding: "utf8",
      timeout: 60_000,
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
${snapshot.configFiles.filter((file) => /api|route|server/i.test(file)).map((file) => `- \`${file}\``).join("\n") || "[NOT FOUND IN CODEBASE]"}

### 7. External Service Integrations
${detectIntegrationsFromDependencies(snapshot.dependencyGroups).join("\n") || "[NOT FOUND IN CODEBASE]"}

### 8. AI/ML Components
${detectAiSignals(snapshot.dependencyGroups, snapshot.fileSamples)}

### 9. Authentication and Authorization Model
${detectAuthSignals(snapshot.dependencyGroups, snapshot.fileSamples)}

### 10. Environment Variables
${snapshot.envVars.length > 0 ? snapshot.envVars.map((name) => `- ${name}`).join("\n") : "[NOT FOUND IN CODEBASE]"}

## SECTION 3: FEATURE INVENTORY

This foundation pass records implementation signals from files rather than claiming a complete feature inventory.
${snapshot.fileSamples.map((sample) => `- \`${sample.path}\` suggests active implementation scope`).join("\n") || "- [NOT FOUND IN CODEBASE]"}

## SECTION 4: DESIGN SYSTEM & BRAND

${detectDesignSignals(snapshot.fileSamples, snapshot.configFiles)}

## SECTION 5: DATA & SCALE SIGNALS

- Test files found: ${snapshot.testFiles.length}
- Deployment/config files: ${snapshot.configFiles.length}
- File count scanned: ${snapshot.fileCount}

## SECTION 6: MONETIZATION & BUSINESS LOGIC

${detectBillingSignals(snapshot.dependencyGroups, snapshot.fileSamples)}

## SECTION 7: CODE QUALITY & MATURITY SIGNALS

- Config files: ${snapshot.configFiles.join(", ") || "[NOT FOUND IN CODEBASE]"}
- Tests present: ${snapshot.testFiles.length > 0 ? "yes" : "no"}
- Default commands: ${formatCommands(snapshot.commands)}

## SECTION 8: ECOSYSTEM CONNECTIONS

${snapshot.repositoryUrl ? `- Primary repository: ${snapshot.repositoryUrl}` : "[NOT FOUND IN CODEBASE]"}

## SECTION 9: WHAT'S MISSING (CRITICAL)

- Production gaps: ${snapshot.profileSummary.status === "production" ? "Review still required for scale readiness." : "Deployment, reliability, and runtime validation should be reviewed before production use."}
- Investor readiness gaps: metrics, growth evidence, and operations documentation are not inferred automatically.
- Codebase gaps: this profile is generated from direct repository inspection and flags missing data explicitly.
- Recommended next steps:
  1. Review and tighten the generated expectations document.
  2. Confirm scan roots and commands before activating audits.
  3. Run a scoped full audit after activation.
  4. Add or verify deployment and environment documentation.
  5. Capture operator decisions so Lyra can calibrate future audits.

## SECTION 10: EXECUTIVE SUMMARY

${snapshot.projectName} appears to be a ${snapshot.profileSummary.status ?? "working"} codebase oriented around ${snapshot.frameworks[0] ?? snapshot.languages[0] ?? "a custom stack"}. This summary is generated only from repository evidence and marks missing data explicitly.

The codebase shows technical signals through ${snapshot.configFiles.slice(0, 4).join(", ") || "its source tree"} and ${snapshot.testFiles.length > 0 ? `${snapshot.testFiles.length} test files` : "no detected test suite"}. Commands and stack metadata have been captured for future audits.

The next milestone is to review the generated profile and expectations, activate the project, and run scoped audits against the stored scan roots. That will turn this from imported metadata into an auditable Lyra project.

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
      if (name === ".git" || name === "node_modules" || name === "dist" || name === "build" || name === ".next") continue;
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

function sampleFiles(files: string[], root: string): Array<{ path: string; excerpt: string }> {
  const picked = files.filter((file) => TEXT_EXTENSIONS.has(extname(file).toLowerCase())).slice(0, MAX_SAMPLE_FILES);
  return picked.map((file) => {
    const text = readTextIfExists(join(root, file));
    return {
      path: file,
      excerpt: text.slice(0, MAX_FILE_PREVIEW) || "(empty file)",
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

function extractUrls(files: string[], root: string): string[] {
  const urls = new Set<string>();
  for (const file of files.slice(0, 100)) {
    const text = readTextIfExists(join(root, file));
    for (const match of text.matchAll(/https?:\/\/[^\s'")]+/g)) {
      urls.add(match[0]);
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

function detectIntegrationsFromDependencies(groups: Record<string, string[]>): string[] {
  const integrations = new Set<string>();
  for (const dep of Object.values(groups).flat()) {
    if (/stripe/i.test(dep)) integrations.add("- Stripe");
    if (/supabase/i.test(dep)) integrations.add("- Supabase");
    if (/openai/i.test(dep)) integrations.add("- OpenAI");
    if (/anthropic/i.test(dep)) integrations.add("- Anthropic");
    if (/sentry/i.test(dep)) integrations.add("- Sentry");
  }
  return [...integrations];
}

function detectAiSignals(
  groups: Record<string, string[]>,
  samples: Array<{ path: string; excerpt: string }>
): string {
  const deps = Object.values(groups).flat().filter((dep) => /(openai|anthropic|langchain|huggingface|replicate)/i.test(dep));
  if (deps.length > 0) {
    return `Dependencies indicate AI integration: ${deps.join(", ")}`;
  }
  if (samples.some((sample) => /prompt|completion|embedding|gpt/i.test(sample.excerpt))) {
    return "Prompt or model-related strings detected in sampled files.";
  }
  return "[NOT FOUND IN CODEBASE]";
}

function detectAuthSignals(
  groups: Record<string, string[]>,
  samples: Array<{ path: string; excerpt: string }>
): string {
  const deps = Object.values(groups).flat().filter((dep) => /(auth|clerk|lucia|next-auth|passport)/i.test(dep));
  if (deps.length > 0) {
    return `Authentication libraries detected: ${deps.join(", ")}`;
  }
  if (samples.some((sample) => /login|session|token|auth/i.test(sample.excerpt))) {
    return "Auth-related code paths detected in sampled files.";
  }
  return "[NOT FOUND IN CODEBASE]";
}

function detectDesignSignals(
  samples: Array<{ path: string; excerpt: string }>,
  configFiles: string[]
): string {
  if (configFiles.some((file) => /tailwind/i.test(file))) {
    return "Tailwind or design-token style configuration detected.";
  }
  if (samples.some((sample) => /color|font|theme|className/i.test(sample.excerpt))) {
    return "UI styling signals detected in sampled files.";
  }
  return "[NOT FOUND IN CODEBASE]";
}

function detectBillingSignals(
  groups: Record<string, string[]>,
  samples: Array<{ path: string; excerpt: string }>
): string {
  const deps = Object.values(groups).flat().filter((dep) => /(stripe|paypal|billing)/i.test(dep));
  if (deps.length > 0) {
    return `Billing libraries detected: ${deps.join(", ")}`;
  }
  if (samples.some((sample) => /pricing|subscription|plan/i.test(sample.excerpt))) {
    return "Pricing or plan strings detected in sampled files.";
  }
  return "[NOT FOUND IN CODEBASE]";
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
