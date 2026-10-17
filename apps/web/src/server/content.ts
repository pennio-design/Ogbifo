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
 * D-012: users see only reviewed Cards. The developer seed is unreviewed, so
 * it shows only in development or when OGBIFO_ALLOW_UNREVIEWED=1 (see
 * .env.example). Static pages read this at build time.
 */
export const allowUnreviewed =
  process.env.NODE_ENV === "development" || process.env.OGBIFO_ALLOW_UNREVIEWED === "1";

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
    { allowUnreviewed },
  );
  return service;
}
