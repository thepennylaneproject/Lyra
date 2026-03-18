/**
 * Linear API client for syncing LYRA findings. Mirrors linear_sync.py mappings.
 */

import type { Finding, FindingStatus } from "./types";

const LINEAR_API = "https://api.linear.app/graphql";

export const LYRA_TO_LINEAR_STATUS: Record<FindingStatus, string> = {
  open: "Backlog",
  accepted: "Todo",
  in_progress: "In Progress",
  fixed_pending_verify: "In Progress",
  fixed_verified: "Done",
  wont_fix: "Cancelled",
  deferred: "Backlog",
  duplicate: "Cancelled",
  converted_to_enhancement: "Backlog",
};

export const LINEAR_TO_LYRA_STATUS: Record<string, FindingStatus> = {
  Backlog: "open",
  Triage: "open",
  Todo: "accepted",
  "In Progress": "in_progress",
  "In Review": "fixed_pending_verify",
  Done: "fixed_verified",
  Cancelled: "wont_fix",
};

const PRIORITY_MAP: Record<string, number> = { P0: 1, P1: 2, P2: 3, P3: 4 };
const SEVERITY_PREFIX: Record<string, string> = {
  blocker: "[BLOCKER]",
  major: "[MAJOR]",
  minor: "[MINOR]",
  nit: "[NIT]",
};

function getEnv(key: string): string {
  return (process.env[key] ?? "").trim();
}

export function isLinearConfigured(): boolean {
  return !!(getEnv("LINEAR_API_KEY") && getEnv("LINEAR_TEAM_ID"));
}

