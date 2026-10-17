import { isTier, type Tier } from "./deck";
import { fail, ok, type Result } from "./result";
import { isBlank } from "./text";

export const CARD_CATEGORIES = [
  "proverb",
  "greeting",
  "daily_speech",
  "praise_song_excerpt",
  "market_expression",
  "cultural_expression",
  "general_phrase",
] as const;

export type CardCategory = (typeof CARD_CATEGORIES)[number];

export interface Card {
  readonly id: string;
  readonly deckId: string;
  readonly languageId: string;
  readonly dialectId?: string;
  readonly category: CardCategory;
  /** Exactly as written by the source. Never normalized, trimmed or re-cased. */
  readonly sourceText: string;
  readonly translation: string;
  readonly context: string;
  readonly source: string;
  readonly tokenValue: number;
  readonly difficulty: Tier;
  readonly createdAt: string;
}

export function isCardCategory(value: string): value is CardCategory {
  return (CARD_CATEGORIES as readonly string[]).includes(value);
}

export function createCard(input: Card): Result<Card> {
  if (isBlank(input.id)) return fail("CARD_INVALID", "Card needs an id.", "id");
  if (isBlank(input.deckId)) return fail("CARD_INVALID", "Card needs a deck.", "deckId");
  if (isBlank(input.languageId)) return fail("CARD_INVALID", "Card needs a language.", "languageId");
  if (!isCardCategory(input.category)) return fail("CARD_INVALID", "Unknown card category.", "category");
  if (isBlank(input.sourceText)) return fail("CARD_INVALID", "Card needs source text.", "sourceText");
  if (isBlank(input.translation)) return fail("CARD_INVALID", "Card needs a translation.", "translation");
  if (!Number.isInteger(input.tokenValue) || input.tokenValue < 0) {
    return fail("CARD_INVALID", "Token value must be a whole number, zero or more.", "tokenValue");
  }
  if (!isTier(input.difficulty)) return fail("CARD_INVALID", "Difficulty must be 1, 2 or 3.", "difficulty");
  if (Number.isNaN(Date.parse(input.createdAt))) {
    return fail("CARD_INVALID", "Created date must be an ISO date.", "createdAt");
  }
  return ok({ ...input });
}
