import { NextResponse } from "next/server";
import { createPostgresPool } from "@/lib/postgres";
import { getRepository } from "@/lib/repository-instance";
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
 * Request body:
 *   {
 *     "project_name": "ProjectName" (required),
 *     "finding_ids": ["uuid1", "uuid2", ...] (required),
 *     "priority": "normal" | "high" | "low" (optional; mapped to P1/P0/P2)
 *   }
 *
 * Response:
 *   {
 *     "ok": true,
 *     "queued_count": N,
 *     "skipped_count": M,
 *     "project_name": "ProjectName"
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
    const findingIds = Array.isArray(body.finding_ids) ? body.finding_ids.map(String) : [];
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

    // Map caller-friendly priority labels to the DB constraint values
    const priorityMap: Record<string, string> = { high: "P1", normal: "P2", low: "P3" };
    const dbPriority = priorityMap[priorityInput] ?? "P2";

    const pool = createPostgresPool();

    // Load findings via the same repository the rest of the app uses (Postgres or JSON file store).
    const repo = getRepository();
    const project = await repo.getByName(projectName);
    const allFindings: Array<Record<string, unknown>> = (project?.findings ?? []) as Array<Record<string, unknown>>;

    // Index findings by finding_id for fast lookup
    const findingMap = new Map<string, Record<string, unknown>>();
    for (const f of allFindings) {
      const fid = String(f.finding_id ?? "").trim();
      if (fid) findingMap.set(fid, f);
    }

    // Infer risk_class from severity / repair_policy
    function inferRiskClass(f: Record<string, unknown>): string {
      const rp =
        typeof f.repair_policy === "object" && f.repair_policy
          ? (f.repair_policy as Record<string, unknown>)
          : {};
      const rc = rp.risk_class;
      if (rc === "low" || rc === "medium" || rc === "high" || rc === "critical")
        return rc;
      const sev = String(f.severity ?? "minor").toLowerCase();
      if (sev === "blocker") return "critical";
      if (sev === "major") return "high";
      if (sev === "minor") return "medium";
      return "low";
    }

    // Build rows to upsert — one backlog item per finding using deterministic ID
    const rows: Array<{
      id: string;
      title: string;
      summary: string | null;
      severity: string;
      riskClass: string;
      findingIds: string;
      dedupeKeys: string;
      provenance: string;
    }> = [];

    const skipped: string[] = [];

    for (const fid of findingIds) {
      const f = findingMap.get(fid);
      if (!f) {
        skipped.push(fid);
        continue;
      }
      const title = String(f.title ?? fid).trim();
      rows.push({
        id:        `backlog-${projectName}-${fid}`,
        title,
        summary:   typeof f.description === "string" ? f.description : null,
        severity:  String(f.severity ?? "minor"),
        riskClass: inferRiskClass(f),
        findingIds: JSON.stringify([fid]),
        dedupeKeys: JSON.stringify([
          `finding:${fid}`,
          `title:${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
        ]),
        provenance: JSON.stringify({ finding_id: fid, source_type: "finding" }),
      });
    }

    let queuedCount = 0;
    for (const row of rows) {
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
             next_action    = 'queue_repair',
             canonical_status = CASE
               WHEN lyra_maintenance_backlog.canonical_status = 'done' THEN 'open'
               ELSE lyra_maintenance_backlog.canonical_status
             END,
             priority       = EXCLUDED.priority,
             updated_at     = now()`,
          [
            row.id,
            projectName,
            row.title,
            row.summary,
            dbPriority,
            row.severity,
            row.riskClass,
            row.findingIds,
            row.dedupeKeys,
            row.provenance,
          ]
        );
        queuedCount++;
      } catch (err) {
        console.warn("Failed to upsert repair backlog item:", err);
        skipped.push(row.id);
      }
    }

    const skippedCount = findingIds.length - queuedCount;

    await recordDurableEventBestEffort({
      event_type: "bulk_operation_repair_queue",
      project_name: projectName,
      source: "bulk_operations_api",
      summary: `Queued ${queuedCount} finding(s) for repair (${skippedCount} skipped)`,
      payload: {
        project_name: projectName,
        queued_count: queuedCount,
        skipped_count: skippedCount,
        priority: dbPriority,
        total_requested: findingIds.length,
      },
    });

    return NextResponse.json({
      ok: true,
      queued_count: queuedCount,
      skipped_count: skippedCount,
      project_name: projectName,
      message:
        queuedCount > 0
          ? `Queued ${queuedCount} finding(s) for repair.${skippedCount > 0 ? ` ${skippedCount} could not be found in the project and were skipped.` : ""}`
          : "No findings queued — none of the provided IDs matched findings in this project.",
    });
  } catch (error) {
    console.error("POST /api/bulk-operations/repair-queue", error);
    return NextResponse.json(
      { error: apiErrorMessage(error) },
      { status: 500 }
    );
  }
}
