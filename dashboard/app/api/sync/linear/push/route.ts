import { NextResponse } from "next/server";
import { getRepository } from "@/lib/repository-instance";
import { apiErrorMessage } from "@/lib/api-error";
import {
  isLinearConfigured,
  getTeamStates,
  createIssue,
  updateIssueState,
  LYRA_TO_LINEAR_STATUS,
  findingToLinearTitle,
  findingToDescription,
  getLinearPriority,
  getEnvLabelId,
  getEnvProjectId,
} from "@/lib/linear";
import {
  getProjectSyncState,
  setProjectSyncState,
} from "@/lib/sync-state";

export async function POST(request: Request) {
  if (!isLinearConfigured()) {
    return NextResponse.json(
      { error: "Linear not configured. Set LINEAR_API_KEY and LINEAR_TEAM_ID." },
      { status: 400 }
    );
  }

  let body: { projectName?: string; dryRun?: boolean } = {};
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

  const findings = project.findings ?? [];
  const dryRun = body.dryRun === true;

  let states: Record<string, string> = {};
  if (!dryRun) {
    try {
      states = await getTeamStates();
    } catch (e) {
      console.error("sync/linear/push getTeamStates", e);
      return NextResponse.json(
        { error: apiErrorMessage(e) },
        { status: 502 }
      );
    }
  }

  const syncState = await getProjectSyncState(projectName);
  const mappings = { ...syncState.mappings };
  const labelIds = getEnvLabelId() ? [getEnvLabelId()!] : undefined;
  const projectId = getEnvProjectId(projectName) ?? undefined;

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const f of findings) {
    const fid = f.finding_id;
    const status = f.status;

    // Only skip genuinely terminal states; let 'open' sync to Linear Backlog/Todo
    if (["fixed_verified", "wont_fix", "duplicate"].includes(status)) {
      skipped += 1;
      continue;
    }

    const title = findingToLinearTitle(f);
    const priority = getLinearPriority(f);
    const linearStateName = LYRA_TO_LINEAR_STATUS[status] ?? "Backlog";
    const stateId = states[linearStateName] ?? "";

    if (fid in mappings) {
      const existing = mappings[fid];
      if (existing.lyra_status !== status) {
        if (dryRun) {
          updated += 1;
        } else if (stateId && (await updateIssueState(existing.linear_id, stateId))) {
          existing.lyra_status = status;
          existing.last_synced = new Date().toISOString();
          updated += 1;
        }
      } else {
        skipped += 1;
      }
    } else {
      if (dryRun) {
        created += 1;
      } else {
        const description = findingToDescription(f);
        const issue = await createIssue({
          title,
          description,
          priority,
          stateId: stateId || undefined,
          labelIds,
          projectId,
        });
        if (issue) {
          mappings[fid] = {
            linear_id: issue.id,
            identifier: issue.identifier,
            url: issue.url,
            lyra_status: status,
            created_at: new Date().toISOString(),
            last_synced: new Date().toISOString(),
          };
          // Persist mapping immediately after each successful issue creation
          // so a partial failure doesn't cause duplicates on retry.
          await setProjectSyncState(projectName, {
            mappings,
            last_sync: syncState.last_sync,
          });
          created += 1;
        }
      }
    }
  }

  if (!dryRun) {
    await setProjectSyncState(projectName, {
      mappings,
      last_sync: new Date().toISOString(),
    });
  }

  return NextResponse.json({
    created,
    updated,
    skipped,
    dryRun,
  });
}
