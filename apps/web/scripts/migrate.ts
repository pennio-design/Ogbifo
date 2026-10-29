/**
 * Apply SQL migrations to DATABASE_URL.
 *
 *   DATABASE_URL=postgres://... npm run migrate -w @ogbifo/web
 *
 * Uses one dedicated connection so a failed migration is rolled back on the connection
 * that ran it. Run it as a deploy step, before the new app version starts. Migrations are
 * additive and each runs once; editing an applied migration is refused.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { Client } from "pg";
import { runMigrations } from "@ogbifo/domain";

const url = process.env.DATABASE_URL?.trim();
if (!url) {
  console.error("DATABASE_URL is not set.");
  process.exit(1);
}
const dir = resolve(process.env.OGBIFO_MIGRATIONS_DIR ?? join(__dirname, "..", "..", "..", "packages", "domain", "db", "migrations"));

async function main() {
  const migrations = readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .map((name) => ({ name, sql: readFileSync(join(dir, name), "utf8") }));
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    const applied = await runMigrations({ query: async (t, p) => ({ rows: (await client.query(t, p as unknown[] | undefined)).rows }), exec: (sql) => client.query(sql) }, migrations);
    console.log(applied.length === 0 ? "Database is up to date." : `Applied: ${applied.join(", ")}`);
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
