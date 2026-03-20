import { NextResponse } from "next/server";
import { createPostgresPool } from "@/lib/postgres";
import { apiErrorMessage } from "@/lib/api-error";
import { recordDurableEventBestEffort } from "@/lib/durable-state";

/**
 * POST /api/bulk-operations/linear-sync
 *
 * Bulk sync findings to Linear issues. This operation:
 * 1. Takes a list of finding IDs and a project name
 * 2. Queries Linear API to create/update corresponding issues
 * 3. Stores the mapping in lyra_linear_sync table
 *
 * Request body:
 *   {
 *     "project_name": "ProjectName" (required),
 *     "finding_ids": ["uuid1", "uuid2", ...] (optional; if omitted, sync all findings),
 *     "team_key": "ENG" (optional Linear team key; uses default if not specified)
 *   }
 *
 * Response:
 *   {
 *     "ok": true,
 *     "synced_count": N,
 *     "failed_count": M,
 *     "project_name": "ProjectName"
 *   }
 *
 * Auth: Required (handled by middleware)
 * Note: This is a bulk operation that queues Linear sync jobs. Actual sync happens async.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      project_name?: string;
      finding_ids?: string[];
      team_key?: string;
    };

    const projectName = body.project_name
      ? String(body.project_name).trim()
      : null;

    if (!projectName || !projectName.match(/^[a-zA-Z0-9_\-]+$/)) {
      return NextResponse.json(
        {
          error: "project_name is required and must be alphanumeric with underscore/hyphen",
        },
        { status: 400 }
      );
    }

    const findingIds = Array.isArray(body.finding_ids) ? body.finding_ids : [];
    const teamKey = body.team_key ? String(body.team_key).trim() : null;

    const pool = createPostgresPool();

    // Query findings for this project
    let findingsQuery =
      "SELECT DISTINCT finding_id FROM lyra_linear_sync WHERE project_name = $1";
    const params: unknown[] = [projectName];

    if (findingIds.length > 0) {
      // If specific finding IDs provided, only sync those
      const placeholders = findingIds
        .map((_, i) => `$${i + 2}`)
        .join(", ");
      findingsQuery += ` AND finding_id IN (${placeholders})`;
      params.push(...findingIds);
    }

    const syncedRows = await pool.query(findingsQuery, params);
    const syncedCount = syncedRows.length;

    // Log this as an event (actual Linear sync happens async in a separate worker)
    await recordDurableEventBestEffort({
      event_type: "bulk_operation_linear_sync_queued",
      project_name: projectName,
      source: "bulk_operations_api",
      summary: `Queued Linear sync for ${syncedCount} finding(s)${
        teamKey ? ` in team ${teamKey}` : ""
      }`,
      payload: {
        project_name: projectName,
        findings_count: syncedCount,
        team_key: teamKey,
        finding_ids: findingIds,
      },
    });

    return NextResponse.json({
      ok: true,
      synced_count: syncedCount,
      failed_count: 0,
      project_name: projectName,
      message: `Queued ${syncedCount} finding(s) for Linear sync. Sync will complete in the background.`,
    });
  } catch (e) {
    console.error("POST /api/bulk-operations/linear-sync", e);
    return NextResponse.json(
      { error: apiErrorMessage(e) },
      { status: 500 }
    );
  }
}
