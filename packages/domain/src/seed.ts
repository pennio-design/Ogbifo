import { createCard, type Card } from "./card";
import { createDeck, type Deck } from "./deck";
import { createLanguage, type Language } from "./language";
import type { Result } from "./result";

/**
 * Developer seed content for building the app. Every card comes from the
 * product concept material and has NOT been reviewed by a native speaker.
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
const card = (input: Omit<Card, "source" | "createdAt">) =>
  must(createCard({ ...input, source: SEED_SOURCE, createdAt: SEEDED_AT }));

export const seedLanguages: readonly Language[] = [
  language({ id: "yo", name: "Yorùbá", code: "yo", nativeName: "Yorùbá", regions: ["South West Nigeria", "Benin", "Togo"], writingSystem: "Latin, tone-marked", status: "active", archiveCount: 0, archiveGapScore: 0.5 }),
  language({ id: "ha", name: "Hausa", code: "ha", nativeName: "Hausa", regions: ["Northern Nigeria", "Niger"], writingSystem: "Latin (Boko)", status: "active", archiveCount: 0, archiveGapScore: 0.5 }),
  language({ id: "ig", name: "Igbo", code: "ig", nativeName: "Igbo", regions: ["South East Nigeria"], writingSystem: "Latin, dot-below", status: "active", archiveCount: 0, archiveGapScore: 0.5 }),
  language({ id: "pcm", name: "Pidgin", code: "pcm", nativeName: "Naijá", regions: ["Nigeria"], writingSystem: "Latin", status: "active", archiveCount: 0, archiveGapScore: 0.5 }),
];

export const seedDecks: readonly Deck[] = [
  deck({ id: "proverb-house-yo", name: "Proverb House", languageId: "yo", description: "Proverbs and the meaning carried inside them.", tier: 2, region: "South West Nigeria", tokenMultiplier: 1.5, isLocked: false }),
  deck({ id: "common-tongue-yo", name: "Common Tongue", languageId: "yo", description: "Everyday greetings and daily speech.", tier: 1, region: "South West Nigeria", tokenMultiplier: 1, isLocked: false }),
  deck({ id: "common-tongue-ha", name: "Common Tongue", languageId: "ha", description: "Everyday greetings and daily speech.", tier: 1, region: "Northern Nigeria", tokenMultiplier: 1, isLocked: false }),
  deck({ id: "common-tongue-ig", name: "Common Tongue", languageId: "ig", description: "Everyday greetings and daily speech.", tier: 1, region: "South East Nigeria", tokenMultiplier: 1, isLocked: false }),
  deck({ id: "common-tongue-pcm", name: "Common Tongue", languageId: "pcm", description: "Everyday greetings and daily speech.", tier: 1, region: "Nigeria", tokenMultiplier: 1, isLocked: false }),
];

export const seedCards: readonly Card[] = [
  card({ id: "card-yo-proverb-1", deckId: "proverb-house-yo", languageId: "yo", category: "proverb", sourceText: "Ẹni tó bá fẹ́ jẹun tó dára,\nkò gbọdọ̀ jẹkí ojúkòkòrò mú un.", translation: "One who wants to eat well\nmust not let greed consume them.", context: "A caution that appetite without restraint spoils the very thing it wants.", tokenValue: 30, difficulty: 2 }),
  card({ id: "card-yo-greeting-1", deckId: "common-tongue-yo", languageId: "yo", category: "greeting", sourceText: "Ẹ káàárọ̀", translation: "Good morning", context: "Formal morning greeting.", tokenValue: 10, difficulty: 1 }),
  card({ id: "card-ha-greeting-1", deckId: "common-tongue-ha", languageId: "ha", category: "greeting", sourceText: "Sannu da zuwa", translation: "Welcome", context: "A common welcome in the north.", tokenValue: 10, difficulty: 1 }),
  card({ id: "card-ig-greeting-1", deckId: "common-tongue-ig", languageId: "ig", category: "greeting", sourceText: "Nnọọ", translation: "Welcome", context: "Used in formal greetings across the south east.", tokenValue: 10, difficulty: 1 }),
  card({ id: "card-pcm-greeting-1", deckId: "common-tongue-pcm", languageId: "pcm", category: "greeting", sourceText: "How far?", translation: "How are you? What is happening?", context: "Casual greeting.", tokenValue: 10, difficulty: 1 }),
];
