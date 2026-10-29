import type { Metadata } from "next";
import { EmptyState } from "@ogbifo/ui";

export const metadata: Metadata = { title: "Profile" };

export default function ProfilePage() {
  return (
    <>
      <p className="font-ui text-xs uppercase tracking-[0.3em] text-ochre">Profile</p>
      <h1 className="mt-4 font-serif text-4xl font-semibold tracking-tight sm:text-5xl">Your practice.</h1>
      <EmptyState title="Nothing here yet">
        Your progress, languages and contributions will gather here once you have read your first Card.
      </EmptyState>
    </>
  );
}
