import { NextResponse } from "next/server";
import { getRepository } from "@/lib/repository-instance";
import { parseOpenFindingsPayload } from "@/lib/repository";
import type { Project } from "@/lib/types";
import { apiErrorMessage } from "@/lib/api-error";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const projectName = typeof body.name === "string" ? body.name.trim() : "";
    if (!projectName) {
      return NextResponse.json(
        { error: "Project name is required" },
        { status: 400 }
      );
    }
    const raw =
      typeof body.json === "string"
        ? body.json
        : typeof body.open_findings !== "undefined"
          ? JSON.stringify({ open_findings: body.open_findings })
          : "";
    if (!raw) {
      return NextResponse.json(
        { error: "JSON or open_findings array is required" },
        { status: 400 }
      );
    }
    const { findings } = parseOpenFindingsPayload(raw);
    const repo = getRepository();
    const existing = await repo.getByName(projectName);
    const project: Project = {
      name: projectName,
      findings,
      lastUpdated: new Date().toISOString(),
      repositoryUrl: typeof body.repositoryUrl === "string" ? body.repositoryUrl.trim() || undefined : undefined,
      stack: existing?.stack,
    };
    if (existing) {
      await repo.update(project);
      return NextResponse.json({ project, created: false });
    }
    await repo.create(project);
    return NextResponse.json({ project, created: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (message.includes("No findings array") || message.includes("JSON")) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    console.error("POST /api/import", e);
    return NextResponse.json({ error: apiErrorMessage(e) }, { status: 500 });
  }
}
