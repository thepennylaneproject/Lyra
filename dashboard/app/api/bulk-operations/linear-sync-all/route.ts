import { NextResponse } from "next/server";
import { createPostgresPool } from "@/lib/postgres";
import { apiErrorMessage } from "@/lib/api-error";
import { recordDurableEventBestEffort } from "@/lib/durable-state";

/**
 * POST /api/bulk-operations/linear-sync-all
 *
 * Bulk sync ALL projects' findings to Linear. This operation:
 * 1. Queries all projects from the database
 * 2. For each project, creates/updates Linear sync mappings
 * 3. Returns summary of synced findings across all projects
 *
 * Request body: (empty, or optional team_key)
 *   {
 *     "team_key": "ENG" (optional Linear team key; uses default if not specified)
 *   }
 *
 * Response:
 *   {
 *     "ok": true,
 *     "total_projects": N,
 *     "total_synced_findings": M,
 *     "project_summaries": [
 *       { "project_name": "ProjectName", "findings_count": X }
 *     ]
 *   }
 *
 * Auth: Required (handled by middleware)
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      team_key?: string;
    };

    const teamKey = body.team_key ? String(body.team_key).trim() : null;

    const pool = createPostgresPool();

    // Get all projects
    const projectRows = await pool.query(
      "SELECT name, project_json FROM lyra_projects ORDER BY name"
    );

    if (!projectRows.rows || projectRows.rows.length === 0) {
      return NextResponse.json({
        ok: true,
        total_projects: 0,
        total_synced_findings: 0,
        project_summaries: [],
        message: "No projects found to sync.",
      });
    }

    const projectSummaries: Array<{ project_name: string; findings_count: number }> = [];
    let totalSyncedFindings = 0;

    // Sync each project
    for (const row of projectRows.rows) {
      const projectName = row.name;
      const projectJson = row.project_json;
      const project = typeof projectJson === "object" && projectJson !== null ? projectJson : {};
      const findings = Array.isArray(project.findings) ? project.findings : [];

      // Get all finding IDs for this project
      const findingIds = findings
        .map((f: { finding_id?: string }) => f.finding_id)
        .filter(Boolean);

      if (findingIds.length === 0) continue;

      // Create/update sync mappings for each finding
      const syncPromises = findingIds.map((fId: string) =>
        pool.query(
          `INSERT INTO lyra_linear_sync_new (project_name, finding_id, linear_issue_id, linear_team_key)
           VALUES ($1, $2, '', $3)
           ON CONFLICT (project_name, finding_id) DO UPDATE SET
             linear_team_key = COALESCE($3, linear_team_key),
             updated_at = now()`,
          [projectName, fId, teamKey]
        )
      );

      await Promise.all(syncPromises);

      projectSummaries.push({
        project_name: projectName,
        findings_count: findingIds.length,
      });

      totalSyncedFindings += findingIds.length;
    }

    // Log this as an event
    await recordDurableEventBestEffort({
      event_type: "bulk_operation_linear_sync_all_queued",
      source: "bulk_operations_api",
      summary: `Queued Linear sync for ${totalSyncedFindings} finding(s) across ${projectSummaries.length} project(s)${
        teamKey ? ` in team ${teamKey}` : ""
      }`,
      payload: {
        total_projects: projectSummaries.length,
        total_findings: totalSyncedFindings,
        team_key: teamKey,
        project_summaries: projectSummaries,
      },
    });

    return NextResponse.json({
      ok: true,
      total_projects: projectSummaries.length,
      total_synced_findings: totalSyncedFindings,
      project_summaries: projectSummaries,
      message: `Queued ${totalSyncedFindings} finding(s) for Linear sync across ${projectSummaries.length} project(s). Sync will complete in the background.`,
    });
  } catch (e) {
    console.error("POST /api/bulk-operations/linear-sync-all", e);
    return NextResponse.json(
      { error: apiErrorMessage(e) },
      { status: 500 }
    );
  }
}
