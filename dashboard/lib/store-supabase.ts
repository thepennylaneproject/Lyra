/**
 * Supabase/Postgres persistence for projects (lyra_projects table).
 */

import type { Project } from "./types";
import type { ProjectsRepository } from "./repository";
import { createPostgresPool, readDatabaseConfig } from "./postgres";
import {
  recordDurableEventBestEffort,
  recordProjectSnapshotBestEffort,
} from "./durable-state";

const TABLE = "lyra_projects";

function pool() {
  return createPostgresPool();
}

function rowToProject(row: Record<string, unknown>): Project {
  const raw = row.project_json;
  const j =
    typeof raw === "string"
      ? (JSON.parse(raw) as Project)
      : (raw as Project);
  const name = String(row.name ?? j.name ?? "");
  return {
    ...j,
    name,
    findings: Array.isArray(j.findings) ? j.findings : [],
    repositoryUrl:
      (row.repository_url as string) || j.repositoryUrl,
    lastUpdated:
      row.updated_at instanceof Date
        ? row.updated_at.toISOString()
        : String(row.updated_at ?? j.lastUpdated ?? ""),
  };
}

export function hasSupabaseProjectsStore(): boolean {
  return readDatabaseConfig().configured;
}

export function createSupabaseRepository(): ProjectsRepository {
  const p = pool();
  return {
    async list() {
      const rows = await p.query(
        `SELECT name, repository_url, project_json, updated_at FROM ${TABLE} ORDER BY name ASC`
      );
      return rows.map(rowToProject);
    },

    async getByName(name: string) {
      const rows = await p.query(
        `SELECT name, repository_url, project_json, updated_at FROM ${TABLE} WHERE name = $1`,
        [name]
      );
      return rows[0] ? rowToProject(rows[0]) : null;
    },

    async create(project: Project) {
      const now = new Date().toISOString();
      const withMeta: Project = {
        ...project,
        lastUpdated: now,
      };
      await p.query(
        `INSERT INTO ${TABLE} (name, repository_url, project_json, updated_at)
         VALUES ($1, $2, $3::jsonb, now())`,
        [
          withMeta.name,
          withMeta.repositoryUrl ?? null,
          JSON.stringify(withMeta),
        ]
      );
      await recordProjectSnapshotBestEffort(
        withMeta,
        "supabase_projects",
        "project_created"
      );
      await recordDurableEventBestEffort({
        event_type: "project_created",
        project_name: withMeta.name,
        source: "supabase_projects",
        summary: `Created project ${withMeta.name}`,
      });
      return withMeta;
    },

    async update(project: Project) {
      const now = new Date().toISOString();
      const withMeta: Project = {
        ...project,
        lastUpdated: now,
      };
      const result = await p.query(
        `UPDATE ${TABLE}
         SET repository_url = $2, project_json = $3::jsonb, updated_at = now()
         WHERE name = $1
         RETURNING name`,
        [
          withMeta.name,
          withMeta.repositoryUrl ?? null,
          JSON.stringify(withMeta),
        ]
      );
      if (result.length === 0) {
        throw new Error(`Project ${project.name} not found`);
      }
      await recordProjectSnapshotBestEffort(
        withMeta,
        "supabase_projects",
        "project_updated"
      );
      await recordDurableEventBestEffort({
        event_type: "project_updated",
        project_name: withMeta.name,
        source: "supabase_projects",
        summary: `Updated project ${withMeta.name}`,
      });
      return withMeta;
    },

    async delete(name: string) {
      const result = await p.query(
        `DELETE FROM ${TABLE} WHERE name = $1 RETURNING name`,
        [name]
      );
      if (result.length === 0) {
        throw new Error(`Project ${name} not found`);
      }
      await recordDurableEventBestEffort({
        event_type: "project_deleted",
        project_name: name,
        source: "supabase_projects",
        summary: `Deleted project ${name}`,
      });
    },
  };
}
