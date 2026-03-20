import { NextResponse } from "next/server";
import { createPostgresPool } from "@/lib/postgres";
import { apiErrorMessage } from "@/lib/api-error";
import { recordDurableEventBestEffort } from "@/lib/durable-state";
import { randomUUID } from "node:crypto";

/**
 * POST /api/bulk-operations/repair-queue
 *
 * Bulk move findings to the repair queue. This operation:
 * 1. Takes a list of finding IDs and a project name
 * 2. Inserts them into the repair engine queue
 * 3. Returns count of successfully queued items
 *
 * Request body:
 *   {
 *     "project_name": "ProjectName" (required),
 *     "finding_ids": ["uuid1", "uuid2", ...] (required; specify which findings to queue),
 *     "priority": "normal" | "high" | "low" (optional; default: "normal")
 *   }
 *
 * Response:
 *   {
 *     "ok": true,
 *     "queued_count": N,
 *     "skipped_count": M,
 *     "project_name": "ProjectName"
 *   }
 *
 * Auth: Required (handled by middleware)
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      project_name?: string;
      finding_ids?: string[];
      priority?: string;
    };

    const projectName = body.project_name
      ? String(body.project_name).trim()
      : null;
    const findingIds = Array.isArray(body.finding_ids) ? body.finding_ids : [];
    const priority = body.priority
      ? String(body.priority).toLowerCase().trim()
      : "normal";

    // Validation
    if (!projectName || !projectName.match(/^[a-zA-Z0-9_\-]+$/)) {
      return NextResponse.json(
        {
          error: "project_name is required and must be alphanumeric with underscore/hyphen",
        },
        { status: 400 }
      );
    }

    if (findingIds.length === 0) {
      return NextResponse.json(
        { error: "finding_ids array is required and must not be empty" },
        { status: 400 }
      );
    }

    if (!["normal", "high", "low"].includes(priority)) {
      return NextResponse.json(
        { error: "priority must be one of: normal, high, low" },
        { status: 400 }
      );
    }

    const pool = createPostgresPool();

    // Check which findings already exist in queue
    const existingQuery = `
      SELECT finding_id FROM lyra_maintenance_backlog
      WHERE project_name = $1 AND finding_id = ANY($2::text[])
    `;
    const existingRows = await pool.query(existingQuery, [
      projectName,
      findingIds,
    ]);
    const existingIds = new Set(
      existingRows.map((row: Record<string, unknown>) =>
        String(row.finding_id)
      )
    );

    // Insert new findings that aren't already queued
    const newFindingIds = findingIds.filter((id) => !existingIds.has(id));

    let queuedCount = 0;
    if (newFindingIds.length > 0) {
      const insertRows = newFindingIds.map((findingId) => [
        randomUUID(), // id
        projectName,
        findingId,
        priority,
        "pending", // status
        new Date().toISOString(), // created_at
      ]);

      const insertQuery = `
        INSERT INTO lyra_maintenance_backlog
        (id, project_name, finding_id, priority, status, created_at)
        VALUES ($1, $2, $3, $4, $5, $6)
      `;

      for (const row of insertRows) {
        try {
          await pool.query(insertQuery, row);
          queuedCount++;
        } catch (e) {
          console.warn("Failed to insert repair queue item:", e);
        }
      }
    }

    const skippedCount = findingIds.length - queuedCount;

    await recordDurableEventBestEffort({
      event_type: "bulk_operation_repair_queue",
      project_name: projectName,
      source: "bulk_operations_api",
      summary: `Queued ${queuedCount} finding(s) for repair (${skippedCount} already queued)`,
      payload: {
        project_name: projectName,
        queued_count: queuedCount,
        skipped_count: skippedCount,
        priority,
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
          ? `Queued ${queuedCount} finding(s) for repair.${skippedCount > 0 ? ` ${skippedCount} were already queued.` : ""}`
          : "No new findings queued (all were already in queue).",
    });
  } catch (e) {
    console.error("POST /api/bulk-operations/repair-queue", e);
    return NextResponse.json(
      { error: apiErrorMessage(e) },
      { status: 500 }
    );
  }
}
