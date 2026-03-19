import { NextResponse } from "next/server";
import { getRepository } from "@/lib/repository-instance";
import type { Finding } from "@/lib/types";
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
    return NextResponse.json(project.findings ?? []);
  } catch (e) {
    console.error("GET /api/projects/[name]/findings", e);
    return NextResponse.json(
      { error: apiErrorMessage(e) },
      { status: 500 }
    );
  }
}

export async function POST(request: Request, { params }: Params) {
  try {
    const { name } = await params;
    const body = (await request.json()) as Finding;
    const repo = getRepository();
    const project = await repo.getByName(decodeURIComponent(name));
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    const findings = project.findings ?? [];
    if (!body.finding_id?.trim()) {
      return NextResponse.json(
        { error: "finding_id is required" },
        { status: 400 }
      );
    }
    const updated = [...findings, body];
    await repo.update({ ...project, findings: updated });
    return NextResponse.json(body);
  } catch (e) {
    console.error("POST /api/projects/[name]/findings", e);
    return NextResponse.json(
      { error: apiErrorMessage(e) },
      { status: 500 }
    );
  }
}
