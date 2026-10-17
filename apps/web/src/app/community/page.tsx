import type { Metadata } from "next";
import { EmptyState } from "@ogbifo/ui";

export const metadata: Metadata = { title: "Community" };

export default function CommunityPage() {
  return (
    <>
      <p className="font-ui text-xs uppercase tracking-[0.3em] text-ochre">Community</p>
      <h1 className="mt-4 font-serif text-4xl font-semibold tracking-tight sm:text-5xl">Help keep it.</h1>
      <EmptyState title="The Archive is waiting for its first expression">
        Soon you will be able to add a phrase, a proverb or a greeting to the Archive, with its dialect
        and context, and see the community confirm it. Contributions open once consent and licensing
        are in place.
      </EmptyState>
    </>
  );
}
