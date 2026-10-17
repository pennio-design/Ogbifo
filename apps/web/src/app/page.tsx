import Link from "next/link";
import { LanguageText } from "@ogbifo/ui";
import { getContentService } from "@/server/content";
import { categoryLabel } from "@/lib/labels";

export default async function HomePage() {
  const result = await getContentService().getDeck("proverb-house-yo");
  const preview = result.ok ? { ...result.value, card: result.value.cards[0] } : null;

  return (
    <div className="grid gap-16 lg:grid-cols-2 lg:items-center">
      <section>
        <p className="font-ui text-xs uppercase tracking-[0.3em] text-ochre">Yorùbá</p>
        <h1 className="mt-4 font-serif text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
          Enter the language.
        </h1>
        <p className="mt-6 max-w-prose font-body text-lg leading-relaxed text-ash">
          Read it in its own words, hear what it means, and help keep it. Ogbifọ is a place to
          encounter, practise and preserve the languages of Nigeria.
        </p>
        <div className="mt-10 flex flex-wrap gap-4">
          <Link
            href="/reading-room"
            className="bg-ochre px-6 py-3 font-ui text-sm font-semibold text-clay hover:brightness-110"
          >
            Open the Reading Room
          </Link>
          <Link
            href="/decks"
            className="border border-bone/20 px-6 py-3 font-ui text-sm text-bone hover:border-ochre"
          >
            Browse Decks
          </Link>
        </div>
      </section>

      {preview?.card ? (
        <section aria-label="Sample Card" className="border border-bone/10 bg-card p-8 sm:p-10">
          <p className="font-ui text-xs uppercase tracking-[0.2em] text-ash">
            {preview.language.name} · Tier {preview.card.difficulty} · {categoryLabel(preview.card.category)}
          </p>
          <LanguageText as="p" lang={preview.language.code} text={preview.card.sourceText} className="mt-6 whitespace-pre-line text-2xl leading-snug sm:text-3xl" />
          <hr className="my-8 border-bone/10" />
          <p className="whitespace-pre-line font-body text-base leading-relaxed text-ash">
            {preview.card.translation}
          </p>
        </section>
      ) : null}
    </div>
  );
}
