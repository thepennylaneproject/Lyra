import { NextResponse } from "next/server";
import { Queue } from "bullmq";
import {
  cancelAuditJob,
  insertAuditJob,
  jobsStoreConfigured,
  listRecentAuditJobs,
  listRecentAuditRuns,
  updateAuditJobStatus,
  type LyraJobType,
} from "@/lib/orchestration-jobs";
import { recordDurableEventBestEffort } from "@/lib/durable-state";
import { apiErrorMessage } from "@/lib/api-error";
import { bullmqConnectionFromEnv } from "@/lib/redis-bullmq";

const JOB_TYPES: LyraJobType[] = [
  "weekly_audit",
  "onboard_project",
  "onboard_repository",
  "re_audit_project",
  "synthesize_project",
  "audit_project",
];

/** True only if REDIS_URL/LYRA_REDIS_URL is set and parses to a non-empty host. */
function redisConfigured(): boolean {
  return bullmqConnectionFromEnv() != null;
}

export async function GET() {
  if (!jobsStoreConfigured()) {
    return NextResponse.json({
      configured: false,
      redis_configured: redisConfigured(),
      enqueue_auth_optional: true,
      jobs: [],
      runs: [],
    });
  }
  try {
    const [jobs, runs] = await Promise.all([
      listRecentAuditJobs(30),
      listRecentAuditRuns(20),
    ]);
    return NextResponse.json({
      configured: true,
      redis_configured: redisConfigured(),
      enqueue_auth_optional: true,
      jobs,
      runs,
    });
  } catch (error) {
    console.error("GET /api/orchestration/jobs", error);
    return NextResponse.json(
      { error: apiErrorMessage(error) },
      { status: 500 }
    );
  }
}

// Auth is handled centrally by middleware (Bearer, x-lyra-api-secret, or session cookie).
export async function POST(request: Request) {
  if (!jobsStoreConfigured()) {
    return NextResponse.json(
      { error: "DATABASE_URL required for orchestration jobs" },
      { status: 503 }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const jobType = body.job_type as LyraJobType;
    const payload =
      typeof body.payload === "object" && body.payload !== null
        ? (body.payload as Record<string, unknown>)
        : {};
    if (!JOB_TYPES.includes(jobType)) {
      return NextResponse.json(
        {
          error: `job_type must be one of: ${JOB_TYPES.join(", ")}`,
        },
        { status: 400 }
      );
    }

    const row = await insertAuditJob(jobType, {
      project_name:
        typeof body.project_name === "string"
          ? body.project_name.trim() || null
          : null,
      repository_url:
        typeof body.repository_url === "string"
          ? body.repository_url.trim() || null
          : null,
      manifest_revision:
        typeof body.manifest_revision === "string"
          ? body.manifest_revision.trim() || null
          : typeof payload.manifest_revision === "string"
            ? payload.manifest_revision.trim() || null
          : null,
      checklist_id:
        typeof body.checklist_id === "string"
          ? body.checklist_id.trim() || null
          : typeof payload.checklist_id === "string"
            ? payload.checklist_id.trim() || null
          : null,
      repo_ref:
        typeof body.repo_ref === "string"
          ? body.repo_ref.trim() || null
          : null,
      payload,
    });

    const connection = bullmqConnectionFromEnv();
    if (connection) {
      const queue = new Queue("lyra-audit", { connection });
      try {
        await queue.add(
          "process",
          { dbJobId: row.id },
          { jobId: row.id, removeOnComplete: true, removeOnFail: false }
        );
      } catch (redisErr) {
        // BullMQ enqueue failed — mark the DB row failed immediately so the
        // operator sees it rather than leaving it stuck in "queued" forever.
        const msg =
          redisErr instanceof Error ? redisErr.message : String(redisErr);
        console.error("[orchestration/jobs] Redis enqueue failed:", msg);
        try {
          await updateAuditJobStatus(row.id, "failed", `Redis enqueue error: ${msg}`);
        } catch (dbErr) {
          console.error("[orchestration/jobs] Could not mark job failed:", dbErr);
        }
        await queue.close();
        return NextResponse.json(
          { error: `Redis enqueue failed: ${msg}` },
          { status: 502 }
        );
      } finally {
        await queue.close();
      }
    }

    await recordDurableEventBestEffort({
      event_type: "orchestration_job_enqueued",
      project_name: row.project_name,
      source: "orchestration_api",
      summary: `Enqueued ${jobType} job ${row.id}`,
      payload: { job_id: row.id, bullmq: connection != null },
    });

    return NextResponse.json(
      { job: row, bullmq_queued: connection != null },
      { status: 202 }
    );
  } catch (error) {
    console.error("POST /api/orchestration/jobs", error);
    return NextResponse.json(
      { error: apiErrorMessage(error) },
      { status: 500 }
    );
  }
}

/** DELETE /api/orchestration/jobs — cancel a single queued/running audit job by id. */
export async function DELETE(request: Request) {
  if (!jobsStoreConfigured()) {
    return NextResponse.json({ error: "DATABASE_URL required" }, { status: 503 });
  }
  try {
    const body = await request.json().catch(() => ({}));
    const id = typeof body.id === "string" ? body.id.trim() : null;
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }
    const job = await cancelAuditJob(id);
    if (!job) {
      return NextResponse.json(
        { error: "Job not found or already in a terminal state" },
        { status: 404 }
      );
    }
    return NextResponse.json({ job });
  } catch (error) {
    console.error("DELETE /api/orchestration/jobs", error);
    return NextResponse.json({ error: apiErrorMessage(error) }, { status: 500 });
  }
}
