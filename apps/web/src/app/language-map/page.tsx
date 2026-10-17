import type { Metadata } from "next";
import { EmptyState, LanguageText } from "@ogbifo/ui";
import { getContentService } from "@/server/content";

export const metadata: Metadata = { title: "Language Map" };

export default async function LanguageMapPage() {
  const languages = await getContentService().listLanguages();

  return (
    <>
      <p className="font-ui text-xs uppercase tracking-[0.3em] text-ochre">Language Map</p>
      <h1 className="mt-4 font-serif text-4xl font-semibold tracking-tight sm:text-5xl">Where the languages live.</h1>
      {languages.length === 0 ? (
        <EmptyState title="No languages yet">Languages and their regions will be listed here.</EmptyState>
      ) : (
        <ul className="mt-12 divide-y divide-bone/10 border-y border-bone/10">
          {languages.map((language) => (
            <li key={language.id} className="grid gap-1 py-6 sm:grid-cols-[1fr_auto] sm:gap-8">
              <div>
                <h2 className="font-serif text-2xl font-semibold">
                  <LanguageText lang={language.code} text={language.name} />
                </h2>
                <p className="mt-1 font-ui text-sm text-ash">{language.regions.join(" · ")}</p>
              </div>
              <p className="font-ui text-sm text-ash sm:text-right">
                {language.archiveCount === 0 ? (
                  <span className="text-bone">This dialect is waiting for its first Pioneer.</span>
                ) : (
                  <span>
                    <span className="text-bone">{language.archiveCount}</span> in the Archive
                  </span>
                )}
              </p>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
