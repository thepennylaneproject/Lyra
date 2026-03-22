/**
 * Optional link target for in-app references to repo docs (workflows table).
 * Set `NEXT_PUBLIC_LYRA_WORKFLOWS_DOC_URL` at build time, e.g. GitHub blob URL
 * for `docs/LYRA_NEAR_TERM_THEMES.md`.
 */
export function workflowsDocHref(): string | null {
  const u = process.env.NEXT_PUBLIC_LYRA_WORKFLOWS_DOC_URL?.trim();
  return u ? u : null;
}
