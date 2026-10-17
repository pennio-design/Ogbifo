import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { beforeAll, describe, expect, it } from "vitest";

const dir = join(__dirname, "..", "db", "migrations");
const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();

describe("migrations", () => {
  it("never drop or truncate", () => {
    for (const f of files) expect(readFileSync(join(dir, f), "utf8")).not.toMatch(/\b(DROP|TRUNCATE)\b/i);
  });

  describe("0001_init", () => {
    let db: PGlite;
    beforeAll(async () => {
      db = new PGlite();
      for (const f of files) await db.exec(readFileSync(join(dir, f), "utf8"));
      await db.exec(`INSERT INTO languages (id, name, code, native_name, writing_system, status)
                     VALUES ('yo', 'Yorùbá', 'yo', 'Yorùbá', 'Latin', 'active');
                     INSERT INTO decks (id, name, language_id, tier, region)
                     VALUES ('d1', 'Proverb House', 'yo', 2, 'SW');`);
    });

    it("stores language text byte-for-byte, decomposed marks included", async () => {
      const decomposed = "Ogbifọ̀ \n  ẹ́";
      await db.query(
        `INSERT INTO cards (id, deck_id, language_id, category, source_text, translation, source, difficulty)
         VALUES ('c1', 'd1', 'yo', 'proverb', $1, 'x', 's', 1)`,
        [decomposed],
      );
      const { rows } = await db.query<{ source_text: string }>("SELECT source_text FROM cards WHERE id = 'c1'");
      expect(rows[0]?.source_text).toBe(decomposed);
    });

    it.each([
      ["a blank source text", `'proverb', '  ', 'x', 's', 1`],
      ["an unknown category", `'post', 'a', 'x', 's', 1`],
      ["a difficulty of 4", `'proverb', 'a', 'x', 's', 4`],
    ])("rejects %s", async (_n, values) => {
      await expect(
        db.exec(`INSERT INTO cards (id, deck_id, language_id, category, source_text, translation, source, difficulty)
                 VALUES ('bad', 'd1', 'yo', ${values})`),
      ).rejects.toThrow();
    });

    it("defaults new Cards to unreviewed, and never lets a one-reviewer Card be reviewed", async () => {
      const { rows } = await db.query<{ review_status: string }>("SELECT review_status FROM cards WHERE id = 'c1'");
      expect(rows[0]?.review_status).toBe("unreviewed");
      await expect(
        db.exec("UPDATE cards SET review_status = 'reviewed', reviewers = ARRAY['A'], reviewed_at = now() WHERE id = 'c1'"),
      ).rejects.toThrow();
      await db.exec("UPDATE cards SET review_status = 'reviewed', reviewers = ARRAY['A', 'B'], reviewed_at = now() WHERE id = 'c1'");
    });

    it("stops a Deck unlocking itself", async () => {
      await expect(db.exec("UPDATE decks SET unlocked_by_deck_id = 'd1' WHERE id = 'd1'")).rejects.toThrow();
    });

    it("keeps reading sessions in order and tied to a real Card", async () => {
      await db.exec("INSERT INTO reading_sessions (id, card_id, mode, started_at) VALUES ('s1', 'c1', 'live', now())");
      await expect(
        db.exec("INSERT INTO reading_sessions (id, card_id, mode, started_at) VALUES ('s2', 'nope', 'live', now())"),
      ).rejects.toThrow();
      await expect(
        db.exec("INSERT INTO reading_sessions (id, card_id, mode, started_at, completed_at) VALUES ('s3', 'c1', 'live', now(), now() - interval '1 hour')"),
      ).rejects.toThrow();
      await expect(
        db.exec("INSERT INTO reading_sessions (id, card_id, mode, started_at) VALUES ('s4', 'c1', 'quiz', now())"),
      ).rejects.toThrow();
    });

    it("rejects a card for a deck that does not exist", async () => {
      await expect(
        db.exec(`INSERT INTO cards (id, deck_id, language_id, category, source_text, translation, source, difficulty)
                 VALUES ('orphan', 'missing', 'yo', 'proverb', 'a', 'x', 's', 1)`),
      ).rejects.toThrow();
    });
  });

  describe("0004_contributions", () => {
    let db: PGlite;
    const cols = "id, client_id, type, kind, language_id, content_text, consent_version, consent_accepted_at, licence_grant, rights_declaration, rights_note, retention_policy, created_at";
    const grant = `'{"scope":"archive_display_and_verification","exclusive":false,"platform":"ogbifo_only","revocable":true}'::jsonb`;
    const row = (id: string, over: Record<string, string> = {}) => {
      const v: Record<string, string> = {
        id: `'${id}'`, client_id: `'${id}'`, type: "'text'", kind: "'proverb'", language_id: "'yo'", content_text: "'Ẹ káàbọ̀'",
        consent_version: "'draft-0.1'", consent_accepted_at: "now()", licence_grant: grant, rights_declaration: "'own_work'",
        rights_note: "NULL", retention_policy: "'until_withdrawn'", created_at: "now()", ...over,
      };
      return `INSERT INTO contributions (${cols}) VALUES (${cols.split(", ").map((c) => v[c]).join(", ")})`;
    };
    beforeAll(async () => {
      db = new PGlite();
      for (const f of files) await db.exec(readFileSync(join(dir, f), "utf8"));
      await db.exec("INSERT INTO languages (id, name, code, native_name, writing_system, status) VALUES ('yo', 'Yorùbá', 'yo', 'Yorùbá', 'Latin', 'active')");
    });
    it("accepts a complete contribution and defaults to pending_review", async () => {
      await db.exec(row("a"));
      const { rows } = await db.query<{ verification_status: string }>("SELECT verification_status FROM contributions WHERE id = 'a'");
      expect(rows[0]?.verification_status).toBe("pending_review");
    });
    it("treats client_id as an idempotency key", async () => {
      await expect(db.exec(row("b", { client_id: "'a'" }))).rejects.toThrow();
    });
    it.each([
      ["no consent version", { consent_version: "' '" }],
      ["a different licence grant", { licence_grant: `'{"scope":"anything","exclusive":true}'::jsonb` }],
      ["an unknown rights declaration", { rights_declaration: "'whatever'" }],
      ["lyrics with no rights note", { kind: "'lyric'" }],
      ["permission with no note", { rights_declaration: "'rights_holder_permission'" }],
      ["a retention policy not yet defined", { retention_policy: "'forever'" }],
    ])("rejects %s", async (_n, over) => {
      await expect(db.exec(row("bad", over))).rejects.toThrow();
    });
    it("stores a lyric that names its rights holder", async () => {
      await db.exec(row("l", { kind: "'lyric'", rights_note: "'Publisher X, by letter'" }));
    });
    it("stops one user confirming twice", async () => {
      await db.exec("INSERT INTO peer_confirmations (id, contribution_id, user_id, created_at) VALUES ('p1', 'a', 'u1', now())");
      await expect(db.exec("INSERT INTO peer_confirmations (id, contribution_id, user_id, created_at) VALUES ('p2', 'a', 'u1', now())")).rejects.toThrow();
    });
    it("keeps peer_verified and its time together", async () => {
      await expect(db.exec("UPDATE contributions SET verification_status = 'peer_verified' WHERE id = 'a'")).rejects.toThrow();
      await db.exec("UPDATE contributions SET verification_status = 'peer_verified', verified_at = now() WHERE id = 'a'");
    });
  });
});
