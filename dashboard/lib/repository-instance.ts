import type { ProjectsRepository } from "./repository";
import { memoryRepository } from "./store-memory";
import { createJsonRepository } from "./store-json";

let instance: ProjectsRepository | null = null;

export function getRepository(): ProjectsRepository {
  if (instance) return instance;
  instance = createJsonRepository();
  return instance;
}

export function setRepository(repo: ProjectsRepository): void {
  instance = repo;
}
