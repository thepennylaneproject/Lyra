/**
 * Shared Redis connection shape for BullMQ Queue/Worker alignment with `worker/src/index.ts`
 * (dashboard uses host/port object; worker uses ioredis URL — same Redis instance).
 */

export type BullmqRedisConnection = {
  host: string;
  port: number;
  password?: string;
  username?: string;
  tls?: Record<string, never>;
  maxRetriesPerRequest: null;
};

/** Resolve REDIS_URL / LYRA_REDIS_URL for BullMQ, or null if unset / invalid. */
export function bullmqConnectionFromEnv(): BullmqRedisConnection | null {
  const raw =
    process.env.REDIS_URL?.trim() || process.env.LYRA_REDIS_URL?.trim();
  if (!raw) return null;
  try {
    const u = new URL(raw);
    if (!u.hostname?.trim()) return null;
    return {
      host: u.hostname,
      port: Number(u.port || 6379),
      password: u.password ? decodeURIComponent(u.password) : undefined,
      username:
        u.username && u.username !== "default"
          ? decodeURIComponent(u.username)
          : u.username === "default" && u.password
            ? "default"
            : undefined,
      tls: u.protocol === "rediss:" ? {} : undefined,
      maxRetriesPerRequest: null,
    };
  } catch {
    return null;
  }
}
