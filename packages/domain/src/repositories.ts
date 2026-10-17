import type { Card } from "./card";
import type { Deck } from "./deck";
import type { Language } from "./language";

export interface LanguageRepository {
  list(): Promise<readonly Language[]>;
  getById(id: string): Promise<Language | null>;
}

export interface DeckRepository {
  list(): Promise<readonly Deck[]>;
  listByLanguage(languageId: string): Promise<readonly Deck[]>;
  getById(id: string): Promise<Deck | null>;
}

export interface CardRepository {
  getById(id: string): Promise<Card | null>;
  listByDeck(deckId: string): Promise<readonly Card[]>;
  countByDeck(): Promise<ReadonlyMap<string, number>>;
}
