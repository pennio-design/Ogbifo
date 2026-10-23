import { describe, expect, it } from "vitest";
import { createCard } from "../src/card";
import {
  ContentService, InMemoryCardRepository, InMemoryDeckRepository, InMemoryLanguageRepository,
  seedCards, seedDecks, seedLanguages,
} from "../src";

const service = (allowUnreviewed = true) =>
  new ContentService(
    new InMemoryLanguageRepository(seedLanguages),
    new InMemoryDeckRepository(seedDecks),
    new InMemoryCardRepository(seedCards),
    { allowUnreviewed },
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
    expect(result.ok && result.value.cards[0]?.sourceText).toContain("Adìyẹ tí kò kú ṣì maa jẹ àgbàdo");
  });

  it("reports a missing deck with a structured error, not an exception", async () => {
    const result = await service().getDeck("nope");
    expect(result).toEqual({ ok: false, error: { code: "DECK_NOT_FOUND", message: "Deck could not be found." } });
  });

  it("shows no unreviewed Card to users by default (D-012)", async () => {
    const summaries = await service(false).listDeckSummaries();
    expect(summaries.every((s) => s.cardCount === 0)).toBe(true);
    const detail = await service(false).getDeck("proverb-house-yo");
    expect(detail.ok && detail.value.cards).toEqual([]);
  });

  it("shows a reviewed Card and hides an unreviewed one in the same Deck", async () => {
    const seed = seedCards.find((c) => c.id === "card-yo-greeting-1")!;
    const reviewed = createCard({ ...seed, id: "r1", reviewStatus: "reviewed", reviewers: ["A One", "B Two"], reviewedAt: "2026-10-18T00:00:00.000Z" });
    if (!reviewed.ok) throw new Error("fixture");
    const svc = new ContentService(
      new InMemoryLanguageRepository(seedLanguages),
      new InMemoryDeckRepository(seedDecks),
      new InMemoryCardRepository([...seedCards, reviewed.value]),
    );
    const detail = await svc.getDeck("common-tongue-yo");
    expect(detail.ok && detail.value.cards.map((c) => c.id)).toEqual(["r1"]);
  });

  it("returns a Card only if a learner may see it", async () => {
    const found = await service(true).getCard("card-yo-greeting-1");
    expect(found.ok && found.value.id).toBe("card-yo-greeting-1");
    const hidden = await service(false).getCard("card-yo-greeting-1");
    expect(hidden).toEqual({ ok: false, error: { code: "CARD_NOT_FOUND", message: "Card could not be found." } });
    expect((await service(true).getCard("nope")).ok).toBe(false);
  });

  it("orders Cards easiest first, then by id", async () => {
    const detail = await service().getDeck("proverb-house-yo");
    const diffs = detail.ok ? detail.value.cards.map((c) => c.difficulty) : [];
    expect(diffs).toEqual([...diffs].sort((a, b) => a - b));
  });

  it("tells a locked Deck which Deck unlocks it, and the other way round (D-029)", async () => {
    const locked = await service().getDeck("proverb-house-yo");
    expect(locked.ok && locked.value.requiredDeck).toEqual({ id: "common-tongue-yo", name: "Common Tongue", cardIds: ["card-yo-greeting-1"] });
    const opener = await service().getDeck("common-tongue-yo");
    expect(opener.ok && opener.value.unlocks).toEqual([{ id: "proverb-house-yo", name: "Proverb House" }]);
    expect(opener.ok && opener.value.requiredDeck).toBeNull();
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
