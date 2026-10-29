import { completeReadingSession, createReadingSession, type ReadingSession } from "./reading-session";

export interface ProgressState {
  readonly sessions: readonly ReadingSession[];
  /** Last Card index per Deck id, so a learner can resume within a visit. */
  readonly positions: Readonly<Record<string, number>>;
}

export const emptyProgress: ProgressState = { sessions: [], positions: {} };

export interface ProgressStore {
  load(): ProgressState;
  save(state: ProgressState): void;
}

export class InMemoryProgressStore implements ProgressStore {
  private state: ProgressState = emptyProgress;
  load() {
    return this.state;
  }
  save(state: ProgressState) {
    this.state = state;
  }
}

/** The subset of the Web Storage API we use, so tests need no DOM. */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const PROGRESS_KEY = "ogbifo.progress.v1";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Parse stored progress defensively. Storage can be empty, corrupt or written
 * by an older build; never throw, and keep only entries that validate.
 */
export function parseProgress(raw: string | null): ProgressState {
  if (raw === null) return emptyProgress;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return emptyProgress;
  }
  if (!isRecord(data)) return emptyProgress;

  const sessions: ReadingSession[] = [];
  if (Array.isArray(data.sessions)) {
    for (const item of data.sessions as unknown[]) {
      if (!isRecord(item)) continue;
      const { id, cardId, mode, startedAt, completedAt, score } = item;
      if (typeof id !== "string" || typeof cardId !== "string" || typeof startedAt !== "string") continue;
      if (mode !== "studio" && mode !== "live") continue;
      const created = createReadingSession({ id, cardId, mode, startedAt });
      if (!created.ok) continue;
      if (typeof completedAt === "string") {
        const done = completeReadingSession(created.value, completedAt, typeof score === "number" ? score : null);
        if (done.ok) sessions.push(done.value);
      } else {
        sessions.push(created.value);
      }
    }
  }

  const positions: Record<string, number> = {};
  if (isRecord(data.positions)) {
    for (const [deckId, index] of Object.entries(data.positions)) {
      if (typeof index === "number" && Number.isInteger(index) && index >= 0) positions[deckId] = index;
    }
  }
  return { sessions, positions };
}

export class StorageProgressStore implements ProgressStore {
  constructor(
    private readonly storage: StorageLike,
    private readonly key: string = PROGRESS_KEY,
  ) {}

  load(): ProgressState {
    try {
      return parseProgress(this.storage.getItem(this.key));
    } catch {
      return emptyProgress;
    }
  }

  save(state: ProgressState): void {
    try {
      this.storage.setItem(this.key, JSON.stringify(state));
    } catch {
      // Storage can be full or blocked (private windows). Progress then lasts for the page only.
    }
  }
}
