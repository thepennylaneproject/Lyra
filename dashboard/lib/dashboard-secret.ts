/**
 * Single secret for dashboard API auth and orchestration enqueue.
 * Set DASHBOARD_API_SECRET or reuse ORCHESTRATION_ENQUEUE_SECRET.
 */
export function getDashboardApiSecret(): string {
  return (
    process.env.DASHBOARD_API_SECRET?.trim() ||
    process.env.ORCHESTRATION_ENQUEUE_SECRET?.trim() ||
    ""
  );
}

export function isDashboardApiAuthConfigured(): boolean {
  return getDashboardApiSecret().length > 0;
}

/** Shown in 503 responses when production has no API secret configured. */
export const DASHBOARD_MISCONFIGURED_MESSAGE =
  "Set DASHBOARD_API_SECRET or ORCHESTRATION_ENQUEUE_SECRET on the host.";

/**
 * When no secret is configured: allow unauthenticated `/api/*` (legacy local DX).
 * In production, false unless LYRA_ALLOW_OPEN_API is 1/true — otherwise APIs fail closed (503).
 */
export function isOpenApiAllowedWithoutSecret(): boolean {
  const flag = process.env.LYRA_ALLOW_OPEN_API?.trim().toLowerCase();
  if (flag === "1" || flag === "true") return true;
  return process.env.NODE_ENV !== "production";
}
