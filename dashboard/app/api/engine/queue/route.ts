import { NextResponse } from "next/server";
import { readRepairQueue, writeRepairQueue } from "@/lib/audit-reader";
import {
  insertRepairJobRecord,
  listRecentRepairJobs,
  listRepairJobsForProject,
} from "@/lib/maintenance-store";
import { jobsStoreConfigured } from "@/lib/orchestration-jobs";
import { getRepository } from "@/lib/repository-instance";
import type { RepairJob } from "@/lib/types";
import { apiErrorMessage } from "@/lib/api-error";

/**
 * GET    /api/engine/queue — return all jobs in the repair queue.
 * POST   /api/engine/queue — add a finding to the queue.
 * DELETE /api/engine/queue — remove a job from the queue by finding_id.
 */

export async function GET() {
  try {
    if (jobsStoreConfigured()) {
      const queue = await listRecentRepairJobs(100);
      return NextResponse.json({ queue, size: queue.length });
    }
    const queue = readRepairQueue();
    return NextResponse.json({ queue, size: queue.length });
  } catch (error) {
    console.error("GET /api/engine/queue", error);
    return NextResponse.json(
      { error: apiErrorMessage(error) },
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
    const backlogId =
      typeof body.backlog_id === "string" ? body.backlog_id.trim() : undefined;
    const maintenanceTaskId =
      typeof body.maintenance_task_id === "string"
        ? body.maintenance_task_id.trim()
        : undefined;

    if (!findingId || !projectName) {
      return NextResponse.json(
        { error: "finding_id and project_name are required" },
        { status: 400 }
      );
    }

    if (jobsStoreConfigured()) {
      const repo = getRepository();
      const project = await repo.getByName(projectName);
      const finding = project?.findings.find((item) => item.finding_id === findingId);
      const existing = (await listRepairJobsForProject(projectName, 50)).find(
        (job) => job.finding_id === findingId && job.project_name === projectName
      );
      if (existing) {
        return NextResponse.json({ job: existing, added: false });
      }
      const job = await insertRepairJobRecord({
        project_name: projectName,
        finding_id: findingId,
        repair_policy:
          finding?.repair_policy != null
            ? (finding.repair_policy as Record<string, unknown>)
            : {},
        targeted_files: finding?.suggested_fix?.affected_files ?? [],
        verification_commands:
          finding?.repair_policy?.verification_commands ??
          finding?.suggested_fix?.verification_commands ??
          [],
        rollback_notes:
          finding?.repair_policy?.rollback_notes ??
          finding?.suggested_fix?.rollback_notes,
        maintenance_task_id: maintenanceTaskId,
        backlog_id: backlogId,
        provenance: {
          finding_id: findingId,
          backlog_id: backlogId,
          task_id: maintenanceTaskId,
          manifest_revision: finding?.last_seen_revision,
          source_type: "finding",
        },
        payload: {
          finding_title: finding?.title,
        },
      });
      return NextResponse.json({ job, added: true });
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
      maintenance_task_id: maintenanceTaskId,
      backlog_id: backlogId,
    };
    queue.push(job);
    writeRepairQueue(queue);

    return NextResponse.json({ job, added: true });
  } catch (error) {
    console.error("POST /api/engine/queue", error);
    return NextResponse.json(
      { error: apiErrorMessage(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    if (jobsStoreConfigured()) {
      return NextResponse.json(
        { error: "DELETE is not implemented for Postgres-backed repair jobs yet" },
        { status: 501 }
      );
    }
    const body = await request.json();
    const findingId =
      typeof body.finding_id === "string" ? body.finding_id.trim() : "";
    const projectName =
      typeof body.project_name === "string" ? body.project_name.trim() : "";
    if (!findingId) {
      return NextResponse.json(
        { error: "finding_id and project_name are required" },
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
  } catch (error) {
    console.error("DELETE /api/engine/queue", error);
    return NextResponse.json(
      { error: apiErrorMessage(error) },
      { status: 500 }
    );
  }
}
