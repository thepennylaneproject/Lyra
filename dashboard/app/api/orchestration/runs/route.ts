import { NextResponse } from "next/server";
import {
  jobsStoreConfigured,
  listAuditJobsForProject,
  listAuditRunsForProject,
} from "@/lib/orchestration-jobs";
import { apiErrorMessage } from "@/lib/api-error";

function enqueueSecret(): string {
  return (
    process.env.ORCHESTRATION_ENQUEUE_SECRET?.trim() ||
    process.env.DASHBOARD_API_SECRET?.trim() ||
    ""
  );
}

/**
 * GET ?project=Name — recent lyra_audit_runs + lyra_audit_jobs for that project.
 * Auth: same middleware as other /api routes (cookie or Bearer).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const project = searchParams.get("project")?.trim() ?? "";
  if (!project) {
    return NextResponse.json(
      { error: "project query parameter is required" },
      { status: 400 }
    );
  }

  if (!jobsStoreConfigured()) {
    return NextResponse.json({
      configured: false,
      enqueue_auth_optional: false,
      runs: [],
      jobs: [],
    });
  }

  try {
    const [runs, jobs] = await Promise.all([
      listAuditRunsForProject(project, 30),
      listAuditJobsForProject(project, 20),
    ]);
    return NextResponse.json({
      configured: true,
      enqueue_auth_optional:
        process.env.NODE_ENV === "development" && !enqueueSecret(),
      runs,
      jobs,
    });
  } catch (e) {
    console.error("GET /api/orchestration/runs", e);
    return NextResponse.json(
      { error: apiErrorMessage(e) },
      { status: 500 }
    );
  }
}
