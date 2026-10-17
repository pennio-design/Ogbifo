import { describe, expect, it } from "vitest";
import { createCard, type Card } from "../src/card";
import { createDeck, type Deck } from "../src/deck";
import { createLanguage, type Language } from "../src/language";

const card: Card = {
  id: "c1", deckId: "d1", languageId: "yo", category: "proverb",
  sourceText: "  Ẹni tó bá fẹ́ jẹuṇ  ", translation: "t", context: "", source: "s",
  tokenValue: 10, difficulty: 2, createdAt: "2026-10-17T00:00:00.000Z",
  reviewStatus: "unreviewed", reviewers: [],
};

describe("createCard", () => {
  it("keeps source text exactly as given", () => {
    const result = createCard(card);
    expect(result.ok && result.value.sourceText).toBe(card.sourceText);
  });
  it.each([
    ["blank source text", { sourceText: "  " }, "sourceText"],
    ["blank translation", { translation: "" }, "translation"],
    ["negative token value", { tokenValue: -1 }, "tokenValue"],
    ["fractional token value", { tokenValue: 1.5 }, "tokenValue"],
    ["bad difficulty", { difficulty: 4 as never }, "difficulty"],
    ["unknown category", { category: "post" as never }, "category"],
    ["bad date", { createdAt: "yesterday" }, "createdAt"],
  ])("rejects %s", (_name, patch, field) => {
    const result = createCard({ ...card, ...patch });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.field).toBe(field);
  });
});

describe("createCard review rules (D-012)", () => {
  const reviewed = { ...card, reviewStatus: "reviewed" as const, reviewers: ["Adé Bámidélé", "Folake Ojo"], reviewedAt: "2026-10-18T00:00:00.000Z" };
  it("accepts two distinct named reviewers and a date", () => expect(createCard(reviewed).ok).toBe(true));
  it("rejects a reviewed Card with one reviewer", () => {
    const r = createCard({ ...reviewed, reviewers: ["Adé Bámidélé"] });
    expect(!r.ok && r.error.field).toBe("reviewers");
  });
  it("counts the same name twice, in any case or spacing, as one reviewer", () => {
    expect(createCard({ ...reviewed, reviewers: ["Adé", "  adé "] }).ok).toBe(false);
  });
  it("rejects blank reviewer names", () => expect(createCard({ ...reviewed, reviewers: ["Adé", " "] }).ok).toBe(false));
  it("rejects a reviewed Card with no review date", () => {
    const rest: Partial<typeof reviewed> = { ...reviewed };
    delete rest.reviewedAt;
    expect(createCard(rest as typeof reviewed).ok).toBe(false);
  });
  it("rejects an unknown status", () => expect(createCard({ ...card, reviewStatus: "approved" as never }).ok).toBe(false));
});

describe("createDeck", () => {
  const deck: Deck = { id: "d", name: "Proverb House", languageId: "yo", description: "", tier: 2, region: "r", tokenMultiplier: 1.5, isLocked: false };
  it("accepts a valid deck", () => expect(createDeck(deck).ok).toBe(true));
  it("rejects a multiplier below 1", () => expect(createDeck({ ...deck, tokenMultiplier: 0.5 }).ok).toBe(false));
  it("rejects a Deck that unlocks itself", () => expect(createDeck({ ...deck, unlockedByDeckId: "d" }).ok).toBe(false));
  it("rejects an unknown tier", () => expect(createDeck({ ...deck, tier: 5 as never }).ok).toBe(false));
});

describe("createLanguage", () => {
  const lang: Language = { id: "yo", name: "Yorùbá", code: "yo", nativeName: "Yorùbá", regions: [], writingSystem: "Latin", status: "active", archiveCount: 0, archiveGapScore: 0.5 };
  it("accepts a valid language", () => expect(createLanguage(lang).ok).toBe(true));
  it("rejects a gap score outside 0 to 1", () => expect(createLanguage({ ...lang, archiveGapScore: 1.2 }).ok).toBe(false));
  it("rejects NaN gap score", () => expect(createLanguage({ ...lang, archiveGapScore: Number.NaN }).ok).toBe(false));
  it("rejects a negative archive count", () => expect(createLanguage({ ...lang, archiveCount: -1 }).ok).toBe(false));
});
