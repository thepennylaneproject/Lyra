import { NextResponse } from "next/server";
import { createPostgresPool } from "@/lib/postgres";
import { apiErrorMessage, isValidProjectName, parseJsonBody } from "@/lib/api-error";
import { recordDurableEventBestEffort } from "@/lib/durable-state";

/**
 * POST /api/bulk-operations/repair-queue
 *
 * Bulk move findings to the repair queue. This operation:
 * 1. Takes a list of finding IDs and a project name
 * 2. Upserts them into lyra_maintenance_backlog with next_action='queue_repair'
 * 3. Returns count of successfully queued items
 *
 * Finding metadata (title, severity, etc.) is loaded via a direct JSONB query
 * against lyra_projects so the result is consistent with what is actually in the
 * database, regardless of which repository store (Postgres vs JSON file) is active.
 * Findings not found in the project are still queued with placeholder data — the
 * worker's next audit run will enrich them via upsertMaintenanceBacklogFromFindings.
 *
 * Request body:
 *   {
 *     "project_name": "ProjectName" (required),
 *     "finding_ids": ["id1", "id2", ...] (required),
 *     "priority": "normal" | "high" | "low" (optional; mapped to P2/P1/P3)
 *   }
 */
export async function POST(request: Request) {
  try {
    const body = await parseJsonBody<{
      project_name?: string;
      finding_ids?: string[];
      priority?: string;
    }>(request);

    const projectName = body.project_name
      ? String(body.project_name).trim()
      : null;
    const findingIds = Array.isArray(body.finding_ids)
      ? body.finding_ids.map(String).filter(Boolean)
      : [];
    const priorityInput = body.priority
      ? String(body.priority).toLowerCase().trim()
      : "normal";

    if (!projectName || !isValidProjectName(projectName)) {
      return NextResponse.json(
        { error: "project_name is required and must be alphanumeric with underscore/hyphen" },
        { status: 400 }
      );
    }

    if (findingIds.length === 0) {
      return NextResponse.json(
        { error: "finding_ids array is required and must not be empty" },
        { status: 400 }
      );
    }

    if (!["normal", "high", "low"].includes(priorityInput)) {
      return NextResponse.json(
        { error: "priority must be one of: normal, high, low" },
        { status: 400 }
      );
    }

    const priorityMap: Record<string, string> = { high: "P1", normal: "P2", low: "P3" };
    const dbPriority = priorityMap[priorityInput] ?? "P2";

    const pool = createPostgresPool();

    // Fetch metadata for the requested finding IDs directly from the project JSONB.
    // This is always consistent with the DB regardless of which repository layer is active.
    const metaRows = await pool.query(
      `SELECT
         f->>'finding_id'  AS finding_id,
         f->>'title'       AS title,
         f->>'description' AS description,
         f->>'severity'    AS severity,
         f->'repair_policy' AS repair_policy
       FROM lyra_projects,
            jsonb_array_elements(COALESCE(project_json->'findings', '[]'::jsonb)) AS f
       WHERE lower(trim(name)) = lower(trim($1))
         AND f->>'finding_id' = ANY($2::text[])`,
      [projectName, findingIds]
    );

    // Index the enrichment data by finding_id
    const metaMap = new Map<string, Record<string, unknown>>();
    for (const row of metaRows) {
      const fid = String(row.finding_id ?? "").trim();
      if (fid) metaMap.set(fid, row as Record<string, unknown>);
    }

    function inferRiskClass(meta: Record<string, unknown> | undefined): string {
      const rp =
        typeof meta?.repair_policy === "object" && meta.repair_policy
          ? (meta.repair_policy as Record<string, unknown>)
          : {};
      const rc = rp.risk_class;
      if (rc === "low" || rc === "medium" || rc === "high" || rc === "critical") return rc;
      const sev = String(meta?.severity ?? "minor").toLowerCase();
      if (sev === "blocker") return "critical";
      if (sev === "major") return "high";
      if (sev === "minor") return "medium";
      return "low";
    }

    // Upsert one backlog item per requested finding. If metadata isn't available
    // (project not yet in DB, or finding was recently added), use placeholder values —
    // the next audit run will update them via upsertMaintenanceBacklogFromFindings.
    let queuedCount = 0;
    const failedIds: string[] = [];

    for (const fid of findingIds) {
      const meta = metaMap.get(fid);
      const title = meta ? String(meta.title ?? fid).trim() : fid;
      const summary = meta && typeof meta.description === "string" ? meta.description : null;
      const severity = meta ? String(meta.severity ?? "minor") : "minor";
      const riskClass = inferRiskClass(meta);
      const backlogId = `backlog-${projectName}-${fid}`;
      const dedupeKeys = JSON.stringify([
        `finding:${fid}`,
        `title:${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      ]);
      const provenance = JSON.stringify({ finding_id: fid, source_type: "finding" });

      try {
        await pool.query(
          `INSERT INTO lyra_maintenance_backlog (
             id, project_name, title, summary, canonical_status, source_type,
             priority, severity, risk_class, next_action,
             finding_ids, dedupe_keys, provenance, created_at, updated_at
           )
           VALUES ($1, $2, $3, $4, 'open', 'finding', $5, $6, $7, 'queue_repair',
                   $8::jsonb, $9::jsonb, $10::jsonb, now(), now())
           ON CONFLICT (id) DO UPDATE SET
             next_action      = 'queue_repair',
             canonical_status = CASE
               WHEN lyra_maintenance_backlog.canonical_status = 'done' THEN 'open'
               ELSE lyra_maintenance_backlog.canonical_status
             END,
             priority         = EXCLUDED.priority,
             updated_at       = now()`,
          [
            backlogId,
            projectName,
            title,
            summary,
            dbPriority,
            severity,
            riskClass,
            JSON.stringify([fid]),
            dedupeKeys,
            provenance,
          ]
        );
        queuedCount++;
      } catch (err) {
        console.error(`[repair-queue] Failed to upsert backlog item for ${fid}:`, err);
        failedIds.push(fid);
      }
    }

    const skippedCount = failedIds.length;
    const enrichedCount = metaMap.size;

    await recordDurableEventBestEffort({
      event_type: "bulk_operation_repair_queue",
      project_name: projectName,
      source: "bulk_operations_api",
      summary: `Queued ${queuedCount} finding(s) for repair (${skippedCount} failed)`,
      payload: {
        project_name: projectName,
        queued_count: queuedCount,
        skipped_count: skippedCount,
        enriched_count: enrichedCount,
        priority: dbPriority,
        total_requested: findingIds.length,
        failed_ids: failedIds,
      },
    });

    const enrichmentNote =
      enrichedCount < queuedCount
        ? ` ${queuedCount - enrichedCount} queued with placeholder data (finding metadata not yet in DB).`
        : "";

    return NextResponse.json({
      ok: true,
      queued_count: queuedCount,
      skipped_count: skippedCount,
      project_name: projectName,
      message:
        queuedCount > 0
          ? `Queued ${queuedCount} finding(s) for repair.${enrichmentNote}${skippedCount > 0 ? ` ${skippedCount} failed to write.` : ""}`
          : `No findings queued — all ${findingIds.length} insert(s) failed. Check server logs.`,
    });
  } catch (error) {
    console.error("POST /api/bulk-operations/repair-queue", error);
    return NextResponse.json(
      { error: apiErrorMessage(error) },
      { status: 500 }
    );
  }
}
