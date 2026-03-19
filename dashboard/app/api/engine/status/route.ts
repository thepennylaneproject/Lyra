import { NextResponse } from "next/server";
import { getEngineStatus } from "@/lib/audit-reader";
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