async function gql(query: string, variables?: Record<string, unknown>): Promise<unknown> {
  const apiKey = getEnv("LINEAR_API_KEY");
  if (!apiKey) throw new Error("LINEAR_API_KEY not set");

  const res = await fetch(LINEAR_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: apiKey,
    },
    body: JSON.stringify({ query, variables: variables ?? {} }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Linear API error (${res.status}): ${text}`);
  }
  return res.json() as Promise<{ data?: unknown; errors?: unknown[] }>;
}

export async function getTeamStates(): Promise<Record<string, string>> {
  const teamId = getEnv("LINEAR_TEAM_ID");
  if (!teamId) throw new Error("LINEAR_TEAM_ID not set");

  const result = (await gql(
    `query($teamId: String!) {
      team(id: $teamId) {
        states { nodes { id name type } }
      }
    }`,
    { teamId }
  )) as { data?: { team?: { states?: { nodes?: { id: string; name: string }[] } } } };

  const nodes = result.data?.team?.states?.nodes ?? [];
  return Object.fromEntries(nodes.map((s) => [s.name, s.id]));
}

export async function createIssue(params: {
  title: string;
  description: string;
  priority: number;
  stateId?: string;
  labelIds?: string[];
  projectId?: string;
}): Promise<{ id: string; identifier?: string; url?: string } | null> {
  const teamId = getEnv("LINEAR_TEAM_ID");
  if (!teamId) throw new Error("LINEAR_TEAM_ID not set");

  const variables: Record<string, unknown> = {
    teamId,
    title: params.title,
    description: params.description,
    priority: params.priority,
  };
  if (params.stateId) variables.stateId = params.stateId;
  if (params.labelIds?.length) variables.labelIds = params.labelIds;
  if (params.projectId) variables.projectId = params.projectId;

  const result = (await gql(
    `mutation($teamId: String!, $title: String!, $description: String!,
             $priority: Int, $stateId: String, $labelIds: [String!],
             $projectId: String) {
      issueCreate(input: {
        teamId: $teamId
        title: $title
        description: $description
        priority: $priority
        stateId: $stateId
        labelIds: $labelIds
        projectId: $projectId
      }) {
        success
        issue { id identifier url }
      }
    }`,
    variables
  )) as { data?: { issueCreate?: { success?: boolean; issue?: { id: string; identifier?: string; url?: string } } } };

  const issueCreate = result.data?.issueCreate;
  if (issueCreate?.success && issueCreate.issue) return issueCreate.issue;
  return null;
}

export async function updateIssueState(issueId: string, stateId: string): Promise<boolean> {
  const result = (await gql(
    `mutation($issueId: String!, $stateId: String!) {
      issueUpdate(id: $issueId, input: { stateId: $stateId }) { success }
    }`,
    { issueId, stateId }
  )) as { data?: { issueUpdate?: { success?: boolean } } };
  return result.data?.issueUpdate?.success ?? false;
}

export async function getIssue(issueId: string): Promise<{ state?: { name?: string } } | null> {
  const result = (await gql(
    `query($issueId: String!) {
      issue(id: $issueId) {
        id identifier title
        state { name }
        priority
        updatedAt
      }
    }`,
    { issueId }
  )) as { data?: { issue?: { state?: { name?: string } } } };
  return result.data?.issue ?? null;
}

export function findingToLinearTitle(finding: Finding): string {
  const prefix = SEVERITY_PREFIX[finding.severity] ?? "";
  const title = finding.title ?? finding.finding_id;
  return `${prefix} ${title}`.trim();
}

export function findingToDescription(finding: Finding): string {
  const lines: string[] = [];
  lines.push(`**LYRA Finding:** \`${finding.finding_id}\``);
  lines.push(`**Type:** ${finding.type} | **Severity:** ${finding.severity} | **Priority:** ${finding.priority}`);
  lines.push(`**Confidence:** ${finding.confidence ?? "?"}`);
  lines.push("");
  lines.push(finding.description ?? "No description.");
  lines.push("");

  const hooks = finding.proof_hooks ?? [];
  if (hooks.length > 0) {
    lines.push("### Proof");
    for (const h of hooks) {
      const hookType = h.hook_type ?? h.type ?? "?";
      const summary = h.summary ?? h.value ?? "";
      lines.push(`- **[${hookType}]** ${summary}`);
      if (h.file) {
        const line = h.start_line != null ? `:${h.start_line}` : "";
        lines.push(`  \`${h.file}${line}\``);
      }
    }
    lines.push("");
  }

  const fix = finding.suggested_fix;
  if (fix && typeof fix === "object" && fix.approach) {
    lines.push("### Suggested Fix");
    lines.push(fix.approach);
    if (fix.affected_files?.length) {
      lines.push(`\n**Files:** ${fix.affected_files.map((f) => `\`${f}\``).join(", ")}`);
    }
    lines.push(`**Effort:** ${fix.estimated_effort ?? "?"}`);
    if (fix.risk_notes) lines.push(`**Risk:** ${fix.risk_notes}`);
    if (fix.tests_needed?.length) {
      lines.push("\n**Tests needed:**");
      for (const t of fix.tests_needed) lines.push(`- ${t}`);
    }
    lines.push("");
  }

  lines.push("---");
  lines.push(`*Synced from LYRA dashboard. Finding ID: \`${finding.finding_id}\`*`);
  return lines.join("\n");
}

export function getLinearPriority(finding: Finding): number {
  return PRIORITY_MAP[finding.priority] ?? 4;
}

export function getEnvLabelId(): string | null {
  const id = getEnv("LINEAR_LABEL_ID");
  return id || null;
}

export function getEnvProjectId(projectName?: string): string | null {
  // Per-project lookup: LINEAR_PROJECT_ID_RELEVNT, LINEAR_PROJECT_ID_EMBR, etc.
  if (projectName) {
    const key = `LINEAR_PROJECT_ID_${projectName.toUpperCase().replace(/[^A-Z0-9]/g, "_")}`;
    const perProject = getEnv(key);
    if (perProject) return perProject;
  }
  // Fall back to global LINEAR_PROJECT_ID
  const id = getEnv("LINEAR_PROJECT_ID");
  return id || null;
}
