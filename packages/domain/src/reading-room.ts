import type { ReadingMode, ReadingSession } from "./reading-session";

export interface ReadingRoomState {
  readonly cardIds: readonly string[];
  readonly index: number;
  readonly mode: ReadingMode;
  readonly status: "reading" | "ended";
  readonly sessions: readonly ReadingSession[];
}

export type ReadingRoomAction =
  | { readonly type: "next" }
  | { readonly type: "previous" }
  | { readonly type: "setMode"; readonly mode: ReadingMode }
  | { readonly type: "restart" }
  /** Dispatched by the recorder (Sprint 3) with a completed session. */
  | { readonly type: "attemptCompleted"; readonly session: ReadingSession };

const clamp = (index: number, count: number) => (count === 0 ? 0 : Math.min(Math.max(index, 0), count - 1));

export function initialReadingRoom(
  cardIds: readonly string[],
  sessions: readonly ReadingSession[] = [],
  startIndex = 0,
  mode: ReadingMode = "studio",
): ReadingRoomState {
  return { cardIds, index: clamp(startIndex, cardIds.length), mode, status: "reading", sessions };
}

export function readingRoomReducer(state: ReadingRoomState, action: ReadingRoomAction): ReadingRoomState {
  switch (action.type) {
    case "next":
      if (state.status === "ended" || state.cardIds.length === 0) return state;
      if (state.index >= state.cardIds.length - 1) return { ...state, status: "ended" };
      return { ...state, index: state.index + 1 };
    case "previous":
      if (state.status === "ended") return { ...state, status: "reading" };
      return { ...state, index: clamp(state.index - 1, state.cardIds.length) };
    case "setMode":
      return state.mode === action.mode ? state : { ...state, mode: action.mode };
    case "restart":
      return { ...state, index: 0, status: "reading" };
    case "attemptCompleted":
      if (!state.cardIds.includes(action.session.cardId) || action.session.completedAt === undefined) return state;
      return { ...state, sessions: [...state.sessions, action.session] };
  }
}

export const currentCardId = (state: ReadingRoomState): string | null => state.cardIds[state.index] ?? null;
