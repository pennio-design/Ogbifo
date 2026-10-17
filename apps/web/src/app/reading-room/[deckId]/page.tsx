import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getContentService } from "@/server/content";
import { ReadingRoom } from "../reading-room";

export async function generateMetadata({ params }: { params: Promise<{ deckId: string }> }): Promise<Metadata> {
  const { deckId } = await params;
  const result = await getContentService().getDeck(deckId);
  return { title: result.ok ? result.value.deck.name : "Reading Room" };
}

export default async function DeckReadingPage({ params }: { params: Promise<{ deckId: string }> }) {
  const { deckId } = await params;
  const result = await getContentService().getDeck(deckId);
  if (!result.ok) notFound();
  const { deck, language, cards, requiredDeck, unlocks } = result.value;

  return (
    <ReadingRoom
      deck={deck}
      language={{ name: language.name, code: language.code }}
      cards={[...cards]}
      requiredDeck={requiredDeck ? { id: requiredDeck.id, name: requiredDeck.name, cardIds: [...requiredDeck.cardIds] } : null}
      unlocks={[...unlocks]}
    />
  );
}
