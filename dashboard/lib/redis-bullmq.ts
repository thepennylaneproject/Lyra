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
    const parsedUrl = new URL(raw);
    if (!parsedUrl.hostname?.trim()) return null;
    return {
      host: parsedUrl.hostname,
      port: Number(parsedUrl.port || 6379),
      password: parsedUrl.password ? decodeURIComponent(parsedUrl.password) : undefined,
      username:
        parsedUrl.username && parsedUrl.username !== "default"
          ? decodeURIComponent(parsedUrl.username)
          : parsedUrl.username === "default" && parsedUrl.password
            ? "default"
            : undefined,
      tls: parsedUrl.protocol === "rediss:" ? {} : undefined,
      maxRetriesPerRequest: null,
    };
  } catch {
    return null;
  }
}
