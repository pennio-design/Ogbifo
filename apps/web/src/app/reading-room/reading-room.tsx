"use client";

import Link from "next/link";
import { useEffect, useReducer } from "react";
import {
  currentCardId,
  deckProgress,
  initialReadingRoom,
  isDeckLocked,
  readingRoomReducer,
  type Card,
  type Deck,
  type ReadingMode,
} from "@ogbifo/domain";
import { EmptyState, LanguageText } from "@ogbifo/ui";
import { categoryLabel } from "@/lib/labels";
import { useProgress } from "./use-progress";

export interface ReadingRoomProps {
  deck: Deck;
  language: { name: string; code: string };
  cards: Card[];
  requiredDeck: { id: string; name: string; cardIds: string[] } | null;
  unlocks: { id: string; name: string }[];
}

const buttonBase = "inline-flex min-h-12 items-center justify-center px-6 font-ui text-sm disabled:opacity-40";
const primary = `${buttonBase} bg-ochre font-semibold text-clay hover:brightness-110`;
const secondary = `${buttonBase} border border-bone/20 text-bone hover:border-ochre`;

export function ReadingRoom(props: ReadingRoomProps) {
  const { progress, ready } = useProgress();

  if (!ready) {
    return (
      <div role="status" aria-live="polite" className="py-24">
        <p className="font-serif text-2xl italic text-ash">Opening the Reading Room…</p>
      </div>
    );
  }

  if (props.cards.length === 0) {
    return (
      <EmptyState
        title={`${props.deck.name} is with our reviewers`}
        action={<Link href="/reading-room" className={secondary}>Choose another Deck</Link>}
      >
        Every Card is checked by native speakers before it reaches you. This Deck opens when its Cards are ready.
      </EmptyState>
    );
  }

  if (isDeckLocked(props.deck, props.requiredDeck ? props.requiredDeck.cardIds : null, progress.sessions)) {
    const required = props.requiredDeck;
    const done = required ? deckProgress(required.cardIds, progress.sessions) : null;
    return (
      <EmptyState
        title={`${props.deck.name} is locked`}
        action={
          <Link href={required ? `/reading-room/${required.id}` : "/reading-room"} className={primary}>
            {required ? `Go to ${required.name}` : "Choose a Deck"}
          </Link>
        }
      >
        {required && done
          ? `Finish ${required.name} to open it.${done.total > 0 ? ` ${done.finished} of ${done.total} Cards finished.` : ""}`
          : "This Deck is not open yet."}
      </EmptyState>
    );
  }

  return <Player key={props.deck.id} {...props} />;
}

