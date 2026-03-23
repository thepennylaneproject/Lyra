import type { NavView } from "@/components/Shell";

/** URL → state: project open always implies portfolio nav context. */
export function readPortfolioStateFromSearch(search: string): {
  project: string | null;
  activeView: NavView;
} {
  const q = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const name = q.get("project")?.trim() || null;
  const v = q.get("view");
  if (name) return { project: name, activeView: "portfolio" };
  return { project: null, activeView: v === "engine" ? "engine" : "portfolio" };
}

/** State → query: never write view=engine alongside project (portfolio context). */
export function searchStringForPortfolioState(
  activeView: NavView,
  activeProject: string | null,
  pathname: string
): string {
  const params = new URLSearchParams();
  if (activeView === "engine" && !activeProject) params.set("view", "engine");
  if (activeProject) params.set("project", activeProject);
  const nextQs = params.toString();
  return nextQs ? `${pathname}?${nextQs}` : pathname;
}
