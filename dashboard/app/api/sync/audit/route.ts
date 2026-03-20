import { NextResponse } from "next/server";
import { readOpenFindings, readAuditRunFiles } from "@/lib/audit-reader";
import { getRepository } from "@/lib/repository-instance";
import { recordDurableEventBestEffort } from "@/lib/durable-state";
import type { Project, Finding } from "@/lib/types";
import { apiErrorMessage } from "@/lib/api-error";
import { normalizeProjectName } from "@/lib/project-identity";

/**
 * GET  /api/sync/audit — preview what's available to import.
 * POST /api/sync/audit — import all findings from audits/open_findings.json
 *                        and any audit run files under audits/runs/.
 */

/** Group an array of findings by their project_name field (or a fallback). */
function groupByProject(
  findings: Finding[],
  fallbackProject: string
): Record<string, Finding[]> {
  const groups: Record<string, Finding[]> = {};
  for (const f of findings) {
    const name =
      (f as Finding & { project_name?: string }).project_name ??
      fallbackProject;
    if (!groups[name]) groups[name] = [];
    groups[name].push(f);
  }
  return groups;
}

export async function GET() {
  const findings = readOpenFindings();
  const runFiles = readAuditRunFiles();
  return NextResponse.json({
    open_findings_count: findings.length,
    audit_run_files: runFiles.length,
    ready: findings.length > 0 || runFiles.length > 0,
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const fallbackProject: string =
      typeof body.project_name === "string" && body.project_name.trim()
        ? body.project_name.trim()
        : "Imported";

    const findings = readOpenFindings();

    // Also pull findings from audit run files (findings[] inside each run)
    const runFiles = readAuditRunFiles();
    for (const run of runFiles) {
      const runFindings = (run as { findings?: Finding[] }).findings;
      if (Array.isArray(runFindings)) {
        findings.push(...runFindings);
      }
    }

    if (findings.length === 0) {
      return NextResponse.json({
        projects_updated: 0,
        findings_imported: 0,
        message: "No findings found in audit output. Run an audit first.",
      });
    }

    const groups = groupByProject(findings, fallbackProject);
    const repo = getRepository();
    const existingProjects = await repo.list();
    const existingByName = new Map(
      existingProjects.map((project) => [normalizeProjectName(project.name), project])
    );

    let projectsUpdated = 0;
    let findingsImported = 0;

    for (const [projectName, projectFindings] of Object.entries(groups)) {
      const normalizedProjectName = normalizeProjectName(projectName);
      const existing = existingByName.get(normalizedProjectName);
      const now = new Date().toISOString();

      if (existing) {
        // Upsert: update existing findings with incoming content, preserve
        // local workflow fields (status/history); append brand-new findings.
        const incomingById = new Map(projectFindings.map((f) => [f.finding_id, f]));
        let changed = false;

        // Update content of existing findings, preserving workflow fields
        const updatedFindings = existing.findings.map((prev) => {
          const incoming = incomingById.get(prev.finding_id);
          if (!incoming) return prev;
          // Replace audit content fields but keep workflow state
          const merged = {
            ...incoming,
            finding_id: prev.finding_id,
            status: prev.status,
            history: prev.history,
          };
          changed = true;
          return merged;
        });

        // Append brand-new findings not yet in the project
        const existingIds = new Set(existing.findings.map((f) => f.finding_id));
        const newFindings = projectFindings.filter((f) => !existingIds.has(f.finding_id));
        if (newFindings.length > 0) {
          updatedFindings.push(...newFindings);
          changed = true;
          findingsImported += newFindings.length;
        }

        if (changed) {
          await repo.update({
            ...existing,
            findings: updatedFindings,
            lastUpdated: now,
          });
          existingByName.set(normalizedProjectName, {
            ...existing,
            findings: updatedFindings,
            lastUpdated: now,
          });
          projectsUpdated++;
        }
      } else {
        const project: Project = {
          name: projectName,
          findings: projectFindings,
          lastUpdated: now,
          status: "active",
          sourceType: "import",
        };
        await repo.create(project);
        existingByName.set(normalizedProjectName, project);
        findingsImported += projectFindings.length;
        projectsUpdated++;
      }
    }

    await recordDurableEventBestEffort({
      event_type: "audit_sync",
      project_name: fallbackProject,
      source: "audit_sync_route",
      summary: "Synced audit findings into project storage",
      payload: {
        projects_updated: projectsUpdated,
        findings_imported: findingsImported,
      },
    });
    return NextResponse.json({
      projects_updated: projectsUpdated,
      findings_imported: findingsImported,
      message:
        findingsImported > 0
          ? `Imported ${findingsImported} findings across ${projectsUpdated} project(s).`
          : "All findings already present — nothing new to import.",
    });
  } catch (e) {
    console.error("POST /api/sync/audit", e);
    return NextResponse.json(
      { error: apiErrorMessage(e) },
      { status: 500 }
    );
  }
}
