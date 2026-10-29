import { createCard, type Card } from "./card";
import { createDeck, type Deck } from "./deck";
import { createLanguage, type Language } from "./language";
import type { Result } from "./result";

/**
 * Developer seed content for building the app. Yorùbá only (D-010). Every card
 * is unreviewed until two named native speakers approve it (D-012). The proverb is
 * supplied by the owner; the earlier example from the concept material was invented.
 * Replace with Archive content before any public release.
 */
const SEED_SOURCE = "Developer seed. Pending native-speaker review.";
const SEEDED_AT = "2026-10-17T00:00:00.000Z";

function must<T>(result: Result<T>): T {
  if (!result.ok) throw new Error(`Invalid seed (${result.error.code}): ${result.error.message}`);
  return result.value;
}

const language = (input: Language) => must(createLanguage(input));
const deck = (input: Deck) => must(createDeck(input));
const card = (input: Omit<Card, "source" | "createdAt" | "reviewStatus" | "reviewers">) =>
  must(createCard({ ...input, source: SEED_SOURCE, createdAt: SEEDED_AT, reviewStatus: "unreviewed", reviewers: [] }));

export const seedLanguages: readonly Language[] = [
  language({ id: "yo", name: "Yorùbá", code: "yo", nativeName: "Yorùbá", regions: ["South West Nigeria", "Benin", "Togo"], writingSystem: "Latin, tone-marked", status: "active", archiveCount: 0, archiveGapScore: 0.5 }),
];

export const seedDecks: readonly Deck[] = [
  deck({ id: "proverb-house-yo", name: "Proverb House", languageId: "yo", description: "Proverbs and the meaning carried inside them.", tier: 2, region: "South West Nigeria", tokenMultiplier: 1.5, isLocked: true, unlockedByDeckId: "common-tongue-yo" }),
  deck({ id: "common-tongue-yo", name: "Common Tongue", languageId: "yo", description: "Everyday greetings and daily speech.", tier: 1, region: "South West Nigeria", tokenMultiplier: 1, isLocked: false }),
];

export const seedCards: readonly Card[] = [
  card({ id: "card-yo-proverb-1", deckId: "proverb-house-yo", languageId: "yo", category: "proverb", sourceText: "Adìyẹ tí kò kú ṣì maa jẹ àgbàdo.", translation: "A fowl that isn't dead will still eat corn.", context: "When there is life, there is hope: said to encourage someone who has not given up. Often spoken contracted: Adìyẹ tí 'ò kú ṣì maa j'àgbàdo.", tokenValue: 30, difficulty: 2 }),
  card({ id: "card-yo-greeting-1", deckId: "common-tongue-yo", languageId: "yo", category: "greeting", sourceText: "Ẹ káàárọ̀", translation: "Good morning", context: "Formal morning greeting.", tokenValue: 10, difficulty: 1 }),
];
