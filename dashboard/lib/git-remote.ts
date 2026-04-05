/** True if the string looks like a Git remote URL (HTTPS, HTTP, SSH). */
export function looksLikeGitRepositoryUrl(url: string): boolean {
  const t = url.trim().toLowerCase();
  return (
    t.startsWith("git@") ||
    t.startsWith("https://") ||
    t.startsWith("http://") ||
    t.startsWith("ssh://")
  );
}
