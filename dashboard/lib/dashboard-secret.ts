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
