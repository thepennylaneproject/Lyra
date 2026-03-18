import type { ProjectsRepository } from "./repository";
import { createJsonRepository } from "./store-json";
import { createGithubIssueRepository, hasGithubIssueRepository } from "./store-github";

let instance: ProjectsRepository | null = null;

export function getRepository(): ProjectsRepository {
  if (instance) return instance;
  instance = hasGithubIssueRepository()
    ? createGithubIssueRepository()
    : createJsonRepository();
  return instance;
}

export function setRepository(repo: ProjectsRepository): void {
  instance = repo;
}
