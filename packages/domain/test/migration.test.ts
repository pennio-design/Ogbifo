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
});
