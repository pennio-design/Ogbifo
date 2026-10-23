"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import {
  emptyProgress,
  parseProgress,
  PROGRESS_KEY,
  StorageProgressStore,
  type ProgressState,
} from "@ogbifo/domain";

/**
 * D-022: anonymous progress lasts for the visit (sessionStorage). An account
 * store replaces this when accounts exist; callers do not change.
 */
const EVENT = "ogbifo:progress";

function storage(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function subscribe(onChange: () => void) {
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

const getRaw = () => storage()?.getItem(PROGRESS_KEY) ?? "";
const getServerRaw = () => null;

export function useProgress() {
  const raw = useSyncExternalStore(subscribe, getRaw, getServerRaw);
  const ready = raw !== null;
  const progress = useMemo<ProgressState>(() => (raw ? parseProgress(raw) : emptyProgress), [raw]);

  const update = useCallback((change: (current: ProgressState) => ProgressState) => {
    const store = storage();
    if (!store) return;
    const progressStore = new StorageProgressStore(store);
    progressStore.save(change(progressStore.load()));
    window.dispatchEvent(new Event(EVENT));
  }, []);

  return { progress, ready, update };
}
