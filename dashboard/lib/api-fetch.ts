import { LYRA_ENQUEUE_SECRET_STORAGE_KEY } from "@/lib/auth-constants";

/**
 * Browser calls to /api/* include cookies (dashboard session after login).
 * When `ORCHESTRATION_ENQUEUE_SECRET` / `DASHBOARD_API_SECRET` gates `/api/*`, also sends
 * `Authorization: Bearer <secret>` if the user pasted the secret in session storage
 * (orchestration panel) and the request does not already set Authorization.
 */
export function apiFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const headers = new Headers(init?.headers);
  if (typeof window !== "undefined") {
    try {
      const secret = sessionStorage
        .getItem(LYRA_ENQUEUE_SECRET_STORAGE_KEY)
        ?.trim();
      if (secret && !headers.has("Authorization")) {
        headers.set("Authorization", `Bearer ${secret}`);
      }
    } catch {
      /* private mode / disabled storage */
    }
  }
  return fetch(input, {
    ...init,
    headers,
    credentials: "include",
  });
}
