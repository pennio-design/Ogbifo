import type { Metadata } from "next";
import { notFound } from "next/navigation";
import type { Card } from "@ogbifo/domain";
import { getContentService } from "@/server/content";
import { ReadingRoom, type ClientCard } from "../reading-room";

function toClientCard(card: Card): ClientCard {
  const provenance = card.referenceProvenance;
  return {
    id: card.id,
    sourceText: card.sourceText,
    translation: card.translation,
    context: card.context,
    category: card.category,
    difficulty: card.difficulty,
    reviewStatus: card.reviewStatus,
    reviewers: [...card.reviewers],
    reference:
      card.referenceAudioUrl && provenance
        ? { audioUrl: card.referenceAudioUrl, licence: provenance.licence, attribution: provenance.attribution ?? null, source: provenance.source }
        : null,
  };
}

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
      cards={cards.map(toClientCard)}
      requiredDeck={requiredDeck ? { id: requiredDeck.id, name: requiredDeck.name, cardIds: [...requiredDeck.cardIds] } : null}
      unlocks={[...unlocks]}
    />
  );
}
