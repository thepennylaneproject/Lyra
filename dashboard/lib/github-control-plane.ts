export type ControlPlaneAction =
  | "onboard_project"
  | "re_audit_project"
  | "synthesize_project"
  | "audit_project";

export interface GithubConfig {
  configured: boolean;
  owner: string;
  repo: string;
  workflow: string;
  missing: string[];
}

export interface GithubIssueSummary {
  number: number;
  title: string;
  state: string;
  html_url: string;
  created_at: string;
  updated_at: string;
}

export interface GithubWorkflowRunSummary {
  id: number;
  name: string;
  event: string;
  status: string;
  conclusion: string | null;
  html_url: string;
  created_at: string;
  updated_at: string;
  run_number: number;
  head_branch: string | null;
}

export interface GithubArtifactSummary {
  id: number;
  name: string;
  size_in_bytes: number;
  archive_download_url: string;
  expired: boolean;
  created_at: string;
  updated_at: string;
}

export interface GithubControlPlaneState {
  configured: boolean;
  owner: string;
  repo: string;
  workflow: string;
  missing: string[];
  open_audit_issues: number;
  latest_audit_issue: GithubIssueSummary | null;
  recent_workflow_runs: GithubWorkflowRunSummary[];
  latest_workflow_run: GithubWorkflowRunSummary | null;
  latest_artifacts: GithubArtifactSummary[];
}

const SUPPORTED_ACTIONS = new Set<ControlPlaneAction>([
  "onboard_project",
  "re_audit_project",
  "synthesize_project",
  "audit_project",
]);

function readGithubConfig(): GithubConfig {
  const owner = process.env.LYRA_GITHUB_OWNER?.trim() ?? "";
  const repo = process.env.LYRA_GITHUB_REPO?.trim() ?? "";
  const workflow = process.env.LYRA_GITHUB_WORKFLOW?.trim() ?? "scheduled-audit.yml";
  const missing: string[] = [];

  if (!owner) missing.push("LYRA_GITHUB_OWNER");
  if (!repo) missing.push("LYRA_GITHUB_REPO");
  if (!process.env.LYRA_GITHUB_TOKEN?.trim()) missing.push("LYRA_GITHUB_TOKEN");

  return {
    configured: missing.length === 0,
    owner,
    repo,
    workflow,
    missing,
  };
}

async function githubFetch(path: string, init?: RequestInit): Promise<Response> {
  const token = process.env.LYRA_GITHUB_TOKEN?.trim();
  if (!token) {
    throw new Error("LYRA_GITHUB_TOKEN is required for GitHub control-plane access");
  }

  const res = await fetch(`https://api.github.com${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  return res;
}

function mapIssue(issue: {
  number: number;
  title: string;
  state: string;
  html_url: string;
  created_at: string;
  updated_at: string;
}): GithubIssueSummary {
  return {
    number: issue.number,
    title: issue.title,
    state: issue.state,
    html_url: issue.html_url,
    created_at: issue.created_at,
    updated_at: issue.updated_at,
  };
}

function mapRun(run: {
  id: number;
  name: string;
  event: string;
  status: string;
  conclusion: string | null;
  html_url: string;
  created_at: string;
  updated_at: string;
  run_number: number;
  head_branch: string | null;
}): GithubWorkflowRunSummary {
  return {
    id: run.id,
    name: run.name,
    event: run.event,
    status: run.status,
    conclusion: run.conclusion,
    html_url: run.html_url,
    created_at: run.created_at,
    updated_at: run.updated_at,
    run_number: run.run_number,
    head_branch: run.head_branch,
  };
}

export function getGithubConfig(): GithubConfig {
  return readGithubConfig();
}

export async function fetchGithubControlPlane(): Promise<GithubControlPlaneState> {
  const config = readGithubConfig();
  if (!config.configured) {
  return {
      ...config,
      open_audit_issues: 0,
      latest_audit_issue: null,
      recent_workflow_runs: [],
      latest_workflow_run: null,
      latest_artifacts: [],
    };
  }

  const [issuesRes, runsRes] = await Promise.all([
    githubFetch(
      `/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}/issues?labels=audit&state=open&per_page=25`
    ),
    githubFetch(
      `/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}/actions/workflows/${encodeURIComponent(config.workflow)}/runs?per_page=10`
    ),
  ]);

  if (!issuesRes.ok) {
    throw new Error(`GitHub issues query failed (${issuesRes.status})`);
  }
  if (!runsRes.ok) {
    throw new Error(`GitHub workflow query failed (${runsRes.status})`);
  }

  const issues = (await issuesRes.json()) as Array<{
    number: number;
    title: string;
    state: string;
    html_url: string;
    created_at: string;
    updated_at: string;
  }>;
  const runs = (await runsRes.json()) as {
    workflow_runs?: Array<{
      id: number;
      name: string;
      event: string;
      status: string;
      conclusion: string | null;
      html_url: string;
      created_at: string;
      updated_at: string;
      run_number: number;
      head_branch: string | null;
    }>;
  };

  const recentWorkflowRuns = Array.isArray(runs.workflow_runs)
    ? runs.workflow_runs.map(mapRun)
    : [];
  const latestWorkflowRun = recentWorkflowRuns[0] ?? null;
  let latestArtifacts: GithubArtifactSummary[] = [];
  if (latestWorkflowRun) {
    const artifactsRes = await githubFetch(
      `/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}/actions/runs/${latestWorkflowRun.id}/artifacts?per_page=10`
    );
    if (!artifactsRes.ok) {
      throw new Error(`GitHub artifacts query failed (${artifactsRes.status})`);
    }
    const artifacts = (await artifactsRes.json()) as {
      artifacts?: Array<{
        id: number;
        name: string;
        size_in_bytes: number;
        archive_download_url: string;
        expired: boolean;
        created_at: string;
        updated_at: string;
      }>;
    };
    latestArtifacts = Array.isArray(artifacts.artifacts)
      ? artifacts.artifacts.map((artifact) => ({
          id: artifact.id,
          name: artifact.name,
          size_in_bytes: artifact.size_in_bytes,
          archive_download_url: artifact.archive_download_url,
          expired: artifact.expired,
          created_at: artifact.created_at,
          updated_at: artifact.updated_at,
        }))
      : [];
  }

  return {
    ...config,
    open_audit_issues: issues.length,
    latest_audit_issue: issues[0] ? mapIssue(issues[0]) : null,
    recent_workflow_runs: recentWorkflowRuns,
    latest_workflow_run: latestWorkflowRun,
    latest_artifacts: latestArtifacts,
  };
}

export async function dispatchGithubControlPlane(
  action: ControlPlaneAction,
  projectName?: string,
  repositoryUrl?: string
): Promise<{ dispatched: true; action: ControlPlaneAction; project_name: string | null }> {
  if (!SUPPORTED_ACTIONS.has(action)) {
    throw new Error(`Unsupported GitHub control-plane action: ${action}`);
  }

  const config = readGithubConfig();
  if (!config.configured) {
    throw new Error(`GitHub control plane is not configured: ${config.missing.join(", ")}`);
  }

  const res = await githubFetch(
    `/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}/dispatches`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
        body: JSON.stringify({
          event_type: action,
          client_payload: {
            action,
            project_name: projectName ?? null,
            repository_url: repositoryUrl ?? null,
            source: "dashboard",
          },
        }),
    }
  );

  if (!res.ok) {
    throw new Error(`GitHub dispatch failed (${res.status})`);
  }

  return {
    dispatched: true,
    action,
    project_name: projectName ?? null,
  };
}
