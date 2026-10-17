import type { Deck } from "./deck";
import type { ReadingSession } from "./reading-session";

/**
 * A Card is finished once it has a completed Live attempt. Studio earns no
 * progress (D-024). Proposed rule, pending OPEN_CONFLICTS #14.
 */
export function finishedCardIds(sessions: readonly ReadingSession[]): ReadonlySet<string> {
  const finished = new Set<string>();
  for (const session of sessions) {
    if (session.mode === "live" && session.completedAt !== undefined) finished.add(session.cardId);
  }
  return finished;
}

export interface DeckProgress {
  readonly total: number;
  readonly finished: number;
  readonly isFinished: boolean;
}

export function deckProgress(cardIds: readonly string[], sessions: readonly ReadingSession[]): DeckProgress {
  const done = finishedCardIds(sessions);
  const finished = cardIds.filter((id) => done.has(id)).length;
  return { total: cardIds.length, finished, isFinished: cardIds.length > 0 && finished === cardIds.length };
}

/**
 * D-029. A Deck is open unless it is flagged locked. A locked Deck opens when
 * the Deck named in `unlockedByDeckId` is finished. `requiredCardIds` are that
 * Deck's visible Card ids, or null when it is unknown (stays locked).
 */
export function isDeckLocked(
  deck: Deck,
  requiredCardIds: readonly string[] | null,
  sessions: readonly ReadingSession[],
): boolean {
  if (!deck.isLocked) return false;
  if (deck.unlockedByDeckId === undefined || requiredCardIds === null) return true;
  return !deckProgress(requiredCardIds, sessions).isFinished;
}
