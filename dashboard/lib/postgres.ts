import { randomUUID } from "node:crypto";
import { Pool, type PoolConfig } from "pg";

interface DatabaseSettings {
  connectionString: string;
  host: string;
  port: number;
  database: string;
  user: string;
  ssl: boolean;
  rejectUnauthorized: boolean;
}

export interface DatabaseConfig {
  configured: boolean;
  missing: string[];
  host: string;
  port: number;
  database: string;
  user: string;
  ssl: boolean;
  connectionLabel: string;
  eventsTable: string;
  snapshotsTable: string;
  schema: string;
}

function readFirstDefinedEnv(keys: readonly string[]): string {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return "";
}

function isSafeIdent(value: string): boolean {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(value);
}

export function quoteIdent(value: string): string {
  if (!isSafeIdent(value)) {
    throw new Error(`Invalid SQL identifier: ${value}`);
  }
  return `"${value}"`;
}

function parseDatabaseUrl(raw: string): DatabaseSettings {
  const url = new URL(raw);
  if (!["postgres:", "postgresql:"].includes(url.protocol)) {
    throw new Error("DATABASE_URL must use a postgres:// or postgresql:// URL");
  }

  const host = url.hostname;
  const port = Number(url.port || "5432");
  const database = decodeURIComponent(url.pathname.replace(/^\//, "")) || "postgres";
  const user = decodeURIComponent(url.username || "postgres");
  const sslmode = url.searchParams.get("sslmode")?.toLowerCase();
  const ssl = sslmode === "disable" ? false : host !== "localhost" && host !== "127.0.0.1";
  const rejectUnauthorized = sslmode === "verify-full";

  if (!url.password) {
    throw new Error("DATABASE_URL must include a password");
  }

  return {
    connectionString: raw,
    host,
    port,
    database,
    user,
    ssl,
    rejectUnauthorized,
  };
}

function maskDatabaseUrl(settings: DatabaseSettings): string {
  return `postgresql://${settings.user}:***@${settings.host}:${settings.port}/${settings.database}`;
}

function readTableName(envKey: string, fallback: string): string {
  return process.env[envKey]?.trim() || fallback;
}

export function readDatabaseConfig(): DatabaseConfig {
  const rawUrl = readFirstDefinedEnv(["DATABASE_URL", "LYRA_DATABASE_URL", "LYRA_SUPABASE_URL"]);
  const missing: string[] = [];

  if (!rawUrl) {
    missing.push("DATABASE_URL");
  }

  const schema = process.env.LYRA_POSTGRES_SCHEMA?.trim() || process.env.LYRA_SUPABASE_SCHEMA?.trim() || "public";
  const eventsTable = readTableName("LYRA_POSTGRES_EVENTS_TABLE", process.env.LYRA_SUPABASE_EVENTS_TABLE?.trim() || "lyra_orchestration_events");
  const snapshotsTable = readTableName("LYRA_POSTGRES_SNAPSHOTS_TABLE", process.env.LYRA_SUPABASE_SNAPSHOTS_TABLE?.trim() || "lyra_project_snapshots");

  if (!isSafeIdent(schema)) missing.push("LYRA_POSTGRES_SCHEMA");
  if (!isSafeIdent(eventsTable)) missing.push("LYRA_POSTGRES_EVENTS_TABLE");
  if (!isSafeIdent(snapshotsTable)) missing.push("LYRA_POSTGRES_SNAPSHOTS_TABLE");

  let settings: DatabaseSettings | null = null;
  if (rawUrl) {
    try {
      settings = parseDatabaseUrl(rawUrl);
    } catch {
      missing.push("DATABASE_URL");
    }
  }

  const fallbackSettings: DatabaseSettings = {
    connectionString: "",
    host: "",
    port: 5432,
    database: "",
    user: "postgres",
    ssl: true,
    rejectUnauthorized: false,
  };
  const resolved = settings ?? fallbackSettings;

  return {
    configured: missing.length === 0,
    missing,
    host: resolved.host,
    port: resolved.port,
    database: resolved.database,
    user: resolved.user,
    ssl: resolved.ssl,
    connectionLabel: settings ? maskDatabaseUrl(settings) : "",
    eventsTable,
    snapshotsTable,
    schema,
  };
}

export class PostgresPool {
  private readonly pool: Pool;

  constructor(settings: DatabaseSettings) {
    const config: PoolConfig = {
      connectionString: settings.connectionString,
      ssl: settings.ssl
        ? {
            rejectUnauthorized: settings.rejectUnauthorized,
          }
        : false,
    };
    this.pool = new Pool(config);
  }

  async query(sql: string, params: unknown[] = []): Promise<Record<string, unknown>[]> {
    const result = await this.pool.query(sql, params);
    return result.rows as Record<string, unknown>[];
  }
}

export function createPostgresPool(): PostgresPool {
  const rawUrl = readFirstDefinedEnv(["DATABASE_URL", "LYRA_DATABASE_URL", "LYRA_SUPABASE_URL"]);
  if (!rawUrl) {
    throw new Error("DATABASE_URL is required");
  }
  return new PostgresPool(parseDatabaseUrl(rawUrl));
}

export function generateUuid(): string {
  return randomUUID();
}
