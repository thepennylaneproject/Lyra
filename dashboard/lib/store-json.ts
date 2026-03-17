/**
 * File-based persistence for projects. Uses a single JSON file in the data directory.
 * Compatible with Node.js (API routes only). Set LYRA_DASHBOARD_DATA_DIR to enable.
 */

import { readFile, writeFile, mkdir } from "fs/promises";
import { join, dirname } from "path";
import type { Project } from "./types";
import type { ProjectsRepository } from "./repository";

const FILENAME = "projects.json";

function getDataDir(): string {
  const env = process.env.LYRA_DASHBOARD_DATA_DIR;
  if (env && typeof env === "string" && env.trim()) return env.trim();
  return join(process.cwd(), "data");
}

function getFilePath(): string {
  return join(getDataDir(), FILENAME);
}

async function ensureDir(filePath: string): Promise<void> {
  const dir = dirname(filePath);
  if (dir) await mkdir(dir, { recursive: true });
}

async function loadAll(): Promise<Project[]> {
  const filePath = getFilePath();
  try {
    const raw = await readFile(filePath, "utf-8");
    const data = JSON.parse(raw);
    return Array.isArray(data.projects) ? data.projects : [];
  } catch (e: unknown) {
    if (e && typeof e === "object" && "code" in e && e.code === "ENOENT") {
      return [];
    }
    throw e;
  }
}

async function saveAll(projects: Project[]): Promise<void> {
  const filePath = getFilePath();
  await ensureDir(filePath);
  await writeFile(
    filePath,
    JSON.stringify({ projects, updatedAt: new Date().toISOString() }, null, 2),
    "utf-8"
  );
}

export function createJsonRepository(): ProjectsRepository {
  return {
    async list() {
      return loadAll();
    },

    async getByName(name: string) {
      const projects = await loadAll();
      return projects.find((p) => p.name === name) ?? null;
    },

    async create(project: Project) {
      const projects = await loadAll();
      if (projects.some((p) => p.name === project.name)) {
        throw new Error(`Project ${project.name} already exists`);
      }
      const withMeta = {
        ...project,
        lastUpdated: new Date().toISOString(),
      };
      projects.push(withMeta);
      await saveAll(projects);
      return withMeta;
    },

    async update(project: Project) {
      const projects = await loadAll();
      const index = projects.findIndex((p) => p.name === project.name);
      if (index === -1) {
        throw new Error(`Project ${project.name} not found`);
      }
      const withMeta = {
        ...project,
        lastUpdated: new Date().toISOString(),
      };
      projects[index] = withMeta;
      await saveAll(projects);
      return withMeta;
    },

    async delete(name: string) {
      const projects = await loadAll();
      const filtered = projects.filter((p) => p.name !== name);
      if (filtered.length === projects.length) {
        throw new Error(`Project ${name} not found`);
      }
      await saveAll(filtered);
    },
  };
}
