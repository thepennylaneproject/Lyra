import { NextResponse } from "next/server";
import { getRepository } from "@/lib/repository-instance";
import type { Project } from "@/lib/types";
import { apiErrorMessage } from "@/lib/api-error";

type Params = { params: Promise<{ name: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    const { name } = await params;
    const repo = getRepository();
    const project = await repo.getByName(decodeURIComponent(name));
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    return NextResponse.json(project);
  } catch (e) {
    console.error("GET /api/projects/[name]", e);
    return NextResponse.json(
      { error: apiErrorMessage(e) },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request, { params }: Params) {
  try {
    const { name } = await params;
    const body = (await request.json()) as Project;
    const repo = getRepository();
    const existing = await repo.getByName(decodeURIComponent(name));
    if (!existing) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    const updated: Project = {
      name: existing.name,
      findings: Array.isArray(body.findings) ? body.findings : existing.findings,
      lastUpdated: new Date().toISOString(),
      stack: body.stack ?? existing.stack,
    };
    const project = await repo.update(updated);
    return NextResponse.json(project);
  } catch (e) {
    console.error("PUT /api/projects/[name]", e);
    return NextResponse.json(
      { error: apiErrorMessage(e) },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { name } = await params;
    const repo = getRepository();
    const existing = await repo.getByName(decodeURIComponent(name));
    if (!existing) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    await repo.delete(existing.name);
    return new NextResponse(null, { status: 204 });
  } catch (e) {
    console.error("DELETE /api/projects/[name]", e);
    return NextResponse.json(
      { error: apiErrorMessage(e) },
      { status: 500 }
    );
  }
}
