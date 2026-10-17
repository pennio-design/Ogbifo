import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@ogbifo/ui";

export const metadata: Metadata = { title: "Reading Room" };

export default function ReadingRoomPage() {
  return (
    <>
      <p className="font-ui text-xs uppercase tracking-[0.3em] text-ochre">Reading Room</p>
      <h1 className="mt-4 font-serif text-4xl font-semibold tracking-tight sm:text-5xl">Read it in its own words.</h1>
      <EmptyState
        title="The Reading Room is being prepared"
        action={
          <Link href="/decks" className="bg-ochre px-6 py-3 font-ui text-sm font-semibold text-clay hover:brightness-110">
            See the Decks
          </Link>
        }
      >
        Pick a Deck and a Card will appear in its own language first, with its meaning beneath. Until
        it opens, you can look through the Decks that are waiting.
      </EmptyState>
    </>
  );
}
