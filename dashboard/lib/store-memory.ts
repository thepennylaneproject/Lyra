import type { Project } from "./types";
import type { ProjectsRepository } from "./repository";

const projects: Map<string, Project> = new Map();

export const memoryRepository: ProjectsRepository = {
  async list() {
    return Array.from(projects.values());
  },

  async getByName(name: string) {
    return projects.get(name) ?? null;
  },

  async create(project: Project) {
    if (projects.has(project.name)) {
      throw new Error(`Project ${project.name} already exists`);
    }
    const withMeta = {
      ...project,
      lastUpdated: new Date().toISOString(),
    };
    projects.set(project.name, withMeta);
    return withMeta;
  },

  async update(project: Project) {
    if (!projects.has(project.name)) {
      throw new Error(`Project ${project.name} not found`);
    }
    const withMeta = {
      ...project,
      lastUpdated: new Date().toISOString(),
    };
    projects.set(project.name, withMeta);
    return withMeta;
  },

  async delete(name: string) {
    projects.delete(name);
  },
};
