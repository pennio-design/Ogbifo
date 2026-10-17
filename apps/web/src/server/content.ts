import {
  ContentService,
  InMemoryCardRepository,
  InMemoryDeckRepository,
  InMemoryLanguageRepository,
  seedCards,
  seedDecks,
  seedLanguages,
} from "@ogbifo/domain";

/**
 * Composition root. Pages depend on ContentService only. Swap the in-memory
 * repositories for database-backed ones here when the Postgres adapter lands;
 * no page changes.
 */
let service: ContentService | undefined;

export function getContentService(): ContentService {
  service ??= new ContentService(
    new InMemoryLanguageRepository(seedLanguages),
    new InMemoryDeckRepository(seedDecks),
    new InMemoryCardRepository(seedCards),
  );
  return service;
}
