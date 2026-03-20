import { NextResponse } from "next/server";
import { getRepository } from "@/lib/repository-instance";
import { parseOpenFindingsPayload } from "@/lib/repository";
import type { Project, Finding } from "@/lib/types";
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
    const { findings: importedFindings } = parseOpenFindingsPayload(raw);

    // mode: "merge" (default) merges by finding_id; "replace" overwrites all findings.
    const mode: "merge" | "replace" =
      body.mode === "replace" ? "replace" : "merge";

    const repo = getRepository();
    const existing = await repo.getByName(projectName);

    let findings: Finding[];
    let added = 0;
    let removed = 0;
    let skipped = 0;

    if (mode === "replace") {
      removed = existing ? (existing.findings?.length ?? 0) : 0;
      added = importedFindings.length;
      findings = importedFindings;
    } else {
      // Merge by finding_id: add new, skip duplicates (existing findings are preserved as-is)
      const existingFindings = existing?.findings ?? [];
      const existingById = new Map(existingFindings.map((f) => [f.finding_id, f]));
      for (const f of importedFindings) {
        if (!existingById.has(f.finding_id)) {
          existingById.set(f.finding_id, f);
          added += 1;
        } else {
          skipped += 1;
        }
      }
      findings = [...existingById.values()];
    }

    const project: Project = {
      name: projectName,
      findings: mergedFindings,
      lastUpdated: new Date().toISOString(),
      repositoryUrl:
        typeof body.repositoryUrl === "string"
          ? body.repositoryUrl.trim() || undefined
          : existing?.repositoryUrl,
      stack: existing?.stack,
    };

    if (existing) {
      await repo.update(project);
      return NextResponse.json({ project, created: false, mode, added, removed, skipped });
    }
    await repo.create(project);
    return NextResponse.json({ project, created: true, mode, added, removed: 0, skipped: 0 });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    if (message.includes("No findings array") || message.includes("JSON")) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    console.error("POST /api/import", e);
    return NextResponse.json({ error: apiErrorMessage(e) }, { status: 500 });
  }
}
