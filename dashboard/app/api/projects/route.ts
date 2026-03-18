import { NextResponse } from "next/server";
import { getRepository } from "@/lib/repository-instance";
import type { Project } from "@/lib/types";

export async function GET() {
  try {
    const repo = getRepository();
    const projects = await repo.list();
    return NextResponse.json(projects);
  } catch (e) {
    console.error("GET /api/projects", e);
    return NextResponse.json(
      { error: String(e) },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Project;
    if (!body?.name?.trim()) {
      return NextResponse.json(
        { error: "Project name is required" },
        { status: 400 }
      );
    }
    const repo = getRepository();
    const project: Project = {
      name: body.name.trim(),
      findings: Array.isArray(body.findings) ? body.findings : [],
      lastUpdated: new Date().toISOString(),
      repositoryUrl: typeof body.repositoryUrl === "string" ? body.repositoryUrl.trim() || undefined : undefined,
      stack: body.stack,
    };
    const created = await repo.create(project);
    return NextResponse.json(created);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (message.includes("already exists")) {
      return NextResponse.json({ error: message }, { status: 409 });
    }
    console.error("POST /api/projects", e);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
