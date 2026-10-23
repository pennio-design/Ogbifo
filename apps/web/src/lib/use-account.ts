"use client";

import { useEffect, useState } from "react";

export interface Account {
  readonly id: string;
  readonly email: string;
  readonly displayName: string;
}

export type AccountState = { status: "loading" } | { status: "anonymous" } | { status: "account"; account: Account };

/**
 * The last signed-in account is remembered on this device so Community still opens
 * offline (a request that fails for lack of a connection must not look like signing
 * out). A 401 clears it. Sign-out clears it too (AccountMenu).
 */
export const ACCOUNT_CACHE_KEY = "ogbifo.account.v1";

function readCache(): Account | null {
  try {
    const raw = window.localStorage.getItem(ACCOUNT_CACHE_KEY);
    const data: unknown = raw ? JSON.parse(raw) : null;
    if (typeof data === "object" && data !== null && "id" in data && typeof data.id === "string" && "displayName" in data && typeof data.displayName === "string") {
      return { id: data.id, email: "email" in data && typeof data.email === "string" ? data.email : "", displayName: data.displayName };
    }
  } catch {
    /* storage blocked or corrupt: treat as no cache */
  }
  return null;
}

const writeCache = (account: Account | null) => {
  try {
    if (account) window.localStorage.setItem(ACCOUNT_CACHE_KEY, JSON.stringify(account));
    else window.localStorage.removeItem(ACCOUNT_CACHE_KEY);
  } catch {
    /* ignore */
  }
};

export function useAccount(): AccountState {
  const [state, setState] = useState<AccountState>({ status: "loading" });
  useEffect(() => {
    let cancelled = false;
    const set = (next: AccountState) => !cancelled && setState(next);
    fetch("/api/auth/me", { cache: "no-store" })
      .then(async (response) => {
        if (response.status === 401) {
          writeCache(null);
          return set({ status: "anonymous" });
        }
        if (!response.ok) throw new Error("unavailable");
        const { user } = (await response.json()) as { user: Account };
        writeCache(user);
        set({ status: "account", account: user });
      })
      .catch(() => {
        const cached = readCache();
        set(cached ? { status: "account", account: cached } : { status: "anonymous" });
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return state;
}
