import { fail, ok, type Result } from "./result";
import { isBlank } from "./text";

/** D-024. Studio is unscored practice and earns no progress. Live is one scored attempt per Card. */
export type ReadingMode = "studio" | "live";

export const TRANSLATION_LANGUAGE = "en";

export interface ReadingSession {
  readonly id: string;
  readonly userId?: string;
  readonly cardId: string;
  readonly mode: ReadingMode;
  readonly targetLanguage: string;
  readonly startedAt: string;
  readonly completedAt?: string;
  /** Null until scoring exists (Sprint 3) or when the attempt was unscored. Scale defined by OPEN_CONFLICTS #7. */
  readonly score: number | null;
}

export interface NewReadingSession {
  readonly id: string;
  readonly cardId: string;
  readonly mode: ReadingMode;
  readonly startedAt: string;
  readonly userId?: string;
}

const isMode = (value: string): value is ReadingMode => value === "studio" || value === "live";

export function createReadingSession(input: NewReadingSession): Result<ReadingSession> {
  if (isBlank(input.id)) return fail("SESSION_INVALID", "Session needs an id.", "id");
  if (isBlank(input.cardId)) return fail("SESSION_INVALID", "Session needs a Card.", "cardId");
  if (!isMode(input.mode)) return fail("SESSION_INVALID", "Mode must be studio or live.", "mode");
  if (Number.isNaN(Date.parse(input.startedAt))) {
    return fail("SESSION_INVALID", "Start time must be an ISO date.", "startedAt");
  }
  const base = {
    id: input.id,
    cardId: input.cardId,
    mode: input.mode,
    targetLanguage: TRANSLATION_LANGUAGE,
    startedAt: input.startedAt,
    score: null,
  } as const;
  return ok(input.userId === undefined ? base : { ...base, userId: input.userId });
}

export function completeReadingSession(
  session: ReadingSession,
  completedAt: string,
  score: number | null,
): Result<ReadingSession> {
  if (session.completedAt !== undefined) {
    return fail("SESSION_ALREADY_COMPLETE", "This attempt is already complete.");
  }
  const end = Date.parse(completedAt);
  if (Number.isNaN(end) || end < Date.parse(session.startedAt)) {
    return fail("SESSION_INVALID", "Completion time must not be before the start time.", "completedAt");
  }
  if (score !== null && !Number.isFinite(score)) {
    return fail("SESSION_INVALID", "Score must be a finite number or null.", "score");
  }
  return ok({ ...session, completedAt, score });
}
