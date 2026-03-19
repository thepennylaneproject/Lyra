/**
 * Safe message for 500 responses: generic in production to avoid leaking
 * DB/path details; full message in development for debugging.
 */
export function apiErrorMessage(e: unknown): string {
  if (process.env.NODE_ENV === "production") {
    return "Internal server error";
  }
  return e instanceof Error ? e.message : String(e);
}
