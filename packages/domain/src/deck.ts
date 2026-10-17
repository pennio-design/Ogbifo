import { fail, ok, type Result } from "./result";
import { isBlank } from "./text";

export type Tier = 1 | 2 | 3;

export interface Deck {
  readonly id: string;
  readonly name: string;
  readonly languageId: string;
  readonly description: string;
  readonly tier: Tier;
  readonly region: string;
  readonly tokenMultiplier: number;
  readonly isLocked: boolean;
  /** D-029: finishing this Deck unlocks the locked Deck. Progression only, never payment. */
  readonly unlockedByDeckId?: string;
}

export function isTier(value: number): value is Tier {
  return value === 1 || value === 2 || value === 3;
}

export function createDeck(input: Deck): Result<Deck> {
  if (isBlank(input.id)) return fail("DECK_INVALID", "Deck needs an id.", "id");
  if (isBlank(input.name)) return fail("DECK_INVALID", "Deck needs a name.", "name");
  if (isBlank(input.languageId)) return fail("DECK_INVALID", "Deck needs a language.", "languageId");
  if (!isTier(input.tier)) return fail("DECK_INVALID", "Tier must be 1, 2 or 3.", "tier");
  if (!(input.tokenMultiplier >= 1)) {
    return fail("DECK_INVALID", "Token multiplier must be 1 or more.", "tokenMultiplier");
  }
  if (input.unlockedByDeckId === input.id) {
    return fail("DECK_INVALID", "A Deck cannot be unlocked by itself.", "unlockedByDeckId");
  }
  return ok({ ...input });
}
