import type { Project } from "./types";

export interface DurableStateConfig {
  configured: boolean;
  url: string;
  schema: string;
  eventsTable: string;
  snapshotsTable: string;
  missing: string[];
}

export interface DurableEvent {
  event_type: string;
  project_name?: string | null;
  source: string;
  summary: string;
  payload?: Record<string, unknown>;
}

export interface DurableEventRecord extends DurableEvent {
  id?: string;
  created_at?: string;
}

export interface DurableProjectSnapshot {
  project_name: string;
  source: string;
  summary: string;
  project_json: Project;
  updated_at: string;
}

export interface DurableStateSummary {
  configured: boolean;
  missing: string[];
  recent_events: DurableEventRecord[];
  recent_snapshots: DurableProjectSnapshot[];
}

function readConfig(): DurableStateConfig {
  const url = process.env.LYRA_SUPABASE_URL?.trim() ?? "";
  const schema = process.env.LYRA_SUPABASE_SCHEMA?.trim() || "public";
  const eventsTable = process.env.LYRA_SUPABASE_EVENTS_TABLE?.trim() || "lyra_orchestration_events";
  const snapshotsTable = process.env.LYRA_SUPABASE_SNAPSHOTS_TABLE?.trim() || "lyra_project_snapshots";
  const missing: string[] = [];

  if (!url) missing.push("LYRA_SUPABASE_URL");
  if (!process.env.LYRA_SUPABASE_SERVICE_ROLE_KEY?.trim()) {
    missing.push("LYRA_SUPABASE_SERVICE_ROLE_KEY");
  }

  return {
    configured: missing.length === 0,
    url,
    schema,
    eventsTable,
    snapshotsTable,
    missing,
  };
}

function baseHeaders(): HeadersInit {
  const key = process.env.LYRA_SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!key) {
    throw new Error("LYRA_SUPABASE_SERVICE_ROLE_KEY is required for durable state access");
  }

  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    "Content-Profile": readConfig().schema,
    Prefer: "return=representation",
  };
}

async function supabaseRequest(path: string, init?: RequestInit): Promise<Response> {
  const config = readConfig();
  const res = await fetch(`${config.url}/rest/v1/${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(baseHeaders() as Record<string, string>),
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  return res;
}

export function hasDurableState(): boolean {
  return Boolean(
    process.env.LYRA_SUPABASE_URL?.trim() &&
      process.env.LYRA_SUPABASE_SERVICE_ROLE_KEY?.trim()
  );
}

export function getDurableStateConfig(): DurableStateConfig {
  return readConfig();
}

export async function recordDurableEvent(event: DurableEvent): Promise<void> {
  if (!hasDurableState()) return;
  const config = readConfig();
  const res = await fetch(`${config.url}/rest/v1/${config.eventsTable}`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      ...baseHeaders(),
      Prefer: "return=minimal",
    },
    body: JSON.stringify({
      event_type: event.event_type,
      project_name: event.project_name ?? null,
      source: event.source,
      summary: event.summary,
      payload: event.payload ?? {},
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Supabase durable event insert failed (${res.status})`);
  }
}

export async function recordProjectSnapshot(
  project: Project,
  source: string,
  summary: string
): Promise<void> {
  if (!hasDurableState()) return;
  const config = readConfig();
  const res = await fetch(
    `${config.url}/rest/v1/${config.snapshotsTable}?on_conflict=project_name`,
    {
      method: "POST",
      headers: {
        Accept: "application/json",
        ...baseHeaders(),
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify({
        project_name: project.name,
        source,
        summary,
        project_json: project,
        updated_at: new Date().toISOString(),
      }),
      cache: "no-store",
    }
  );

  if (!res.ok) {
    throw new Error(`Supabase project snapshot upsert failed (${res.status})`);
  }
}

export async function fetchDurableState(limit = 10): Promise<DurableStateSummary> {
  const config = readConfig();
  if (!config.configured) {
    return {
      configured: false,
      missing: config.missing,
      recent_events: [],
      recent_snapshots: [],
    };
  }

  const [eventsRes, snapshotsRes] = await Promise.all([
    supabaseRequest(
      `${config.eventsTable}?select=*&order=created_at.desc&limit=${encodeURIComponent(String(limit))}`
    ),
    supabaseRequest(
      `${config.snapshotsTable}?select=*&order=updated_at.desc&limit=${encodeURIComponent(String(limit))}`
    ),
  ]);

  if (!eventsRes.ok) {
    throw new Error(`Supabase durable events query failed (${eventsRes.status})`);
  }
  if (!snapshotsRes.ok) {
    throw new Error(`Supabase durable snapshots query failed (${snapshotsRes.status})`);
  }

  const events = (await eventsRes.json()) as DurableEventRecord[];
  const snapshots = (await snapshotsRes.json()) as DurableProjectSnapshot[];

  return {
    configured: true,
    missing: [],
    recent_events: Array.isArray(events) ? events : [],
    recent_snapshots: Array.isArray(snapshots) ? snapshots : [],
  };
}
