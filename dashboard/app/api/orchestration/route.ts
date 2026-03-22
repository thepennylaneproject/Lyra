import { NextResponse } from "next/server";
import { getRepository } from "@/lib/repository-instance";
import { getEngineStatus } from "@/lib/audit-reader";
import { derivePortfolioOrchestration } from "@/lib/orchestration";
import { apiErrorMessage } from "@/lib/api-error";

export async function GET() {
  try {
    const repo = getRepository();
    const [projects, engineStatus] = await Promise.all([
      repo.list(),
      Promise.resolve(getEngineStatus()),
    ]);
    return NextResponse.json(derivePortfolioOrchestration(projects, engineStatus));
  } catch (error) {
    console.error("GET /api/orchestration", error);
    return NextResponse.json(
      { error: apiErrorMessage(error) },
      { status: 500 }
    );
  }
}
