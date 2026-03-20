import { NextResponse } from "next/server";
import { getRepository } from "@/lib/repository-instance";
import { apiErrorMessage } from "@/lib/api-error";
import {
  createDraftProjectFromRepository,
  deriveProjectName,
  type OnboardRepositoryInput,
} from "@/lib/onboarding";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as OnboardRepositoryInput;
    if (!body?.repository_url?.trim() && !body?.local_path?.trim()) {
      return NextResponse.json(
        { error: "repository_url or local_path is required" },
        { status: 400 }
      );
    }

    const repo = getRepository();
    const projectName = deriveProjectName(body);
    const existing = await repo.getByName(projectName);
    if (existing && existing.status === "active") {
      return NextResponse.json(
        { error: `Project ${existing.name} already exists and is active` },
        { status: 409 }
      );
    }

    const draft = createDraftProjectFromRepository({
      ...body,
      name: body.name?.trim() || projectName,
    });

    if (existing) {
      const updated = await repo.update({
        ...existing,
        ...draft,
        name: existing.name,
        findings: existing.findings ?? [],
      });
      return NextResponse.json({ project: updated, created: false });
    }

    const created = await repo.create(draft);
    return NextResponse.json({ project: created, created: true }, { status: 201 });
  } catch (e) {
    console.error("POST /api/onboarding", e);
    return NextResponse.json(
      { error: apiErrorMessage(e) },
      { status: 500 }
    );
  }
}
