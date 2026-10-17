import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";
import {
  InMemoryLoginTokenRepository, InMemoryRateLimiter, InMemorySessionRepository, InMemoryUserRepository,
  type LoginTokenRepository, type RateLimiter, type SessionRepository, type UserRepository,
} from "../src/auth";
import {
  PostgresLoginTokenRepository, PostgresRateLimiter, PostgresSessionRepository, PostgresUserRepository,
} from "../src/postgres-auth";
import { checksumOf, runMigrations, type Migration } from "../src/sql";

const dir = join(__dirname, "..", "db", "migrations");
const migrations: Migration[] = readdirSync(dir).filter((f) => f.endsWith(".sql")).map((f) => ({ name: f, sql: readFileSync(join(dir, f), "utf8") }));
const T = "2026-10-20T10:00:00.000Z";

interface Repos { users: UserRepository; tokens: LoginTokenRepository; sessions: SessionRepository; limiter: RateLimiter }

/** The same behaviour is required of the in-memory and the Postgres adapters. */
function contract(name: string, make: () => Promise<Repos>) {
  describe(`${name} auth repositories`, () => {
    let r: Repos;
    beforeAll(async () => { r = await make(); });

    it("creates a user once per email, even when created twice", async () => {
      const [a, b] = await Promise.all([
        r.users.create({ id: "u1", email: "ada@example.com", displayName: "Reader", createdAt: T }),
        r.users.create({ id: "u2", email: "ada@example.com", displayName: "Reader", createdAt: T }),
      ]);
      expect(a.id).toBe(b.id);
      expect((await r.users.findByEmail("ada@example.com"))?.id).toBe(a.id);
      expect((await r.users.findById(a.id))?.email).toBe("ada@example.com");
      expect(await r.users.findByEmail("nobody@example.com")).toBeNull();
    });
    it("round-trips a login token and marks it used exactly once", async () => {
      await r.tokens.put({ tokenHash: "h1", email: "ada@example.com", createdAt: T, expiresAt: "2026-10-20T10:15:00.000Z", usedAt: null });
      expect(await r.tokens.get("h1")).toEqual({ tokenHash: "h1", email: "ada@example.com", createdAt: T, expiresAt: "2026-10-20T10:15:00.000Z", usedAt: null });
      const wins = await Promise.all([r.tokens.markUsed("h1", T), r.tokens.markUsed("h1", T), r.tokens.markUsed("h1", T)]);
      expect(wins.filter(Boolean)).toHaveLength(1);
      expect((await r.tokens.get("h1"))?.usedAt).toBe(T);
      expect(await r.tokens.markUsed("missing", T)).toBe(false);
      expect(await r.tokens.get("missing")).toBeNull();
    });
    it("stores, reads and deletes sessions", async () => {
      const user = await r.users.findByEmail("ada@example.com");
      await r.sessions.put({ tokenHash: "s1", userId: user!.id, createdAt: T, expiresAt: "2026-11-19T10:00:00.000Z" });
      expect(await r.sessions.get("s1")).toMatchObject({ userId: user!.id, expiresAt: "2026-11-19T10:00:00.000Z" });
      await r.sessions.delete("s1");
      expect(await r.sessions.get("s1")).toBeNull();
    });
    it("limits hits inside a window and forgets old ones", async () => {
      const t0 = new Date(T);
      const results: boolean[] = [];
      for (let i = 0; i < 4; i++) results.push(await r.limiter.allow("k", 3, 60_000, new Date(t0.getTime() + i)));
      expect(results).toEqual([true, true, true, false]);
      expect(await r.limiter.allow("other", 3, 60_000, t0)).toBe(true);
      expect(await r.limiter.allow("k", 3, 60_000, new Date(t0.getTime() + 61_000))).toBe(true);
    });
  });
}

contract("in-memory", async () => ({
  users: new InMemoryUserRepository(), tokens: new InMemoryLoginTokenRepository(),
  sessions: new InMemorySessionRepository(), limiter: new InMemoryRateLimiter(),
}));

contract("Postgres", async () => {
  const db = new PGlite();
  await runMigrations(db, migrations);
  return {
    users: new PostgresUserRepository(db), tokens: new PostgresLoginTokenRepository(db),
    sessions: new PostgresSessionRepository(db), limiter: new PostgresRateLimiter(db),
  };
});

describe("runMigrations", () => {
  it("applies each migration once and reports what it did", async () => {
    const db = new PGlite();
    expect(await runMigrations(db, migrations)).toEqual(migrations.map((m) => m.name).sort());
    expect(await runMigrations(db, migrations)).toEqual([]);
  });
  it("applies migrations in name order whatever order they are given", async () => {
    const db = new PGlite();
    const done = await runMigrations(db, [...migrations].reverse());
    expect(done).toEqual([...done].sort());
  });
  it("refuses a migration edited after it was applied", async () => {
    const db = new PGlite();
    await runMigrations(db, [{ name: "0001_a.sql", sql: "CREATE TABLE a (id int);" }]);
    await expect(runMigrations(db, [{ name: "0001_a.sql", sql: "CREATE TABLE a (id int, x int);" }])).rejects.toThrow(/changed after/);
  });
  it("leaves nothing behind when a migration fails", async () => {
    const db = new PGlite();
    await expect(runMigrations(db, [{ name: "0001_bad.sql", sql: "CREATE TABLE ok_table (id int); SELECT nope FROM missing;" }])).rejects.toThrow();
    await expect(db.query("SELECT * FROM ok_table")).rejects.toThrow();
    const { rows } = await db.query("SELECT * FROM schema_migrations");
    expect(rows).toHaveLength(0);
  });
  it("checksums are stable and change with the text", () => {
    expect(checksumOf("abc")).toBe(checksumOf("abc"));
    expect(checksumOf("abc")).not.toBe(checksumOf("abd"));
  });
});
