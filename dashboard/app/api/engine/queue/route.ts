import { NextResponse } from "next/server";
import { readRepairQueue, writeRepairQueue } from "@/lib/audit-reader";
import type { RepairJob } from "@/lib/types";
import { apiErrorMessage } from "@/lib/api-error";

/**
 * GET    /api/engine/queue — return all jobs in the repair queue.
 * POST   /api/engine/queue — add a finding to the queue.
 * DELETE /api/engine/queue — remove a job from the queue by finding_id.
 */

export async function GET() {
  try {
    const queue = readRepairQueue();
    return NextResponse.json({ queue, size: queue.length });
  } catch (e) {
    console.error("GET /api/engine/queue", e);
    return NextResponse.json(
      { error: apiErrorMessage(e) },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const findingId =
      typeof body.finding_id === "string" ? body.finding_id.trim() : "";
    const projectName =
      typeof body.project_name === "string" ? body.project_name.trim() : "";

    if (!findingId || !projectName) {
      return NextResponse.json(
        { error: "finding_id and project_name are required" },
        { status: 400 }
      );
    }

    const queue = readRepairQueue();
    const existing = queue.find(
      (j) => j.finding_id === findingId && j.project_name === projectName
    );
    if (existing) {
      return NextResponse.json({ job: existing, added: false });
    }

    const job: RepairJob = {
      finding_id: findingId,
      project_name: projectName,
      queued_at: new Date().toISOString(),
      status: "queued",
    };
    queue.push(job);
    writeRepairQueue(queue);

    return NextResponse.json({ job, added: true });
  } catch (e) {
    console.error("POST /api/engine/queue", e);
    return NextResponse.json(
      { error: apiErrorMessage(e) },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const findingId =
      typeof body.finding_id === "string" ? body.finding_id.trim() : "";
    const projectName =
      typeof body.project_name === "string" ? body.project_name.trim() : "";
    if (!findingId) {
      return NextResponse.json(
        { error: "finding_id is required" },
        { status: 400 }
      );
    }

    const queue = readRepairQueue();
    // Remove by composite key (project_name, finding_id) when project_name is provided,
    // fall back to finding_id-only match for backwards compatibility.
    let next: typeof queue;
    if (projectName) {
      next = queue.filter(
        (j) => !(j.finding_id === findingId && j.project_name === projectName)
      );
    } else {
      // Legacy path: no project_name supplied. Warn and fall back to finding_id only.
      // This may remove entries from multiple projects if finding_ids are reused.
      console.warn(
        `DELETE /api/engine/queue called without project_name for finding_id=${findingId}. ` +
          "Provide project_name to scope the removal correctly."
      );
      next = queue.filter((j) => j.finding_id !== findingId);
    }
    writeRepairQueue(next);

    return NextResponse.json({ removed: queue.length - next.length });
  } catch (e) {
    console.error("DELETE /api/engine/queue", e);
    return NextResponse.json(
      { error: apiErrorMessage(e) },
      { status: 500 }
    );
  }
}
