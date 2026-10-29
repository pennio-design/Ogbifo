import { describe, expect, it } from "vitest";
import { cardSheetTemplate, CARD_SHEET_COLUMNS, checkCardSheetCsv, exportCards, parseCardFile, MAX_CARD_GRAPHEMES } from "../src/card-sheet";
import { toCsv } from "../src/csv";
import type { DialectRegister } from "../src/dialect";

// Test fixtures exercise the checker's mechanics. They are not Card content.
const register: DialectRegister = { dialects: [{ id: "standard", name: "Standard Yorùbá" }, { id: "test-a", name: "Test A" }] };
const ctx = { register, deckIds: ["common-tongue-yo", "proverb-house-yo"], languageId: "yo" };
const songsOn = { ...ctx, acceptSongExcerpts: true };
const NOW = "2026-11-01T00:00:00.000Z";
const header = CARD_SHEET_COLUMNS.join(",");
const line = (o: Partial<Record<(typeof CARD_SHEET_COLUMNS)[number], string>>) => toCsv([CARD_SHEET_COLUMNS.map((c) => o[c] ?? "")]).trimEnd();
const base = {
  id: "card-yo-test-1", deck: "common-tongue-yo", category: "greeting", dialect: "standard", text: "Ẹ káàárọ̀",
  translation: "Good morning", context: "Morning greeting.", source: "own knowledge", difficulty: "1", contributor: "Ada",
};
const signed = { ...base, reviewer_1: "Bayo", reviewer_1_dialect: "standard", reviewer_2: "Chi", reviewer_2_dialect: "standard", reviewed_on: "2026-10-31" };
const check = (...lines: string[]) => checkCardSheetCsv([header, ...lines].join("\n"), ctx, NOW);
const checkSongs = (...lines: string[]) => checkCardSheetCsv([header, ...lines].join("\n"), songsOn, NOW);
const codes = (r: ReturnType<typeof check>, i = 0) => r.rows[i]!.errors.map((e) => e.code);

