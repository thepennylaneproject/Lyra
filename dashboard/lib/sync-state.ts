/**
 * Persist Linear sync mappings per project. Stored in data/linear_sync.json.
 */

import { readFile, writeFile, mkdir } from "fs/promises";
import { join, dirname } from "path";
import type { FindingStatus } from "./types";

export interface SyncMapping {
  linear_id: string;
  identifier?: string;
  url?: string;
  lyra_status: FindingStatus;
  created_at?: string;
  last_synced?: string;
}

export interface ProjectSyncState {
  mappings: Record<string, SyncMapping>;
  last_sync: string | null;
}

const FILENAME = "linear_sync.json";

function getDataDir(): string {
  const env = process.env.LYRA_DASHBOARD_DATA_DIR;
  if (env && typeof env === "string" && env.trim()) return env.trim();
  return join(process.cwd(), "data");
}

function getFilePath(): string {
  return join(getDataDir(), FILENAME);
}

async function ensureDir(filePath: string): Promise<void> {
  await mkdir(dirname(filePath), { recursive: true });
}

export async function loadSyncState(): Promise<Record<string, ProjectSyncState>> {
  const filePath = getFilePath();
  try {
    const raw = await readFile(filePath, "utf-8");
    const data = JSON.parse(raw) as Record<string, ProjectSyncState>;
    return typeof data === "object" && data !== null ? data : {};
  } catch (e: unknown) {
    if (e && typeof e === "object" && "code" in e && e.code === "ENOENT") {
      return {};
    }
    throw e;
  }
}

export async function saveSyncState(
  state: Record<string, ProjectSyncState>
): Promise<void> {
  const filePath = getFilePath();
  await ensureDir(filePath);
  await writeFile(
    filePath,
    JSON.stringify(
      { ...state, _updatedAt: new Date().toISOString() },
      null,
      2
    ),
    "utf-8"
  );
}

export async function getProjectSyncState(
  projectName: string
): Promise<ProjectSyncState> {
  const all = await loadSyncState();
  return (
    all[projectName] ?? {
      mappings: {},
      last_sync: null,
    }
  );
}

export async function setProjectSyncState(
  projectName: string,
  projectState: ProjectSyncState
): Promise<void> {
  const all = await loadSyncState();
  all[projectName] = projectState;
  await saveSyncState(all);
}
