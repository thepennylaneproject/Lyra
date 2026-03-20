import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type pg from "pg";
import { resolveApps } from "./apps.js";
import { buildCodeContextForAudit, readExpectations } from "./context.js";
import { auditWithLlm } from "./llm.js";
import {
  claimJob,
  completeJob,
  loadProject,
  saveProject,
  listAllProjects,
} from "./db.js";

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

function mergeFindings2(
  existing: Array<Record<string, unknown>>,
  incoming: Array<Record<string, unknown>>
): { merged: Array<Record<string, unknown>>; added: number } {
  const byId = new Map<string, Record<string, unknown>>();
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
      byId.set(id, { ...f, status: f.status ?? "open" });
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

export async function processJob(pool: pg.Pool, dbJobId: string): Promise<void> {
  const job = await claimJob(pool, dbJobId);
  if (!job) {
    console.log(`[lyra-worker] skip job ${dbJobId} (not queued or done)`);
    return;
  }

  let core: string;
  let auditAgent: string;
  let root: string;
  const payload = job.payload || {};
  const visualOnly = Boolean(payload.visual_only);

  try {
    ({ core, auditAgent } = loadPrompts());
    root = repoRoot();
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

    const apps = resolveApps(job.job_type, job.project_name);
    let totalAdded = 0;
    const summaries: string[] = [];
    const appAuditDetails: Array<Record<string, unknown>> = [];
    let auditModel = "unknown";

    for (const app of apps) {
      const expectations = readExpectations(root, app.expectations);
      const code = buildCodeContextForAudit(root, app.scanDir);
      const llm = await auditWithLlm(
        core,
        auditAgent,
        expectations,
        code,
        app.projectName,
        visualOnly
      );
      auditModel = llm.model || auditModel;
      const findings = llm.findings;
      const incoming = findings.map((f) => ({ ...f })) as Array<
        Record<string, unknown>
      >;
      const prev = await loadProject(pool, app.projectName);
      const existing = (prev?.findings ?? []) as Array<Record<string, unknown>>;
      const { merged, added } = mergeFindings2(existing, incoming);
      totalAdded += added;
      // Spread prev to preserve all project fields (stack, repositoryUrl, etc.)
      await saveProject(pool, {
        ...(prev ?? {}),
        name: app.projectName,
        findings: merged,
        lastUpdated: new Date().toISOString(),
      });
      summaries.push(`${app.projectName}: +${added} findings`);
      appAuditDetails.push({
        app: app.projectName,
        scan_dir: app.scanDir,
        expectations_file: app.expectations,
        findings_returned: findings.length,
        findings_added: added,
        raw_llm_output: llm.raw_response,
      });
    }

    await completeJob(pool, dbJobId, null, {
      job_type: job.job_type,
      project_name: job.project_name,
      summary: summaries.join("; ") || "audit complete",
      findings_added: totalAdded,
      payload: {
        apps: apps.map((a) => a.projectName),
        visual_only: visualOnly,
        audit_model: auditModel,
        app_audit_details: appAuditDetails,
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
