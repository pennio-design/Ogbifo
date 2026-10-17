import { describe, expect, it } from "vitest";
import {
  ContentService, InMemoryCardRepository, InMemoryDeckRepository, InMemoryLanguageRepository,
  seedCards, seedDecks, seedLanguages,
} from "../src";

const service = () =>
  new ContentService(
    new InMemoryLanguageRepository(seedLanguages),
    new InMemoryDeckRepository(seedDecks),
    new InMemoryCardRepository(seedCards),
  );

describe("ContentService", () => {
  it("summarises every seeded deck with its language and card count", async () => {
    const summaries = await service().listDeckSummaries();
    expect(summaries).toHaveLength(seedDecks.length);
    const proverbHouse = summaries.find((s) => s.deck.id === "proverb-house-yo");
    expect(proverbHouse?.language.name).toBe("Yorùbá");
    expect(proverbHouse?.cardCount).toBe(1);
  });

  it("returns a deck with its cards", async () => {
    const result = await service().getDeck("proverb-house-yo");
    expect(result.ok && result.value.cards[0]?.sourceText).toContain("Ẹni tó bá fẹ́ jẹun");
  });

  it("reports a missing deck with a structured error, not an exception", async () => {
    const result = await service().getDeck("nope");
    expect(result).toEqual({ ok: false, error: { code: "DECK_NOT_FOUND", message: "Deck could not be found." } });
  });

  it("skips decks whose language is missing instead of failing the list", async () => {
    const svc = new ContentService(
      new InMemoryLanguageRepository([]),
      new InMemoryDeckRepository(seedDecks),
      new InMemoryCardRepository(seedCards),
    );
    expect(await svc.listDeckSummaries()).toEqual([]);
  });
});

describe("seed content", () => {
  it("references only existing decks and languages", () => {
    const decks = new Set(seedDecks.map((d) => d.id));
    const langs = new Set(seedLanguages.map((l) => l.id));
    for (const c of seedCards) {
      expect(decks.has(c.deckId)).toBe(true);
      expect(langs.has(c.languageId)).toBe(true);
    }
    for (const d of seedDecks) expect(langs.has(d.languageId)).toBe(true);
  });
  it("is marked as unreviewed", () => {
    for (const c of seedCards) expect(c.source).toMatch(/pending native-speaker review/i);
  });
});
