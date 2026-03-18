import type { Project } from "./types";
import type { ProjectsRepository } from "./repository";
import { recordDurableEvent, recordProjectSnapshot } from "./durable-state";
import { dispatchGithubControlPlane } from "./github-control-plane";

const ISSUE_LABEL = "lyra-open-findings";
const ISSUE_TITLE_PREFIX = "[LYRA OPEN FINDINGS]";
const JSON_MARKER = "LYRA_PROJECT_JSON";

interface GithubConfig {
  owner: string;
  repo: string;
  token: string;
}

interface GithubIssue {
  number: number;
  title: string;
  body: string | null;
  state: string;
  labels: Array<{ name: string }>;
  html_url: string;
}

function readConfig(): GithubConfig {
  const owner = process.env.LYRA_GITHUB_OWNER?.trim() ?? "";
  const repo = process.env.LYRA_GITHUB_REPO?.trim() ?? "";
  const token = process.env.LYRA_GITHUB_TOKEN?.trim() ?? "";

  if (!owner || !repo || !token) {
    throw new Error("LYRA_GITHUB_OWNER, LYRA_GITHUB_REPO, and LYRA_GITHUB_TOKEN are required");
  }

  return { owner, repo, token };
}

function apiBase(config: GithubConfig): string {
  return `https://api.github.com/repos/${encodeURIComponent(config.owner)}/${encodeURIComponent(config.repo)}`;
}

async function githubRequest(path: string, init?: RequestInit): Promise<Response> {
  const config = readConfig();
  const res = await fetch(`${apiBase(config)}${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${config.token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  return res;
}

function issueTitle(name: string): string {
  return `${ISSUE_TITLE_PREFIX} ${name}`;
}

function projectToBody(project: Project): string {
  const payload = JSON.stringify(project, null, 2);
  return `# ${project.name}

GitHub-backed open findings for \`${project.name}\`.

- Repository: ${project.repositoryUrl ?? "not set"}
- Findings: ${project.findings.length}
- Last updated: ${project.lastUpdated ?? "unknown"}

<!-- ${JSON_MARKER}
${payload}
-->`;
}

function extractProject(body: string | null, fallbackTitle: string): Project | null {
  if (!body) return null;
  const match = body.match(
    new RegExp(`<!-- ${JSON_MARKER}\\n([\\s\\S]*?)\\n-->`)
  );
  if (!match) return null;
  const parsed = JSON.parse(match[1]) as Project;
  if (!parsed.name) {
    parsed.name = fallbackTitle.replace(`${ISSUE_TITLE_PREFIX} `, "");
  }
  if (!Array.isArray(parsed.findings)) {
    parsed.findings = [];
  }
  return parsed;
}

async function listIssues(): Promise<GithubIssue[]> {
  const res = await githubRequest(`/issues?labels=${encodeURIComponent(ISSUE_LABEL)}&state=open&per_page=100`);
  if (!res.ok) {
    throw new Error(`GitHub findings query failed (${res.status})`);
  }
  const issues = (await res.json()) as GithubIssue[];
  return Array.isArray(issues) ? issues.filter((issue) => !("pull_request" in issue)) : [];
}

async function findIssueByProjectName(name: string): Promise<GithubIssue | null> {
  const issues = await listIssues();
  return issues.find((issue) => issue.title === issueTitle(name)) ?? null;
}

function issueToProject(issue: GithubIssue): Project | null {
  const parsed = extractProject(issue.body, issue.title);
  if (parsed) return parsed;

  return {
    name: issue.title.replace(`${ISSUE_TITLE_PREFIX} `, ""),
    findings: [],
    lastUpdated: issue.body ? new Date().toISOString() : undefined,
  };
}

export function hasGithubIssueRepository(): boolean {
  return Boolean(
    process.env.LYRA_GITHUB_OWNER?.trim() &&
      process.env.LYRA_GITHUB_REPO?.trim() &&
      process.env.LYRA_GITHUB_TOKEN?.trim()
  );
}

export function createGithubIssueRepository(): ProjectsRepository {
  return {
    async list() {
      const issues = await listIssues();
      return issues
        .map((issue) => issueToProject(issue))
        .filter((project): project is Project => project !== null);
    },

    async getByName(name: string) {
      const issue = await findIssueByProjectName(name);
      return issue ? issueToProject(issue) : null;
    },

    async create(project: Project) {
      const issue = await findIssueByProjectName(project.name);
      if (issue) {
        throw new Error(`Project ${project.name} already exists`);
      }

      const res = await githubRequest("/issues", {
        method: "POST",
        body: JSON.stringify({
          title: issueTitle(project.name),
          body: projectToBody({ ...project, lastUpdated: new Date().toISOString() }),
          labels: [ISSUE_LABEL],
        }),
      });

      if (!res.ok) {
        throw new Error(`GitHub project create failed (${res.status})`);
      }

      await Promise.all([
        recordProjectSnapshot(
          { ...project, lastUpdated: new Date().toISOString() },
          "github_issue_store",
          "project_created"
        ),
        recordDurableEvent({
          event_type: "project_created",
          project_name: project.name,
          source: "github_issue_store",
          summary: "Created project issue-backed snapshot",
          payload: { finding_count: project.findings.length },
        }),
      ]);

      await dispatchGithubControlPlane("onboard_project", project.name, project.repositoryUrl);
      await recordDurableEvent({
        event_type: "onboard_project",
        project_name: project.name,
        source: "github_issue_store",
        summary: "Dispatched initial onboarding audit",
      });

      return {
        ...project,
        lastUpdated: new Date().toISOString(),
      };
    },

    async update(project: Project) {
      const issue = await findIssueByProjectName(project.name);
      if (!issue) {
        throw new Error(`Project ${project.name} not found`);
      }

      const updated: Project = {
        ...project,
        lastUpdated: new Date().toISOString(),
      };

      const res = await githubRequest(`/issues/${issue.number}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: issueTitle(updated.name),
          body: projectToBody(updated),
          labels: [ISSUE_LABEL],
        }),
      });

      if (!res.ok) {
        throw new Error(`GitHub project update failed (${res.status})`);
      }

      await Promise.all([
        recordProjectSnapshot(updated, "github_issue_store", "project_updated"),
        recordDurableEvent({
          event_type: "project_updated",
          project_name: updated.name,
          source: "github_issue_store",
          summary: "Updated project issue-backed snapshot",
          payload: { finding_count: updated.findings.length },
        }),
      ]);

      return updated;
    },

    async delete(name: string) {
      const issue = await findIssueByProjectName(name);
      if (!issue) {
        throw new Error(`Project ${name} not found`);
      }

      const res = await githubRequest(`/issues/${issue.number}`, {
        method: "PATCH",
        body: JSON.stringify({ state: "closed" }),
      });

      if (!res.ok) {
        throw new Error(`GitHub project delete failed (${res.status})`);
      }

      await recordDurableEvent({
        event_type: "project_deleted",
        project_name: name,
        source: "github_issue_store",
        summary: "Closed project issue",
      });
    },
  };
}
