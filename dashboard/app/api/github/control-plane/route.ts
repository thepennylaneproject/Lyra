import { NextResponse } from "next/server";
import {
  dispatchGithubControlPlane,
  fetchGithubControlPlane,
  type ControlPlaneAction,
} from "@/lib/github-control-plane";
import { recordDurableEvent } from "@/lib/durable-state";

function normalizeAction(value: unknown): ControlPlaneAction | null {
  return value === "onboard_project" ||
    value === "re_audit_project" ||
    value === "synthesize_project" ||
    value === "audit_project"
    ? value
    : null;
}

export async function GET() {
  try {
    const state = await fetchGithubControlPlane();
    return NextResponse.json(state);
  } catch (e) {
    console.error("GET /api/github/control-plane", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const action = normalizeAction(body.action);
    const projectName =
      typeof body.project_name === "string" && body.project_name.trim()
        ? body.project_name.trim()
        : undefined;
    const repositoryUrl =
      typeof body.repository_url === "string" && body.repository_url.trim()
        ? body.repository_url.trim()
        : undefined;

    if (!action) {
      return NextResponse.json(
        { error: "action must be one of onboard_project, re_audit_project, synthesize_project, or audit_project" },
        { status: 400 }
      );
    }

    const result = await dispatchGithubControlPlane(action, projectName, repositoryUrl);
    await recordDurableEvent({
      event_type: action,
      project_name: projectName ?? null,
      source: "github_control_plane",
      summary: `Dispatched ${action} via dashboard`,
      payload: { action, project_name: projectName ?? null, repository_url: repositoryUrl ?? null },
    });
    return NextResponse.json(result, { status: 202 });
  } catch (e) {
    console.error("POST /api/github/control-plane", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
