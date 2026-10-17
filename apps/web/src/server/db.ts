import { Pool } from "pg";
import type { SqlClient } from "@ogbifo/domain";

/**
 * One connection pool per server process, created on first use. `DATABASE_URL` is a
 * normal Postgres connection string (add `?sslmode=require` for hosted databases).
 * Without it the app falls back to in-memory storage in development and closes
 * sign-in in production (see `auth.ts`).
 */
export const databaseUrl = process.env.DATABASE_URL?.trim() || undefined;

const globalForDb = globalThis as unknown as { ogbifoPool?: Pool };

export function getDb(): SqlClient | null {
  if (databaseUrl === undefined) return null;
  globalForDb.ogbifoPool ??= new Pool({ connectionString: databaseUrl, max: 5, idleTimeoutMillis: 30_000 });
  const pool = globalForDb.ogbifoPool;
  return { query: async (text, params) => ({ rows: (await pool.query(text, params as unknown[] | undefined)).rows }) } as SqlClient;
}
