import type { Metadata } from "next";
import { Contribute } from "./contribute";

export const metadata: Metadata = { title: "Community" };

export default function CommunityPage() {
  return (
    <>
      <p className="font-ui text-xs uppercase tracking-[0.3em] text-ochre">Community</p>
      <h1 className="mt-4 font-serif text-4xl font-semibold tracking-tight sm:text-5xl">Help keep it.</h1>
      <p className="mt-6 max-w-prose font-body text-base leading-relaxed text-ash">
        Add a phrase, a proverb or a greeting to the Archive. It is saved on your device first, so you can add
        it without a connection. Confirmation by other speakers comes once sync opens.
      </p>
      <Contribute />
    </>
  );
}
