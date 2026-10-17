import type { Card } from "./card";
import type { Deck } from "./deck";
import type { Language } from "./language";
import type { CardRepository, DeckRepository, LanguageRepository } from "./repositories";
import { fail, ok, type Result } from "./result";

export interface ContentPolicy {
  /**
   * D-012: users only see reviewed Cards. Set true for development with the
   * developer seed, never in a release.
   */
  readonly allowUnreviewed: boolean;
}

export interface DeckRef {
  readonly id: string;
  readonly name: string;
  readonly cardIds: readonly string[];
}

export interface DeckSummary {
  readonly deck: Deck;
  readonly language: Language;
  readonly cardCount: number;
  readonly cardIds: readonly string[];
}

export interface DeckDetail {
  readonly deck: Deck;
  readonly language: Language;
  readonly cards: readonly Card[];
  /** The Deck that must be finished to unlock this one, if any. */
  readonly requiredDeck: DeckRef | null;
  /** Decks that this Deck unlocks when finished. */
  readonly unlocks: readonly { readonly id: string; readonly name: string }[];
}

const byDifficultyThenId = (a: Card, b: Card) => a.difficulty - b.difficulty || a.id.localeCompare(b.id);

export class ContentService {
  constructor(
    private readonly languages: LanguageRepository,
    private readonly decks: DeckRepository,
    private readonly cards: CardRepository,
    private readonly policy: ContentPolicy = { allowUnreviewed: false },
  ) {}

  listLanguages(): Promise<readonly Language[]> {
    return this.languages.list();
  }

  /** Cards a learner may see, easiest first. */
  private async visibleCards(deckId: string): Promise<readonly Card[]> {
    const cards = await this.cards.listByDeck(deckId);
    const visible = this.policy.allowUnreviewed ? cards : cards.filter((card) => card.reviewStatus === "reviewed");
    return [...visible].sort(byDifficultyThenId);
  }

  /** Decks with their language and Cards, ordered by language name then deck name. */
  async listDeckSummaries(): Promise<readonly DeckSummary[]> {
    const [languages, decks] = await Promise.all([this.languages.list(), this.decks.list()]);
    const languageById = new Map(languages.map((language) => [language.id, language]));
    const summaries: DeckSummary[] = [];
    for (const deck of decks) {
      const language = languageById.get(deck.languageId);
      if (!language) continue;
      const cardIds = (await this.visibleCards(deck.id)).map((card) => card.id);
      summaries.push({ deck, language, cardCount: cardIds.length, cardIds });
    }
    return summaries.sort(
      (a, b) => a.language.name.localeCompare(b.language.name) || a.deck.name.localeCompare(b.deck.name),
    );
  }

  /** One Card, if a learner may see it. Unreviewed Cards are hidden by policy (D-012). */
  async getCard(cardId: string): Promise<Result<Card>> {
    const card = await this.cards.getById(cardId);
    if (!card || (!this.policy.allowUnreviewed && card.reviewStatus !== "reviewed")) {
      return fail("CARD_NOT_FOUND", "Card could not be found.");
    }
    return ok(card);
  }

  async getDeck(deckId: string): Promise<Result<DeckDetail>> {
    const deck = await this.decks.getById(deckId);
    if (!deck) return fail("DECK_NOT_FOUND", "Deck could not be found.");
    const language = await this.languages.getById(deck.languageId);
    if (!language) return fail("LANGUAGE_NOT_FOUND", "Language could not be found.");

    let requiredDeck: DeckRef | null = null;
    if (deck.unlockedByDeckId !== undefined) {
      const required = await this.decks.getById(deck.unlockedByDeckId);
      if (required) {
        const cardIds = (await this.visibleCards(required.id)).map((card) => card.id);
        requiredDeck = { id: required.id, name: required.name, cardIds };
      }
    }
    const unlocks = (await this.decks.list())
      .filter((other) => other.unlockedByDeckId === deck.id)
      .map((other) => ({ id: other.id, name: other.name }));

    return ok({ deck, language, cards: await this.visibleCards(deck.id), requiredDeck, unlocks });
  }
}
