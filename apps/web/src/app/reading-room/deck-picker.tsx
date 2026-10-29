"use client";

import Link from "next/link";
import { deckProgress, isDeckLocked, type Deck } from "@ogbifo/domain";
import { LanguageText } from "@ogbifo/ui";
import { useProgress } from "./use-progress";

export interface PickerDeck {
  deck: Deck;
  languageName: string;
  languageCode: string;
  cardIds: string[];
}

export function DeckPicker({ decks }: { decks: PickerDeck[] }) {
  const { progress, ready } = useProgress();
  const byId = new Map(decks.map((entry) => [entry.deck.id, entry]));

  return (
    <ul className="mt-12 divide-y divide-bone/10 border-y border-bone/10">
      {decks.map(({ deck, languageName, languageCode, cardIds }) => {
        const required = deck.unlockedByDeckId ? byId.get(deck.unlockedByDeckId) : undefined;
        const locked = ready && isDeckLocked(deck, required ? required.cardIds : null, progress.sessions);
        const own = deckProgress(cardIds, progress.sessions);
        const requiredProgress = required ? deckProgress(required.cardIds, progress.sessions) : null;
        const empty = cardIds.length === 0;
        const resumeAt = progress.positions[deck.id];

        return (
          <li key={deck.id} className="grid gap-4 py-6 sm:grid-cols-[1fr_auto] sm:items-center sm:gap-8">
            <div>
              <h2 className="font-serif text-2xl font-semibold">{deck.name}</h2>
              <p className="mt-1 font-ui text-sm text-bone">
                <LanguageText lang={languageCode} text={languageName} />
                <span className="text-ash"> · Tier {deck.tier} · {cardIds.length} {cardIds.length === 1 ? "Card" : "Cards"}</span>
              </p>
              <p className="mt-2 max-w-prose font-body text-sm leading-relaxed text-ash">{deck.description}</p>
              {locked && required ? (
                <p className="mt-3 font-ui text-sm text-ochre">
                  Locked. Finish {required.deck.name} to open it
                  {requiredProgress && requiredProgress.total > 0 ? ` (${requiredProgress.finished} of ${requiredProgress.total} Cards finished).` : "."}
                </p>
              ) : null}
              {!locked && ready && !empty && own.finished > 0 ? (
                <p className="mt-3 font-ui text-sm text-ash">{own.finished} of {own.total} Cards finished</p>
              ) : null}
            </div>
            <div>
              {empty ? (
                <p className="font-ui text-sm text-ash">Cards are with our reviewers.</p>
              ) : locked ? (
                <Link
                  href={`/reading-room/${required?.deck.id ?? deck.id}`}
                  className="inline-flex min-h-12 items-center border border-bone/20 px-6 font-ui text-sm hover:border-ochre"
                >
                  Go to {required?.deck.name ?? "the first Deck"}
                </Link>
              ) : (
                <Link
                  href={`/reading-room/${deck.id}`}
                  className="inline-flex min-h-12 items-center bg-ochre px-6 font-ui text-sm font-semibold text-clay hover:brightness-110"
                >
                  {resumeAt !== undefined && resumeAt > 0 ? "Continue" : "Start"}
                </Link>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
