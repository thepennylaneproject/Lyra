import { NextResponse } from "next/server";
import { getRepository } from "@/lib/repository-instance";
import { getEngineStatus } from "@/lib/audit-reader";
import { derivePortfolioOrchestration } from "@/lib/orchestration";

export async function GET() {
  try {
    const repo = getRepository();
    const [projects, engineStatus] = await Promise.all([
      repo.list(),
      Promise.resolve(getEngineStatus()),
    ]);
    return NextResponse.json(derivePortfolioOrchestration(projects, engineStatus));
  } catch (e) {
    console.error("GET /api/orchestration", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
