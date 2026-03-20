import { NextResponse } from "next/server";
import { Queue } from "bullmq";
import { bullmqConnectionFromEnv } from "@/lib/redis-bullmq";
import { failAllQueuedJobs, jobsStoreConfigured } from "@/lib/orchestration-jobs";
import { recordDurableEventBestEffort } from "@/lib/durable-state";
import { apiErrorMessage } from "@/lib/api-error";

const CANCEL_MSG =
  "Cancelled: queue cleared from dashboard (BullMQ + DB queued rows).";

/**
 * POST — obliterate BullMQ `lyra-audit` (if Redis configured) and mark all DB
 * `queued` jobs as failed. Auth is handled centrally by middleware.
 */
export async function POST(request: Request) {
  if (!jobsStoreConfigured()) {
    return NextResponse.json(
      { error: "DATABASE_URL required for orchestration jobs" },
      { status: 503 }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const skipRedis = body.skip_redis === true;

    let bullmqCleared = false;
    let bullmqError: string | null = null;

    const connection = bullmqConnectionFromEnv();
    if (connection && !skipRedis) {
      const queue = new Queue("lyra-audit", { connection });
      try {
        await queue.obliterate({ force: true });
        bullmqCleared = true;
      } catch (e) {
        bullmqError =
          e instanceof Error ? e.message : String(e);
        console.warn("[orchestration/queue/clear] BullMQ obliterate failed:", bullmqError);
      } finally {
        await queue.close();
      }
    }

    const dbCancelled = await failAllQueuedJobs(CANCEL_MSG);

    await recordDurableEventBestEffort({
      event_type: "orchestration_queue_cleared",
      project_name: null,
      source: "orchestration_api",
      summary: `Cleared orchestration queue (${dbCancelled} DB jobs cancelled${bullmqCleared ? ", BullMQ obliterated" : ""})`,
      payload: {
        db_queued_marked_failed: dbCancelled,
        bullmq_obliterated: bullmqCleared,
        bullmq_error: bullmqError,
      },
    });

    return NextResponse.json({
      ok: true,
      db_queued_marked_failed: dbCancelled,
      bullmq_obliterated: bullmqCleared,
      bullmq_error: bullmqError,
    });
  } catch (e) {
    console.error("POST /api/orchestration/queue/clear", e);
    return NextResponse.json(
      { error: apiErrorMessage(e) },
      { status: 500 }
    );
  }
}
