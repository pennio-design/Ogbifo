import type { Contribution, LocalArchiveStore, OutboxEntry } from "@ogbifo/domain";

const DB_NAME = "ogbifo-archive";
const DB_VERSION = 1;
const CONTRIBUTIONS = "contributions";
const OUTBOX = "outbox";

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") return reject(new Error("IndexedDB is not available"));
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(CONTRIBUTIONS)) db.createObjectStore(CONTRIBUTIONS, { keyPath: "clientId" });
      if (!db.objectStoreNames.contains(OUTBOX)) db.createObjectStore(OUTBOX, { keyPath: "id" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open the local archive"));
  });
}

const done = <T,>(request: IDBRequest<T>): Promise<T> =>
  new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

/** Browser adapter for the local-first archive (OFFLINE_FIRST.md). Text is stored as submitted. */
export class IndexedDbArchiveStore implements LocalArchiveStore {
  private db: Promise<IDBDatabase> | null = null;
  private connection() {
    this.db ??= open();
    return this.db;
  }

  async listContributions(): Promise<readonly Contribution[]> {
    const db = await this.connection();
    return done(db.transaction(CONTRIBUTIONS).objectStore(CONTRIBUTIONS).getAll() as IDBRequest<Contribution[]>);
  }

  async listOutbox(): Promise<readonly OutboxEntry[]> {
    const db = await this.connection();
    return done(db.transaction(OUTBOX).objectStore(OUTBOX).getAll() as IDBRequest<OutboxEntry[]>);
  }

  async commit(change: { contributions?: readonly Contribution[]; outbox?: readonly OutboxEntry[] }): Promise<void> {
    const db = await this.connection();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction([CONTRIBUTIONS, OUTBOX], "readwrite");
      for (const c of change.contributions ?? []) tx.objectStore(CONTRIBUTIONS).put(c);
      for (const e of change.outbox ?? []) tx.objectStore(OUTBOX).put(e);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("Could not save"));
      tx.onabort = () => reject(tx.error ?? new Error("Could not save"));
    });
  }
}
