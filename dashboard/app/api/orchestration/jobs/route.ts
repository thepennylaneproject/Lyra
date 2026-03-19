import { NextResponse } from "next/server";
import { Queue } from "bullmq";
import {
  insertAuditJob,
  jobsStoreConfigured,
  listRecentAuditJobs,
  listRecentAuditRuns,
  type LyraJobType,
} from "@/lib/orchestration-jobs";
import { recordDurableEventBestEffort } from "@/lib/durable-state";
import { apiErrorMessage } from "@/lib/api-error";
import { bullmqConnectionFromEnv } from "@/lib/redis-bullmq";

const JOB_TYPES: LyraJobType[] = [
  "weekly_audit",
  "onboard_project",
  "re_audit_project",
  "synthesize_project",
  "audit_project",
];

function enqueueSecret(): string {
  return (
    process.env.ORCHESTRATION_ENQUEUE_SECRET?.trim() ||
    process.env.DASHBOARD_API_SECRET?.trim() ||
    ""
  );
}

/** Normalize for comparison (trim + strip newlines). */
function normalizeSecret(s: string): string {
  return s.trim().replace(/\r?\n/g, "").trim();
}

function authorize(request: Request): boolean {
  const secret = enqueueSecret();
  if (!secret) {
    return process.env.NODE_ENV === "development";
  }
  const normalizedSecret = normalizeSecret(secret);
  const auth = request.headers.get("authorization");
  const bearerMatch =
    auth?.startsWith("Bearer ") &&
    normalizeSecret(auth.slice(7)) === normalizedSecret;
  const header =
    request.headers.get("x-lyra-enqueue-secret") ??
    request.headers.get("x-lyra-api-secret");
  return bearerMatch || (header != null && normalizeSecret(header) === normalizedSecret);
}

/** True only if REDIS_URL/LYRA_REDIS_URL is set and parses to a non-empty host. */
function redisConfigured(): boolean {
  return bullmqConnectionFromEnv() != null;
}

export async function GET() {
  if (!jobsStoreConfigured()) {
    return NextResponse.json({
      configured: false,
      redis_configured: redisConfigured(),
      enqueue_auth_optional: false,
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
      enqueue_auth_optional:
        process.env.NODE_ENV === "development" && !enqueueSecret(),
      jobs,
      runs,
    });
  } catch (e) {
    console.error("GET /api/orchestration/jobs", e);
    return NextResponse.json(
      { error: apiErrorMessage(e) },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!jobsStoreConfigured()) {
    return NextResponse.json(
      { error: "DATABASE_URL required for orchestration jobs" },
      { status: 503 }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const jobType = body.job_type as LyraJobType;
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
      payload:
        typeof body.payload === "object" && body.payload !== null
          ? (body.payload as Record<string, unknown>)
          : {},
    });

    let bullmqQueued = false;
    const connection = bullmqConnectionFromEnv();
    if (connection) {
      try {
        const queue = new Queue("lyra-audit", { connection });
        try {
          await queue.add(
            "process",
            { dbJobId: row.id },
            { jobId: row.id, removeOnComplete: true, removeOnFail: false }
          );
          bullmqQueued = true;
        } finally {
          await queue.close();
        }
      } catch (redisErr) {
        console.warn(
          "[orchestration/jobs] Redis connect failed:",
          redisErr instanceof Error ? redisErr.message : redisErr
        );
      }
    }

    await recordDurableEventBestEffort({
      event_type: "orchestration_job_enqueued",
      project_name: row.project_name,
      source: "orchestration_api",
      summary: `Enqueued ${jobType} job ${row.id}`,
      payload: { job_id: row.id, bullmq: bullmqQueued },
    });

    return NextResponse.json(
      { job: row, bullmq_queued: bullmqQueued },
      { status: 202 }
    );
  } catch (e) {
    console.error("POST /api/orchestration/jobs", e);
    return NextResponse.json(
      { error: apiErrorMessage(e) },
      { status: 500 }
    );
  }
}
