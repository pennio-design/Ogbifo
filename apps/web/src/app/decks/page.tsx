import type { Metadata } from "next";
import { EmptyState, LanguageText } from "@ogbifo/ui";
import { getContentService } from "@/server/content";

export const metadata: Metadata = { title: "Decks" };

export default async function DecksPage() {
  const summaries = await getContentService().listDeckSummaries();

  return (
    <>
      <p className="font-ui text-xs uppercase tracking-[0.3em] text-ochre">Decks</p>
      <h1 className="mt-4 font-serif text-4xl font-semibold tracking-tight sm:text-5xl">
        Collections of language to read.
      </h1>

      {summaries.length === 0 ? (
        <EmptyState title="No Decks yet">
          Decks are curated collections of Cards. When the first one is added, it will appear here.
        </EmptyState>
      ) : (
        <ul className="mt-12 divide-y divide-bone/10 border-y border-bone/10">
          {summaries.map(({ deck, language, cardCount }) => (
            <li key={deck.id} className="grid gap-2 py-6 sm:grid-cols-[1fr_auto] sm:gap-8">
              <div>
                <h2 className="font-serif text-2xl font-semibold">{deck.name}</h2>
                <p className="mt-1 font-ui text-sm text-bone">
                  <LanguageText lang={language.code} text={language.name} />
                  <span className="text-ash"> · {deck.region}</span>
                </p>
                <p className="mt-2 max-w-prose font-body text-sm leading-relaxed text-ash">{deck.description}</p>
              </div>
              <dl className="flex gap-6 font-ui text-sm text-ash sm:text-right">
                <div>
                  <dt className="text-xs uppercase tracking-wider">Tier</dt>
                  <dd className="text-bone">{deck.tier}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wider">Cards</dt>
                  <dd className="text-bone">{cardCount}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wider">Reward</dt>
                  <dd className="text-bone">×{deck.tokenMultiplier}</dd>
                </div>
                {deck.isLocked ? (
                  <div>
                    <dt className="text-xs uppercase tracking-wider">Status</dt>
                    <dd className="text-ochre">Locked</dd>
                  </div>
                ) : null}
              </dl>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
