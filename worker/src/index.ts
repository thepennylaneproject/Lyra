import "dotenv/config";
import { createRequire } from "node:module";
import { Worker } from "bullmq";
import { createPool } from "./db.js";
import { processJob } from "./process-job.js";

const require = createRequire(import.meta.url);
// CJS default export — avoids ESM construct signature issues
const IoRedis = require("ioredis") as new (
  url: string,
  opts?: { maxRetriesPerRequest?: null }
) => import("ioredis").Redis;

const redisUrl =
  process.env.REDIS_URL?.trim() || process.env.LYRA_REDIS_URL?.trim();
const pollMs = Number(process.env.LYRA_JOB_POLL_MS?.trim() || "8000");

async function main() {
  const pool = createPool();
  console.log("[lyra-worker] started, repo root:", process.env.LYRA_REPO_ROOT || "(auto)");

  const runOne = async (dbJobId: string) => {
    try {
      await processJob(pool, dbJobId);
    } catch (e) {
      console.error("[lyra-worker] processJob error", e);
    }
  };

  if (redisUrl) {
    const connection = new IoRedis(redisUrl, {
      maxRetriesPerRequest: null,
    });
    const worker = new Worker(
      "lyra-audit",
      async (job) => {
        const id = (job.data as { dbJobId?: string }).dbJobId;
        if (!id) {
          console.warn("[lyra-worker] job missing dbJobId");
          return;
        }
        await runOne(id);
      },
      // bullmq bundles ioredis; avoid duplicate-package ConnectionOptions clash
      { connection: connection as never, concurrency: 1 }
    );
    worker.on("failed", (j, err) => {
      console.error("[lyra-worker] bullmq failed", j?.id, err);
    });
    console.log("[lyra-worker] BullMQ listening on queue lyra-audit");
  } else {
    console.log(
      "[lyra-worker] REDIS_URL not set; polling lyra_audit_jobs every",
      pollMs,
      "ms"
    );
    const poll = async () => {
      try {
        const r = await pool.query(
          `SELECT id FROM lyra_audit_jobs WHERE status = 'queued' ORDER BY created_at ASC LIMIT 1`
        );
        if (r.rows[0]?.id) {
          await runOne(String(r.rows[0].id));
        }
      } catch (e) {
        console.error("[lyra-worker] poll error", e);
      }
    };
    setInterval(poll, pollMs);
    await poll();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
