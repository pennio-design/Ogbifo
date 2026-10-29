/** The only database surface the repositories need. `pg` and PGlite both fit behind it. */
export interface SqlClient {
  query<T = Record<string, unknown>>(text: string, params?: readonly unknown[]): Promise<{ rows: T[] }>;
}

export interface Migration {
  readonly name: string;
  readonly sql: string;
}

/**
 * Apply migrations in name order, once each. Each runs in its own transaction with its
 * record, so a failure leaves nothing half-applied. Never drops anything itself, and
 * refuses to run if an already-applied migration's text has changed.
 */
export async function runMigrations(
  client: SqlClient & { exec?(sql: string): Promise<unknown> },
  migrations: readonly Migration[],
): Promise<readonly string[]> {
  const run = (sql: string) => (client.exec ? client.exec(sql) : client.query(sql));
  await run(
    "CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())",
  );
  const { rows } = await client.query<{ name: string; checksum: string }>("SELECT name, checksum FROM schema_migrations");
  const applied = new Map(rows.map((r) => [r.name, r.checksum]));
  const done: string[] = [];
  for (const m of [...migrations].sort((a, b) => a.name.localeCompare(b.name))) {
    const checksum = checksumOf(m.sql);
    const previous = applied.get(m.name);
    if (previous !== undefined) {
      if (previous !== checksum) throw new Error(`Migration ${m.name} was changed after it was applied. Add a new migration instead.`);
      continue;
    }
    await run(`BEGIN;\n${m.sql}\nINSERT INTO schema_migrations (name, checksum) VALUES ('${m.name.replace(/'/g, "''")}', '${checksum}');\nCOMMIT;`).catch(async (error: unknown) => {
      await run("ROLLBACK").catch(() => undefined);
      throw error;
    });
    done.push(m.name);
  }
  return done;
}

/** FNV-1a, 32 bit. Detects edits; not a security hash. */
export function checksumOf(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}
