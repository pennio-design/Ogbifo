import type { Metadata } from "next";
import { EmptyState } from "@ogbifo/ui";
import { getContentService } from "@/server/content";
import { DeckPicker } from "./deck-picker";

export const metadata: Metadata = { title: "Reading Room" };

export default async function ReadingRoomPage() {
  const summaries = await getContentService().listDeckSummaries();

  return (
    <>
      <p className="font-ui text-xs uppercase tracking-[0.3em] text-ochre">Reading Room</p>
      <h1 className="mt-4 font-serif text-4xl font-semibold tracking-tight sm:text-5xl">Choose a Deck.</h1>
      {summaries.length === 0 ? (
        <EmptyState title="No Decks yet">Decks are curated collections of Cards. When the first one opens, it will be here.</EmptyState>
      ) : (
        <DeckPicker
          decks={summaries.map(({ deck, language, cardIds }) => ({
            deck,
            languageName: language.name,
            languageCode: language.code,
            cardIds: [...cardIds],
          }))}
        />
      )}
    </>
  );
}
