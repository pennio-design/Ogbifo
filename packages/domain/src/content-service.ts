import type { Card } from "./card";
import type { Deck } from "./deck";
import type { Language } from "./language";
import type { CardRepository, DeckRepository, LanguageRepository } from "./repositories";
import { fail, ok, type Result } from "./result";

export interface DeckSummary {
  readonly deck: Deck;
  readonly language: Language;
  readonly cardCount: number;
}

export interface DeckDetail {
  readonly deck: Deck;
  readonly language: Language;
  readonly cards: readonly Card[];
}

export class ContentService {
  constructor(
    private readonly languages: LanguageRepository,
    private readonly decks: DeckRepository,
    private readonly cards: CardRepository,
  ) {}

  listLanguages(): Promise<readonly Language[]> {
    return this.languages.list();
  }

  /** Decks with their language and card count, ordered by language name then deck name. */
  async listDeckSummaries(): Promise<readonly DeckSummary[]> {
    const [languages, decks, counts] = await Promise.all([
      this.languages.list(),
      this.decks.list(),
      this.cards.countByDeck(),
    ]);
    const languageById = new Map(languages.map((language) => [language.id, language]));
    const summaries: DeckSummary[] = [];
    for (const deck of decks) {
      const language = languageById.get(deck.languageId);
      if (!language) continue;
      summaries.push({ deck, language, cardCount: counts.get(deck.id) ?? 0 });
    }
    return summaries.sort(
      (a, b) => a.language.name.localeCompare(b.language.name) || a.deck.name.localeCompare(b.deck.name),
    );
  }

  async getDeck(deckId: string): Promise<Result<DeckDetail>> {
    const deck = await this.decks.getById(deckId);
    if (!deck) return fail("DECK_NOT_FOUND", "Deck could not be found.");
    const language = await this.languages.getById(deck.languageId);
    if (!language) return fail("LANGUAGE_NOT_FOUND", "Language could not be found.");
    return ok({ deck, language, cards: await this.cards.listByDeck(deck.id) });
  }
}
