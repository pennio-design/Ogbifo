import { CONSENT_IS_DRAFT } from "./consent";
import type { Contribution } from "./contribution";
import { fail, ok, type Result } from "./result";

/** Sync state is separate from verification state (OFFLINE_FIRST.md). */
export type SyncState = "queued" | "syncing" | "synced" | "failed" | "retrying";
export type OutboxOperation = "contribute" | "withdraw";

export interface OutboxEntry {
  /** `${clientId}:${operation}`: the idempotency key the server will see. */
  readonly id: string;
  readonly clientId: string;
  readonly operation: OutboxOperation;
  readonly status: SyncState;
  readonly retryCount: number;
  readonly createdAt: string;
  readonly lastAttemptAt: string | null;
  readonly nextAttemptAt: string | null;
}

/** 5s, 15s, 30s, 60s, 5m, 15m; then stop and wait for a manual retry. */
export const BACKOFF_MS: readonly number[] = [5_000, 15_000, 30_000, 60_000, 300_000, 900_000];
export const MAX_RETRIES = BACKOFF_MS.length;

export const outboxId = (clientId: string, operation: OutboxOperation) => `${clientId}:${operation}`;

export function enqueue(clientId: string, operation: OutboxOperation, createdAt: string): OutboxEntry {
  return {
    id: outboxId(clientId, operation),
    clientId,
    operation,
    status: "queued",
    retryCount: 0,
    createdAt,
    lastAttemptAt: null,
    nextAttemptAt: null,
  };
}

export function isDue(entry: OutboxEntry, now: Date): boolean {
  if (entry.status === "queued") return true;
  if (entry.status !== "retrying") return false;
  return entry.nextAttemptAt === null || Date.parse(entry.nextAttemptAt) <= now.getTime();
}

export const beginAttempt = (entry: OutboxEntry, now: Date): OutboxEntry => ({
  ...entry,
  status: "syncing",
  lastAttemptAt: now.toISOString(),
  nextAttemptAt: null,
});

export const recordSuccess = (entry: OutboxEntry): OutboxEntry => ({ ...entry, status: "synced", nextAttemptAt: null });

export function recordFailure(entry: OutboxEntry, now: Date): OutboxEntry {
  const delay = BACKOFF_MS[entry.retryCount];
  if (delay === undefined) return { ...entry, status: "failed", nextAttemptAt: null };
  return {
    ...entry,
    status: "retrying",
    retryCount: entry.retryCount + 1,
    nextAttemptAt: new Date(now.getTime() + delay).toISOString(),
  };
}

/** Manual retry after the cap. Anything else is left as it is. */
export const manualRetry = (entry: OutboxEntry): OutboxEntry =>
  entry.status === "failed" ? { ...entry, status: "queued", retryCount: 0, nextAttemptAt: null } : entry;

/**
 * The seam to the server. Until counsel has reviewed the consent wording no
 * transport may be available, so nothing a contributor writes leaves their
 * device (PRD 3.8, OPEN_CONFLICTS #5).
 */
export interface SyncTransport {
  isAvailable(): boolean;
  send(entry: OutboxEntry, contribution: Contribution): Promise<Result<void>>;
}

/** Used until consent wording is approved. Reports itself unavailable. */
export const disabledTransport: SyncTransport = {
  isAvailable: () => false,
  send: async () => fail("SYNC_DISABLED", "Sync is not open yet."),
};

/** Guard for whoever wires a real transport: refuse while the consent wording is a draft. */
export function guardTransport(transport: SyncTransport): SyncTransport {
  return CONSENT_IS_DRAFT ? disabledTransport : transport;
}

export interface LocalArchiveStore {
  listContributions(): Promise<readonly Contribution[]>;
  listOutbox(): Promise<readonly OutboxEntry[]>;
  /** One atomic write, so a contribution never exists without its outbox entry. */
  commit(change: { contributions?: readonly Contribution[]; outbox?: readonly OutboxEntry[] }): Promise<void>;
}

export class InMemoryArchiveStore implements LocalArchiveStore {
  private readonly contributions = new Map<string, Contribution>();
  private readonly outbox = new Map<string, OutboxEntry>();
  async listContributions() {
    return [...this.contributions.values()];
  }
  async listOutbox() {
    return [...this.outbox.values()];
  }
  async commit(change: { contributions?: readonly Contribution[]; outbox?: readonly OutboxEntry[] }) {
    for (const c of change.contributions ?? []) this.contributions.set(c.clientId, c);
    for (const e of change.outbox ?? []) this.outbox.set(e.id, e);
  }
}

export interface SyncReport {
  readonly attempted: number;
  readonly synced: number;
  readonly failed: number;
}

/** Send every due entry once. Safe to call repeatedly; does nothing while the transport is unavailable. */
export async function runSync(store: LocalArchiveStore, transport: SyncTransport, now: Date): Promise<Result<SyncReport>> {
  if (!transport.isAvailable()) return ok({ attempted: 0, synced: 0, failed: 0 });
  const contributions = new Map((await store.listContributions()).map((c) => [c.clientId, c]));
  let attempted = 0;
  let synced = 0;
  let failed = 0;
  for (const entry of await store.listOutbox()) {
    const contribution = contributions.get(entry.clientId);
    if (!isDue(entry, now) || contribution === undefined) continue;
    attempted += 1;
    await store.commit({ outbox: [beginAttempt(entry, now)] });
    let result: Result<void>;
    try {
      result = await transport.send(entry, contribution);
    } catch {
      result = fail("NETWORK", "Could not reach the archive.");
    }
    if (result.ok) {
      synced += 1;
      await store.commit({ outbox: [recordSuccess(entry)] });
    } else {
      failed += 1;
      await store.commit({ outbox: [recordFailure({ ...entry, lastAttemptAt: now.toISOString() }, now)] });
    }
  }
  return ok({ attempted, synced, failed });
}
