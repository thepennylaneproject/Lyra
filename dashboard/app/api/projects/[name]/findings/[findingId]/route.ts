import { NextResponse } from "next/server";
import { getRepository } from "@/lib/repository-instance";
import type { Finding } from "@/lib/types";
import { apiErrorMessage } from "@/lib/api-error";

type Params = { params: Promise<{ name: string; findingId: string }> };

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { name, findingId } = await params;
    const id = decodeURIComponent(findingId);
    const body = (await request.json()) as Partial<Finding>;
    const repo = getRepository();
    const project = await repo.getByName(decodeURIComponent(name));
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    const findings = project.findings ?? [];
    const index = findings.findIndex((f) => f.finding_id === id);
    if (index === -1) {
      return NextResponse.json({ error: "Finding not found" }, { status: 404 });
    }
    const existing = findings[index];
    const updatedFinding: Finding = {
      ...existing,
      ...body,
      finding_id: existing.finding_id,
    };
    if (body.status !== undefined) {
      const history = [...(existing.history ?? [])];
      history.push({
        timestamp: new Date().toISOString(),
        actor: "dashboard",
        event: String(body.status),
        notes: `Status changed to ${body.status}`,
      });
      updatedFinding.history = history;
    }
    const newFindings = [...findings];
    newFindings[index] = updatedFinding;
    await repo.update({ ...project, findings: newFindings });
    return NextResponse.json(updatedFinding);
  } catch (e) {
    console.error("PATCH /api/projects/[name]/findings/[findingId]", e);
    return NextResponse.json(
      { error: apiErrorMessage(e) },
      { status: 500 }
    );
  }
}
