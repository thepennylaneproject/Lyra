import { readFileSync, existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type pg from "pg";
import {
  buildCodeContextForAudit,
  readExpectations,
  resolveScopeFiles,
  type AuditScope,
} from "./context.js";
import { auditWithLlm } from "./llm.js";
import {
  claimJob,
  completeJob,
  loadProject,
  saveProject,
  saveProjectManifest,
  listAllProjects,
  upsertMaintenanceBacklogFromFindings,
} from "./db.js";
import {
  buildProjectManifest,
  resolveScopePathsFromManifest,
  summarizeCoverageFromManifest,
  type ProjectManifest,
} from "./manifest.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

function repoRoot(): string {
  const env = process.env.LYRA_REPO_ROOT?.trim();
  if (env && existsSync(env)) return env;
  return join(__dirname, "..", "..");
}

function loadPrompts(): { core: string; auditAgent: string } {
  const root = repoRoot();
  const corePath = join(root, "core_system_prompt.md");
  const auditPath = join(root, "audits", "prompts", "audit-agent.md");
  if (!existsSync(corePath)) {
    throw new Error(`core_system_prompt.md not found at ${corePath}`);
  }
  const core = readFileSync(corePath, "utf-8");
  const auditAgent = existsSync(auditPath)
    ? readFileSync(auditPath, "utf-8")
    : "";
  console.log(`[lyra-worker] prompts loaded: core=${corePath} audit=${auditPath || "(missing)"}`);
  return { core, auditAgent };
}

const ACTIVE_FINDING_STATUSES = new Set([
  "open",
  "accepted",
  "in_progress",
]);

interface StoredProject {
  name: string;
  findings: unknown[];
  status?: string;
  repositoryUrl?: string;
  sourceType?: string;
  sourceRef?: string;
  repoAccess?: {
    localPath?: string;
    cloneRef?: string;
    mirrorPath?: string;
  };
  auditConfig?: {
    defaultBranch?: string;
    scanRoots?: string[];
    entrypoints?: string[];
    checklistId?: string;
  };
  manifest?: Record<string, unknown>;
  expectations?: {
    active?: { content?: string };
    draft?: { content?: string };
  };
  decisionHistory?: Array<Record<string, unknown>>;
}

const PORTFOLIO_SCAN_DIRS: Record<string, string> = {
  Advocera: "the_penny_lane_project/Advocera",
  Codra: "the_penny_lane_project/Codra",
  FounderOS: "the_penny_lane_project/FounderOS",
  Mythos: "the_penny_lane_project/Mythos",
  Passagr: "the_penny_lane_project/Passagr",
  Relevnt: "the_penny_lane_project/Relevnt",
  embr: "the_penny_lane_project/embr",
  ready: "the_penny_lane_project/ready",
  Dashboard: "the_penny_lane_project/dashboard",
  "Restoration Project": "the_penny_lane_project/restoration-project",
  "sarahsahl.pro": "the_penny_lane_project/sarahsahl_pro",
};

function mergeFindings2(
  existing: Array<Record<string, unknown>>,
  incoming: Array<Record<string, unknown>>,
  repoRevision?: string
): { merged: Array<Record<string, unknown>>; added: number } {
  const byId = new Map<string, Record<string, unknown>>();
  const now = new Date().toISOString();
  for (const f of existing) {
    const id = String(f.finding_id ?? "");
    if (id) byId.set(id, { ...f });
  }
  let added = 0;
  const incomingIds = new Set<string>();
  for (const f of incoming) {
    const id = String(f.finding_id ?? "");
    if (!id) continue;
    incomingIds.add(id);
    if (!byId.has(id)) {
      byId.set(id, {
        ...f,
        status: f.status ?? "open",
        first_seen_at: f.first_seen_at ?? now,
        last_seen_at: now,
        last_seen_revision: repoRevision ?? f.last_seen_revision,
      });
      added++;
    } else {
      // Upsert audit content fields but preserve local workflow state
      const old = byId.get(id)!;
      byId.set(id, {
        ...old,
        ...f,
        finding_id: id,
        // Preserve workflow fields from existing record
        status: old.status ?? f.status ?? "open",
        history: old.history ?? f.history,
        first_seen_at: old.first_seen_at ?? now,
        last_seen_at: now,
        last_seen_revision: repoRevision ?? old.last_seen_revision ?? f.last_seen_revision,
      });
    }
  }
  // QA-001: Resolve stale active findings that the LLM no longer reports.
  // Only do this when the re-audit actually produced findings; an empty
  // incoming set more likely indicates an audit/LLM failure than every issue
  // being fixed, so we leave existing findings untouched in that case.
  if (existing.length > 0 && incoming.length > 0) {
    for (const [id, f] of byId) {
      if (
        !incomingIds.has(id) &&
        ACTIVE_FINDING_STATUSES.has(String(f.status ?? ""))
      ) {
        byId.set(id, { ...f, status: "fixed_verified" });
      }
    }
  }
  return { merged: [...byId.values()], added };
}

interface AuditPassResult {
  findings: Array<Record<string, unknown>>;
  coverage: {
    coverage_complete: boolean;
    confidence: string;
    checklist_id?: string;
    known_findings_referenced: string[];
    files_reviewed: string[];
    modules_reviewed: string[];
    checklist_passed?: number;
    checklist_total?: number;
    incomplete_reason?: string;
  };
  raw_response: string;
}

interface ProjectAuditExecution {
  repoRoot: string;
  cleanup?: () => void;
  manifest: ProjectManifest;
  scope: AuditScope;
  manifestRevision: string;
  checklistId: string;
}

function inferRepairPolicy(finding: Record<string, unknown>): Record<string, unknown> {
  const category = String(finding.category ?? "").toLowerCase();
  const severity = String(finding.severity ?? "minor").toLowerCase();
  const highRisk =
    severity === "blocker" ||
    category.includes("auth") ||
    category.includes("billing") ||
    category.includes("migration") ||
    category.includes("privacy") ||
    category.includes("queue") ||
    category.includes("security");
  const lowRisk =
    category.includes("dead") ||
    category.includes("config") ||
    category.includes("type") ||
    category.includes("guard") ||
    category.includes("doc");
  return {
    autofix_eligibility: highRisk ? "manual_only" : lowRisk ? "eligible" : "suggest_only",
    risk_class: highRisk ? "high" : lowRisk ? "low" : "medium",
    verification_profile: highRisk ? "manual" : "targeted",
    approval_required: highRisk,
  };
}

function findingPaths(findings: Array<Record<string, unknown>>): string[] {
  const paths = new Set<string>();
  for (const finding of findings) {
    const hooks = Array.isArray(finding.proof_hooks)
      ? (finding.proof_hooks as Array<Record<string, unknown>>)
      : [];
    for (const hook of hooks) {
      if (typeof hook.file === "string" && hook.file.trim()) {
        paths.add(hook.file.trim());
      }
    }
    const fix = finding.suggested_fix;
    if (fix && typeof fix === "object" && Array.isArray((fix as Record<string, unknown>).affected_files)) {
      for (const value of (fix as Record<string, unknown>).affected_files as unknown[]) {
        if (typeof value === "string" && value.trim()) paths.add(value.trim());
      }
    }
  }
  return [...paths];
}

function knownFindingIds(findings: Array<Record<string, unknown>>): string[] {
  return findings
    .map((finding) => String(finding.finding_id ?? "").trim())
    .filter(Boolean);
}

function normalizeScopePaths(
  repoRootPath: string,
  scanRoots: string[],
  scope: AuditScope,
  manifest: ProjectManifest
): string[] {
  if (scope.scopeType === "diff") {
    return resolveScopeFiles(repoRootPath, scanRoots, scope, 1000)
      .map((fullPath) => fullPath.replace(repoRootPath + "/", ""));
  }
  const resolved = resolveScopePathsFromManifest(manifest, scope);
  return resolved.length > 0 ? resolved : manifest.modules.map((mod) => mod.path);
}

function buildDomainPasses(
  repoRootPath: string,
  scanRoots: string[],
  manifest: ProjectManifest,
  scope: AuditScope
): Array<{ label: string; files: string[] }> {
  const chunkSize = 8;
  const scopeType = scope.scopeType ?? "project";
  const requestedFiles = normalizeScopePaths(repoRootPath, scanRoots, scope, manifest);
  if (scopeType === "project") {
    const grouped = new Map<string, string[]>();
    for (const mod of manifest.modules) {
      const current = grouped.get(mod.domain) ?? [];
      current.push(mod.path);
      grouped.set(mod.domain, current);
    }
    return [...grouped.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .flatMap(([domain, files]) => {
        const passes: Array<{ label: string; files: string[] }> = [];
        for (let idx = 0; idx < files.length; idx += chunkSize) {
          const chunk = files.slice(idx, idx + chunkSize);
          passes.push({
            label:
              files.length > chunkSize
                ? `domain:${domain}#${Math.floor(idx / chunkSize) + 1}`
                : `domain:${domain}`,
            files: chunk,
          });
        }
        return passes;
      });
  }
  const passes: Array<{ label: string; files: string[] }> = [];
  for (let idx = 0; idx < requestedFiles.length; idx += chunkSize) {
    passes.push({
      label:
        scopeType === "domain"
          ? `domain:${scope.scopePaths?.join(", ") ?? "selected"}#${Math.floor(idx / chunkSize) + 1}`
          : `${scopeType}:selected#${Math.floor(idx / chunkSize) + 1}`,
      files: requestedFiles.slice(idx, idx + chunkSize),
    });
  }
  return passes;
}

async function executeProjectAudit(
  project: StoredProject,
  payload: Record<string, unknown>,
  pool: pg.Pool
): Promise<ProjectAuditExecution> {
  const repoAccess = resolveProjectRepo(
    project,
    typeof payload.repo_ref === "string" ? payload.repo_ref : undefined
  );
  const scope = scopeFromPayload(payload, project);
  const checklistId =
    typeof payload.checklist_id === "string"
      ? payload.checklist_id
      : project.auditConfig?.checklistId ?? "lyra-bounded-audit-v1";
  const manifest = buildProjectManifest(
    repoAccess.repoRoot,
    project.auditConfig?.scanRoots ?? ["./"],
    project.auditConfig?.entrypoints ?? [],
    checklistId
  );
  manifest.domains = summarizeCoverageFromManifest(
    manifest,
    [],
    [],
    manifest.generated_at
  );
  await saveProjectManifest(pool, {
    projectName: project.name,
    repoRevision: manifest.revision,
    sourceRoot: manifest.source_root,
    checklistId: manifest.checklist_id,
    exhaustiveness: manifest.exhaustiveness,
    manifest: manifest as unknown as Record<string, unknown>,
  });
  return {
    repoRoot: repoAccess.repoRoot,
    cleanup: repoAccess.cleanup,
    manifest,
    scope,
    manifestRevision: manifest.revision,
    checklistId,
  };
}

export async function processJob(pool: pg.Pool, dbJobId: string): Promise<void> {
  const job = await claimJob(pool, dbJobId);
  if (!job) {
    console.log(`[lyra-worker] skip job ${dbJobId} (not queued or done)`);
    return;
  }

  let core: string;
  let auditAgent: string;
  const payload = job.payload || {};
  const visualOnly = Boolean(payload.visual_only);

  try {
    ({ core, auditAgent } = loadPrompts());
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[lyra-worker] job ${dbJobId} prep failed`, e);
    try {
      await completeJob(pool, dbJobId, msg, {
        job_type: job.job_type,
        project_name: job.project_name,
        summary: `Failed (setup): ${msg.slice(0, 200)}`,
        findings_added: 0,
      });
    } catch (ce) {
      console.error(`[lyra-worker] completeJob after prep failure`, ce);
    }
    return;
  }

  try {
    if (job.job_type === "synthesize_project") {
      await runSynthesize(pool, job, core, auditAgent);
      return;
    }
    let totalAdded = 0;
    const summaries: string[] = [];
    const projectAuditDetails: Array<Record<string, unknown>> = [];
    let auditModel = "unknown";
    let jobCoverageComplete = true;
    let jobConfidence: string | null = "high";
    let jobManifestRevision: string | null = job.manifest_revision ?? null;
    let jobChecklistId: string | null = job.checklist_id ?? null;
    const projects = await resolveProjectsForJob(pool, job.project_name);

    for (const project of projects) {
      if ((project.status ?? "active") !== "active") {
        throw new Error(`Project "${project.name}" is not active and cannot be audited`);
      }
      const execution = await executeProjectAudit(project, payload, pool);
      try {
        jobManifestRevision = execution.manifestRevision;
        jobChecklistId = execution.checklistId;
        const expectations = readProjectExpectations(project, execution.repoRoot);
        const prev = await loadProject(pool, project.name);
        const existing = (prev?.findings ?? []) as Array<Record<string, unknown>>;
        const scanRoots = project.auditConfig?.scanRoots ?? ["./"];
        const passes = buildDomainPasses(
          execution.repoRoot,
          scanRoots,
          execution.manifest,
          execution.scope
        );
        const passResults: AuditPassResult[] = [];
        let findings: Array<Record<string, unknown>> = [];

        for (const pass of passes) {
          const passScope: AuditScope = {
            ...execution.scope,
            files: pass.files,
            scopePaths: pass.files,
            maxFiles:
              typeof payload.max_files === "number"
                ? payload.max_files
                : Math.max(pass.files.length, 1),
          };
          const code = buildCodeContextForAudit(
            execution.repoRoot,
            scanRoots,
            passScope
          );
          const llm = await auditWithLlm(
            core,
            auditAgent,
            expectations,
            code,
            project.name,
            visualOnly,
            typeof payload.audit_kind === "string" ? payload.audit_kind : undefined,
            {
              scopeLabel: pass.label,
              filesInScope: pass.files,
              knownFindingIds: knownFindingIds(existing),
              checklistId: execution.checklistId,
              manifestRevision: execution.manifestRevision,
            }
          );
          auditModel = llm.model || auditModel;
          const mappedFindings = llm.findings.map((finding) => ({
            ...finding,
            repair_policy: inferRepairPolicy(finding as unknown as Record<string, unknown>),
          }));
          passResults.push({
            findings: mappedFindings,
            coverage: {
              coverage_complete: Boolean(llm.coverage.coverage_complete),
              confidence: llm.coverage.confidence ?? "medium",
              checklist_id: llm.coverage.checklist_id,
              known_findings_referenced: llm.coverage.known_findings_referenced ?? [],
              files_reviewed:
                (llm.coverage.files_reviewed?.length ?? 0) > 0
                  ? llm.coverage.files_reviewed ?? []
                  : pass.files,
              modules_reviewed:
                (llm.coverage.modules_reviewed?.length ?? 0) > 0
                  ? llm.coverage.modules_reviewed ?? []
                  : pass.files,
              checklist_passed: llm.coverage.checklist_passed,
              checklist_total: llm.coverage.checklist_total,
              incomplete_reason: llm.coverage.incomplete_reason,
            },
            raw_response: llm.raw_response,
          });
          findings = findings.concat(mappedFindings as Array<Record<string, unknown>>);
        }

        const { merged, added } = mergeFindings2(existing, findings, execution.manifestRevision);
        totalAdded += added;
        const reviewedFiles = [...new Set(passResults.flatMap((result) => result.coverage.files_reviewed))];
        const coverageComplete = passResults.every((result) => result.coverage.coverage_complete);
        const confidence =
          passResults.some((result) => result.coverage.confidence === "low")
            ? "low"
            : passResults.some((result) => result.coverage.confidence === "medium")
              ? "medium"
              : "high";
        jobCoverageComplete = jobCoverageComplete && coverageComplete;
        jobConfidence =
          jobConfidence === "low" || confidence === "low"
            ? "low"
            : jobConfidence === "medium" || confidence === "medium"
              ? "medium"
              : "high";
        const coverageDomains = summarizeCoverageFromManifest(
          execution.manifest,
          reviewedFiles,
          findingPaths(findings),
          new Date().toISOString()
        );
        const decisionHistory = Array.isArray(prev?.decisionHistory)
          ? [...(prev?.decisionHistory as Array<Record<string, unknown>>)]
          : [];
        decisionHistory.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          timestamp: new Date().toISOString(),
          actor: "worker",
          event_type: "audit_run_completed",
          target_type: "audit",
          audit_kind: String(payload.audit_kind ?? (visualOnly ? "visual" : "full")),
          scope_type: String(execution.scope.scopeType ?? "project"),
          scope_paths: execution.scope.scopePaths ?? [],
          model: auditModel,
          before: { findings: existing.length },
          after: {
            findings: merged.length,
            coverage_complete: coverageComplete,
            manifest_revision: execution.manifestRevision,
          },
        });
        // Spread prev to preserve all project fields (stack, repositoryUrl, etc.)
        await saveProject(pool, {
          ...(prev ?? {}),
          name: project.name,
          findings: merged,
          manifest: {
            ...execution.manifest,
            domains: coverageDomains,
          },
          decisionHistory,
          lastUpdated: new Date().toISOString(),
        });
        try {
          await upsertMaintenanceBacklogFromFindings(pool, project.name, merged);
        } catch (maintenanceError) {
          console.warn(
            `[lyra-worker] maintenance backlog sync skipped for ${project.name}: ${
              maintenanceError instanceof Error ? maintenanceError.message : String(maintenanceError)
            }`
          );
        }
        summaries.push(
          `${project.name}: +${added} findings, ${coverageComplete ? "coverage complete" : "coverage partial"}`
        );
        projectAuditDetails.push({
          project: project.name,
          scope_type: execution.scope.scopeType ?? "project",
          scope_paths: execution.scope.scopePaths ?? [],
          scan_roots: scanRoots,
          findings_returned: findings.length,
          findings_added: added,
          manifest_revision: execution.manifestRevision,
          checklist_id: execution.checklistId,
          coverage_complete: coverageComplete,
          completion_confidence: confidence,
          known_finding_ids: knownFindingIds(existing),
          files_in_scope: normalizeScopePaths(
            execution.repoRoot,
            scanRoots,
            execution.scope,
            execution.manifest
          ),
          files_reviewed: reviewedFiles,
          known_findings_referenced: [
            ...new Set(
              passResults.flatMap((result) => result.coverage.known_findings_referenced)
            ),
          ],
          raw_llm_output: passResults.map((result) => result.raw_response).join("\n\n"),
          repo_root: execution.repoRoot,
          exhaustiveness: execution.manifest.exhaustiveness,
        });
      } finally {
        execution.cleanup?.();
      }
    }

    await completeJob(pool, dbJobId, null, {
      job_type: job.job_type,
      project_name: job.project_name,
      summary: summaries.join("; ") || "audit complete",
      findings_added: totalAdded,
      manifest_revision: jobManifestRevision,
      checklist_id: jobChecklistId,
      coverage_complete: jobCoverageComplete,
      completion_confidence: jobConfidence,
      exhaustiveness: "exhaustive",
      payload: {
        projects: projects.map((p) => p.name),
        visual_only: visualOnly,
        audit_kind: payload.audit_kind ?? (visualOnly ? "visual" : "full"),
        audit_model: auditModel,
        project_audit_details: projectAuditDetails,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`[lyra-worker] job ${dbJobId} failed`, e);
    try {
      await completeJob(pool, dbJobId, msg, {
        job_type: job.job_type,
        project_name: job.project_name,
        summary: `Failed: ${msg.slice(0, 200)}`,
        findings_added: 0,
      });
    } catch (ce) {
      console.error(`[lyra-worker] completeJob failed after job error`, ce);
      throw ce;
    }
  }
}

async function resolveProjectsForJob(
  pool: pg.Pool,
  projectName: string | null
): Promise<StoredProject[]> {
  if (projectName?.trim()) {
    const raw = (await loadProject(pool, projectName.trim())) as StoredProject | null;
    const project = raw ? normalizeProjectConfig(raw) : null;
    if (!project) {
      throw new Error(`Project "${projectName}" not found`);
    }
    return [project];
  }
  const allProjects = ((await listAllProjects(pool)) as StoredProject[]).map(normalizeProjectConfig);
  return allProjects.filter((project) => (project.status ?? "active") === "active");
}

function normalizeProjectConfig(project: StoredProject): StoredProject {
  if (project.repoAccess?.localPath) {
    return {
      ...project,
      status: project.status ?? "active",
      sourceType: "local_path",
      sourceRef: project.repoAccess.localPath,
    };
  }
  if (project.sourceType && project.auditConfig?.scanRoots?.length) return project;
  const scanDir = PORTFOLIO_SCAN_DIRS[project.name];
  if (!scanDir) {
    return {
      ...project,
      status: project.status ?? "active",
      sourceType: project.sourceType ?? "import",
    };
  }
  return {
    ...project,
    status: project.status ?? "active",
    sourceType: project.sourceType ?? "portfolio_mirror",
    sourceRef: project.sourceRef ?? scanDir,
    auditConfig: {
      ...project.auditConfig,
      scanRoots:
        project.auditConfig?.scanRoots && project.auditConfig.scanRoots.length > 0
          ? project.auditConfig.scanRoots
          : [scanDir],
    },
  };
}

function scopeFromPayload(
  payload: Record<string, unknown>,
  project: StoredProject
): AuditScope {
  const scopeType =
    typeof payload.scope_type === "string" ? payload.scope_type : "project";
  const scanRoots = project.auditConfig?.scanRoots ?? ["./"];
  const scopePaths = Array.isArray(payload.scope_paths)
    ? payload.scope_paths.filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    : [];
  return {
    scopeType,
    scopePaths: scopePaths.length > 0 ? scopePaths : scanRoots,
    baseRef: typeof payload.base_ref === "string" ? payload.base_ref : undefined,
    headRef: typeof payload.head_ref === "string" ? payload.head_ref : undefined,
    maxFiles: typeof payload.max_files === "number" ? payload.max_files : undefined,
    maxCharsPerFile:
      typeof payload.max_chars_per_file === "number"
        ? payload.max_chars_per_file
        : undefined,
  };
}

function readProjectExpectations(project: StoredProject, fallbackRepoRoot: string): string {
  const content =
    project.expectations?.active?.content ??
    project.expectations?.draft?.content;
  if (typeof content === "string" && content.trim()) return content;
  return readExpectations(fallbackRepoRoot, "audits/expectations.md");
}

function resolveProjectRepo(
  project: StoredProject,
  repoRef?: string
): {
  repoRoot: string;
  cleanup?: () => void;
} {
  const sourceType = project.sourceType ?? "portfolio_mirror";
  const sourceRef =
    project.repoAccess?.localPath ??
    project.repoAccess?.cloneRef ??
    project.sourceRef ??
    project.repositoryUrl ??
    "";
  if (sourceType === "local_path" || sourceType === "portfolio_mirror") {
    const repoPath = sourceRef
      ? resolve(sourceRef.startsWith("/") ? "/" : repoRoot(), sourceRef)
      : repoRoot();
    if (!existsSync(repoPath)) {
      throw new Error(`Project source path not found: ${repoPath}`);
    }
    return { repoRoot: repoPath };
  }
  if (sourceType === "git_url") {
    if (!sourceRef) {
      throw new Error(`Project "${project.name}" is missing repository URL`);
    }
    const target = mkdtempSync(join(tmpdir(), "lyra-worker-"));
    try {
      execFileSync("git", ["clone", "--depth", "1", sourceRef, target], {
        encoding: "utf8",
        stdio: "pipe",
        timeout: 60_000,
      });
      if (repoRef?.trim()) {
        execFileSync("git", ["-C", target, "checkout", repoRef.trim()], {
          encoding: "utf8",
          stdio: "pipe",
          timeout: 60_000,
        });
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      throw new Error(`Could not clone ${sourceRef}: ${msg}`);
    }
    return {
      repoRoot: target,
      cleanup: () => {
        try {
          execFileSync("rm", ["-rf", target], { stdio: "ignore" });
        } catch {
          /* ignore */
        }
      },
    };
  }
  throw new Error(
    `Project "${project.name}" does not have auditable source access configured`
  );
}

async function runSynthesize(
  pool: pg.Pool,
  job: { id: string; job_type: string; project_name: string | null },
  core: string,
  auditAgent: string
): Promise<void> {
  const allProjects = await listAllProjects(pool);
  // When a project_name is set, scope the synthesis to that project only
  const projects = job.project_name
    ? allProjects.filter((p) => p.name === job.project_name)
    : allProjects;
  const lines = projects.flatMap((p) =>
    (p.findings as Array<{ title?: string; severity?: string }>).map(
      (f) => `- [${p.name}] ${f.severity ?? "?"}: ${f.title ?? "?"}`
    )
  );
  const blob = lines.slice(0, 200).join("\n") || "No findings yet.";
  const key = process.env.OPENAI_API_KEY?.trim();
  const scopeLabel = job.project_name ? `project "${job.project_name}"` : "portfolio";
  let summary = `${scopeLabel}: ${projects.length} project(s), ${lines.length} finding lines.`;
  if (key) {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.LYRA_AUDIT_MODEL?.trim() || "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `${core}\nSummarize audit themes for ${scopeLabel} in 2 short paragraphs.`,
          },
          { role: "user", content: blob },
        ],
        temperature: 0.3,
        max_tokens: 500,
      }),
    });
    if (res.ok) {
      const data = (await res.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      summary = data.choices?.[0]?.message?.content ?? summary;
    }
  }
  await completeJob(pool, job.id, null, {
    job_type: job.job_type,
    project_name: job.project_name,
    summary: summary.slice(0, 2000),
    findings_added: 0,
    payload: { synthesized: true, scope: job.project_name ?? "portfolio" },
  });
}
