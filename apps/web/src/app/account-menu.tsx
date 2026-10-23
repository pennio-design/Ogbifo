"use client";

import Link from "next/link";
import { ACCOUNT_CACHE_KEY, useAccount } from "@/lib/use-account";

export function AccountMenu() {
  const state = useAccount();
  if (state.status === "loading") return <span className="min-h-12 w-20" aria-hidden />;
  if (state.status === "anonymous") {
    return (
      <Link href="/sign-in" className="inline-flex min-h-12 items-center font-ui text-sm text-bone hover:text-ochre md:min-h-0">
        Sign in
      </Link>
    );
  }
  return (
    <form
      method="post"
      action="/api/auth/signout"
      onSubmit={() => {
        try {
          window.localStorage.removeItem(ACCOUNT_CACHE_KEY);
        } catch {
          /* ignore */
        }
      }}
      className="flex items-center gap-3"
    >
      <span className="font-ui text-sm text-ash">{state.account.displayName}</span>
      <button type="submit" className="inline-flex min-h-12 items-center font-ui text-sm text-bone hover:text-ochre md:min-h-0">
        Sign out
      </button>
    </form>
  );
}