function Player({ deck, language, cards, unlocks }: ReadingRoomProps) {
  const { progress, update } = useProgress();
  const cardIds = cards.map((card) => card.id);
  const [state, dispatch] = useReducer(readingRoomReducer, undefined, () =>
    initialReadingRoom(cardIds, progress.sessions, progress.positions[deck.id] ?? 0),
  );

  // Keep the position for this visit. A finished Deck starts again from the first Card.
  useEffect(() => {
    update((current) => ({
      sessions: [...current.sessions, ...state.sessions.filter((s) => !current.sessions.some((c) => c.id === s.id))],
      positions: { ...current.positions, [deck.id]: state.status === "ended" ? 0 : state.index },
    }));
  }, [deck.id, state.index, state.status, state.sessions, update]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      const target = event.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (event.key === "ArrowRight") dispatch({ type: "next" });
      if (event.key === "ArrowLeft") dispatch({ type: "previous" });
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const total = cards.length;
  const own = deckProgress(cardIds, progress.sessions);

  if (state.status === "ended") {
    return (
      <section aria-labelledby="ended-title" className="py-8">
        <p className="font-ui text-xs uppercase tracking-[0.3em] text-ochre">Deck: {deck.name}</p>
        <h1 id="ended-title" className="mt-4 font-serif text-4xl font-semibold tracking-tight sm:text-5xl">
          You reached the end of {deck.name}.
        </h1>
        <p className="mt-6 max-w-prose font-body text-lg text-ash">
          {own.finished} of {own.total} Cards finished in Live.
        </p>
        {unlocks.map((next) => (
          <p key={next.id} className="mt-3 max-w-prose font-body text-ash">
            {own.isFinished ? (
              <>
                <span className="text-bone">{next.name} is open.</span>{" "}
                <Link href={`/reading-room/${next.id}`} className="text-ochre underline underline-offset-4">
                  Start {next.name}
                </Link>
              </>
            ) : (
              `Finish every Card in Live to open ${next.name}.`
            )}
          </p>
        ))}
        <div className="mt-10 flex flex-wrap gap-4">
          <button type="button" className={primary} onClick={() => dispatch({ type: "restart" })}>
            Start over
          </button>
          <button type="button" className={secondary} onClick={() => dispatch({ type: "previous" })}>
            Back to the last Card
          </button>
          <Link href="/reading-room" className={secondary}>
            Choose another Deck
          </Link>
        </div>
      </section>
    );
  }

  const card = cards.find((c) => c.id === currentCardId(state)) ?? cards[0]!;
  const position = state.index + 1;
  const isLast = state.index === total - 1;
  const unreviewed = cards.some((c) => c.reviewStatus !== "reviewed");
  const setMode = (mode: ReadingMode) => dispatch({ type: "setMode", mode });

  return (
    <div>
      <header className="border-b border-bone/10 pb-6">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <h1 className="font-ui text-sm text-bone">
            <span className="text-ash">Deck: </span>
            {deck.name}
            <span className="text-ash"> · <span lang={language.code}>{language.name}</span></span>
          </h1>
          <dl className="flex gap-6 font-ui text-sm">
            <div className="flex gap-2">
              <dt className="text-ash">Translation</dt>
              <dd className="text-bone">English</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-ash">Score</dt>
              <dd className="text-bone">
                <span aria-hidden="true">—</span>
                <span className="sr-only">No score yet</span>
              </dd>
            </div>
          </dl>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-48 flex-1">
            <p className="font-ui text-sm text-bone">
              Card {position} of {total}
            </p>
            <div
              role="progressbar"
              aria-label="Position in Deck"
              aria-valuemin={1}
              aria-valuemax={total}
              aria-valuenow={position}
              aria-valuetext={`Card ${position} of ${total}`}
              className="mt-2 h-px w-full bg-bone/15"
            >
              <div className="h-px bg-ochre" style={{ width: `${(position / total) * 100}%` }} />
            </div>
          </div>
          <div role="group" aria-label="Mode" className="flex border border-bone/20 font-ui text-sm">
            {(["studio", "live"] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                aria-pressed={state.mode === mode}
                onClick={() => setMode(mode)}
                className={`min-h-12 px-5 ${state.mode === mode ? "bg-ochre font-semibold text-clay" : "text-bone hover:text-ochre"}`}
              >
                {mode === "studio" ? "Studio" : "Live"}
              </button>
            ))}
          </div>
        </div>
        <p className="mt-3 max-w-prose font-body text-sm text-ash">
          {state.mode === "studio"
            ? "Studio is unscored practice. It earns no progress."
            : "Live is one scored attempt per Card and counts toward progress."}
        </p>
        <p className="mt-1 font-body text-sm text-ash">
          Progress lasts for this visit. Accounts, which keep it between visits, are coming.
        </p>
      </header>

      <p className="sr-only" aria-live="polite">
        Card {position} of {total}
      </p>

      {unreviewed ? (
        <p role="note" className="mt-6 border border-ochre/40 px-4 py-3 font-ui text-sm text-ochre">
          Developer seed content. Not yet reviewed by native speakers.
        </p>
      ) : null}

      <article aria-label={`Card ${position} of ${total}`} className="mt-8 border border-bone/10 bg-card p-6 sm:p-10">
        <p className="font-ui text-xs uppercase tracking-[0.2em] text-ash">
          <span lang={language.code}>{language.name}</span> · Tier {card.difficulty} · {categoryLabel(card.category)}
        </p>
        <LanguageText
          as="p"
          lang={language.code}
          text={card.sourceText}
          className="mt-6 whitespace-pre-line text-3xl leading-snug sm:text-4xl"
        />
        <hr className="my-8 border-bone/10" />
        <p className="whitespace-pre-line font-body text-lg leading-relaxed text-ash">{card.translation}</p>
        {card.context ? (
          <p className="mt-6 max-w-prose font-body text-sm leading-relaxed text-ash">
            <span className="font-ui text-xs uppercase tracking-wider text-bone">About this Card </span>
            {card.context}
          </p>
        ) : null}
        {card.reviewStatus === "reviewed" ? (
          <p className="mt-6 font-ui text-xs text-ash">Reviewed by {card.reviewers.join(", ")}</p>
        ) : null}
      </article>

      <section aria-label="Say it aloud" className="mt-6 border border-bone/10 p-6">
        <h2 className="font-ui text-xs uppercase tracking-[0.2em] text-ash">Say it aloud</h2>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <button type="button" disabled aria-disabled="true" className={secondary}>
            Record
          </button>
          <p className="max-w-prose font-body text-sm text-ash">
            {state.mode === "studio"
              ? "Hearing a native reference and recording yourself open in the next update."
              : "Scored attempts open with recording in the next update. Until then, Live cannot finish a Card."}
          </p>
        </div>
      </section>

      <nav aria-label="Cards" className="mt-8 flex items-center justify-between gap-4">
        <button type="button" className={secondary} disabled={state.index === 0} onClick={() => dispatch({ type: "previous" })}>
          Previous
        </button>
        <button type="button" className={primary} onClick={() => dispatch({ type: "next" })}>
          {isLast ? "Finish Deck" : "Next Card"}
        </button>
      </nav>
    </div>
  );
}