describe("cards sheet", () => {
  it("turns a complete unreviewed row into an unreviewed Card, text as typed", () => {
    const nfd = base.text.normalize("NFD");
    const r = check(line({ ...base, text: nfd }));
    expect(r.counts).toMatchObject({ rows: 1, ok: 1, unreviewed: 1, reviewed: 0 });
    expect(r.cards[0]).toMatchObject({ id: "card-yo-test-1", deckId: "common-tongue-yo", languageId: "yo", dialectId: "standard", sourceText: nfd, reviewStatus: "unreviewed", reviewers: [], difficulty: 1, tokenValue: 10 });
  });
  it("makes a Card Reviewed only with two different reviewers who speak the dialect, and a date", () => {
    const r = check(line(signed));
    expect(r.cards[0]).toMatchObject({ reviewStatus: "reviewed", reviewers: ["Bayo", "Chi"], reviewedAt: "2026-10-31" });
    expect(codes(check(line({ ...signed, reviewer_2: "bayo" })))).toContain("SAME_REVIEWER_TWICE");
    expect(codes(check(line({ ...signed, reviewer_1: "Ada" })))).toContain("REVIEWER_IS_CONTRIBUTOR");
    expect(codes(check(line({ ...signed, dialect: "test-a" })))).toContain("REVIEWER_DIALECT_MISMATCH");
    expect(codes(check(line({ ...signed, reviewed_on: "" })))).toContain("REVIEWED_ON_MISSING");
  });
  it("accepts sentence punctuation and line breaks but still checks tone marks", () => {
    const proverb = 'Ẹni tó bá fẹ́ jẹun,\nkò gbọdọ̀ jẹkí ojúkòkòrò mú un!';
    expect(check(line({ ...base, text: proverb })).rows[0]!.errors).toEqual([]);
    expect(codes(check(line({ ...base, text: "Ẹ t̀a" })))).toContain("TONE_ON_CONSONANT");
    expect(codes(check(line({ ...base, text: "Ẹ ká1" })))).toContain("UNEXPECTED_CHARACTER");
  });
  it("reports missing and invalid cells in plain words, row by row", () => {
    const r = check(
      line({ ...base, id: "" }), line({ ...base, id: "Bad Id" }), line({ ...base, deck: "nope" }), line({ ...base, category: "joke" }),
      line({ ...base, translation: "" }), line({ ...base, context: "" }), line({ ...base, difficulty: "4" }), line({ ...base, dialect: "mars" }),
      line({ ...base, tokens: "-3" }),
    );
    expect(r.rows.map((x) => x.errors[0]?.code)).toEqual([
      "ID_MISSING", "ID_INVALID", "DECK_UNKNOWN", "CATEGORY_UNKNOWN", "TRANSLATION_MISSING", "CONTEXT_MISSING", "DIFFICULTY_INVALID", "DIALECT_UNKNOWN", "TOKENS_INVALID",
    ]);
  });
  it("does not accept songs and praise-poem excerpts for now (counsel, OPEN_CONFLICTS #29)", () => {
    const r = check(line({ ...base, category: "praise_song_excerpt", rights: "Traditional oriki" }));
    expect(codes(r)).toContain("CATEGORY_NOT_ACCEPTED");
    expect(r.cards).toHaveLength(0);
  });
  it("when songs are switched on, they need a rights note (D-020)", () => {
    expect(codes(checkSongs(line({ ...base, category: "praise_song_excerpt" })))).toContain("RIGHTS_MISSING");
    const ok = checkSongs(line({ ...base, category: "praise_song_excerpt", rights: "Traditional oriki, recited by the contributor's grandmother" }));
    expect(ok.rows[0]!.errors).toEqual([]);
    expect(ok.rows[0]!.warnings.map((w) => w.code)).toContain("COPYRIGHT_CARE");
    expect(ok.rights["card-yo-test-1"]).toMatch(/grandmother/);
  });
  it("flags a repeated id, and the same text in the same Deck", () => {
    const r = check(line(base), line(base), line({ ...base, id: "card-yo-test-2" }), line({ ...base, id: "card-yo-test-3", deck: "proverb-house-yo" }));
    expect(codes(r, 1)).toEqual(expect.arrayContaining(["DUPLICATE_ID", "DUPLICATE_TEXT"]));
    expect(codes(r, 2)).toEqual(["DUPLICATE_TEXT"]);
    expect(r.rows[3]!.errors).toEqual([]);
  });
  it("limits length by user-perceived characters", () => {
    expect(check(line({ ...base, text: "ẹ́".repeat(MAX_CARD_GRAPHEMES) })).rows[0]!.errors).toEqual([]);
    expect(codes(check(line({ ...base, text: "ẹ́".repeat(MAX_CARD_GRAPHEMES + 1) })))).toContain("TEXT_TOO_LONG");
  });
  it("describes file-level problems", () => {
    expect(checkCardSheetCsv("", ctx, NOW).fatal[0]!.code).toBe("EMPTY_FILE");
    expect(checkCardSheetCsv("id,deck\nx,y", ctx, NOW).fatal[0]!.code).toBe("COLUMNS_MISSING");
    expect(checkCardSheetCsv(`${header},oops\n`, ctx, NOW).fatal.map((f) => f.code)).toContain("COLUMNS_UNKNOWN");
  });
  it("exports reviewed Cards only unless asked, with their rights notes, never as gold", () => {
    const r = check(line(signed), line({ ...base, id: "card-yo-test-2", text: "Ẹ ǹlẹ́", rights: "own" }));
    const reviewed = exportCards(r, NOW);
    expect(reviewed.cards.map((c) => c.id)).toEqual(["card-yo-test-1"]);
    expect(exportCards(r, NOW, true).cards).toHaveLength(2);
    expect(Object.keys(exportCards(r, NOW, true).rights)).toEqual(["card-yo-test-2"]);
    expect(JSON.stringify(reviewed)).not.toMatch(/gold|certified|authoritative/i);
  });
  it("round-trips through the file the app reads, and rejects a bad Card without dropping the rest", () => {
    const r = check(line(signed));
    const file = JSON.parse(JSON.stringify(exportCards(r, NOW)));
    expect(parseCardFile(file).cards).toHaveLength(1);
    file.cards.push({ ...file.cards[0], id: "bad", reviewers: ["Only One"] });
    const parsed = parseCardFile(file);
    expect(parsed.cards.map((c) => c.id)).toEqual(["card-yo-test-1"]);
    expect(parsed.rejected).toEqual([{ id: "bad", reason: expect.stringMatching(/distinct named reviewers/) }]);
    expect(parseCardFile({ nope: 1 }).rejected).toHaveLength(1);
  });
  it("template is just the header", () => expect(cardSheetTemplate()).toBe(header + "\n"));
});
