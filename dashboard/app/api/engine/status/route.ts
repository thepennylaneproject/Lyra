import { NextResponse } from "next/server";
import { getEngineStatus } from "@/lib/audit-reader";
import {
  jobsStoreConfigured,
  listRecentAuditRuns,
} from "@/lib/orchestration-jobs";
import { listRecentRepairJobs } from "@/lib/maintenance-store";
import { apiErrorMessage } from "@/lib/api-error";

/**
 * GET /api/engine/status — return current engine status.
 *
 * Reads from:
 *   - audits/index.json (audit run history)
 *   - audits/runs/*.json (audit run detail files)
 *   - audits/repair_queue.json (pending repair jobs)
 *   - audits/repair_runs/{run_id}/cost_summary.json (repair cost data)
 */
export async function GET() {
  try {
    if (jobsStoreConfigured()) {
      const [runs, repairJobs] = await Promise.all([
        listRecentAuditRuns(100),
        listRecentRepairJobs(100),
      ]);
      return NextResponse.json({
        last_audit_date: runs[0]?.created_at ?? null,
        audit_run_count: runs.length,
        repair_run_count: repairJobs.filter((job) => job.status === "completed").length,
        total_cost_usd: repairJobs.reduce((sum, job) => sum + (job.cost_usd ?? 0), 0),
        queue_size: repairJobs.filter((job) => job.status === "queued").length,
        queued_findings: repairJobs,
        recent_repair_runs: repairJobs.filter((job) => job.status === "completed").slice(0, 5),
      });
    }
    const status = getEngineStatus();
    return NextResponse.json(status);
  } catch (e) {
    console.error("GET /api/engine/status", e);
    return NextResponse.json(
      { error: apiErrorMessage(e) },
      { status: 500 }
    );
  }
}
