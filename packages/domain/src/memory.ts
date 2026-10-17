import type { Card } from "./card";
import type { Deck } from "./deck";
import type { Language } from "./language";
import type { CardRepository, DeckRepository, LanguageRepository } from "./repositories";

const byId = <T extends { id: string }>(a: T, b: T) => a.id.localeCompare(b.id);

export class InMemoryLanguageRepository implements LanguageRepository {
  constructor(private readonly items: readonly Language[]) {}
  async list() {
    return [...this.items].sort(byId);
  }
  async getById(id: string) {
    return this.items.find((item) => item.id === id) ?? null;
  }
}

export class InMemoryDeckRepository implements DeckRepository {
  constructor(private readonly items: readonly Deck[]) {}
  async list() {
    return [...this.items].sort(byId);
  }
  async listByLanguage(languageId: string) {
    return this.items.filter((item) => item.languageId === languageId).sort(byId);
  }
  async getById(id: string) {
    return this.items.find((item) => item.id === id) ?? null;
  }
}

export class InMemoryCardRepository implements CardRepository {
  constructor(private readonly items: readonly Card[]) {}
  async getById(id: string) {
    return this.items.find((item) => item.id === id) ?? null;
  }
  async listByDeck(deckId: string) {
    return this.items.filter((item) => item.deckId === deckId).sort(byId);
  }
}
