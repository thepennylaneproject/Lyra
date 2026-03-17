import { NextResponse } from "next/server";
import { getRepository } from "@/lib/repository-instance";
import {
  isLinearConfigured,
  getIssue,
  LINEAR_TO_LYRA_STATUS,
} from "@/lib/linear";
import { getProjectSyncState, setProjectSyncState } from "@/lib/sync-state";
import type { FindingStatus } from "@/lib/types";

export async function POST(request: Request) {
  if (!isLinearConfigured()) {
    return NextResponse.json(
      { error: "Linear not configured. Set LINEAR_API_KEY and LINEAR_TEAM_ID." },
      { status: 400 }
    );
  }

  let body: { projectName?: string } = {};
  try {
    body = await request.json().catch(() => ({}));
  } catch {
    // no body
  }
  const projectName = body.projectName ?? "";
  if (!projectName.trim()) {
    return NextResponse.json(
      { error: "projectName is required" },
      { status: 400 }
    );
  }

  const repo = getRepository();
  const project = await repo.getByName(projectName.trim());
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  const syncState = await getProjectSyncState(projectName);
  const mappings = syncState.mappings;
  if (Object.keys(mappings).length === 0) {
    return NextResponse.json({
      pulled: 0,
      message: "No synced issues. Run push first.",
    });
  }

  const findings = [...(project.findings ?? [])];
  let pulled = 0;

  for (const [fid, info] of Object.entries(mappings)) {
    const linearId = info.linear_id;
    if (!linearId) continue;

    let issue: { state?: { name?: string } } | null = null;
    try {
      issue = await getIssue(linearId);
    } catch {
      continue;
    }
    if (!issue) continue;

    const linearState = issue.state?.name ?? "";
    const lyraStatus = LINEAR_TO_LYRA_STATUS[linearState] as FindingStatus | undefined;
    if (!lyraStatus) continue;

    const index = findings.findIndex((f) => f.finding_id === fid);
    if (index === -1) continue;

    const f = findings[index];
    if (f.status === lyraStatus) continue;

    f.status = lyraStatus;
    f.history = f.history ?? [];
    f.history.push({
      timestamp: new Date().toISOString(),
      actor: "linear-sync",
      event: "note_added",
      notes: `Status synced from Linear (${info.identifier ?? "?"}): ${linearState} -> ${lyraStatus}`,
    });
    info.lyra_status = lyraStatus;
    info.last_synced = new Date().toISOString();
    pulled += 1;
  }

  await repo.update({
    ...project,
    findings,
    lastUpdated: new Date().toISOString(),
  });
  await setProjectSyncState(projectName, {
    mappings,
    last_sync: new Date().toISOString(),
  });

  return NextResponse.json({ pulled });
}
