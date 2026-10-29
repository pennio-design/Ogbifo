import { describe, expect, it } from "vitest";
import { deckProgress, finishedCardIds, isDeckLocked } from "../src/progress";
import { completeReadingSession, createReadingSession, type ReadingMode, type ReadingSession } from "../src/reading-session";
import type { Deck } from "../src/deck";

function session(cardId: string, mode: ReadingMode, completed: boolean): ReadingSession {
  const s = createReadingSession({ id: `${cardId}-${mode}-${completed}`, cardId, mode, startedAt: "2026-10-18T10:00:00.000Z" });
  if (!s.ok) throw new Error("fixture");
  if (!completed) return s.value;
  const d = completeReadingSession(s.value, "2026-10-18T10:01:00.000Z", null);
  if (!d.ok) throw new Error("fixture");
  return d.value;
}

const base: Deck = { id: "d2", name: "Proverb House", languageId: "yo", description: "", tier: 2, region: "r", tokenMultiplier: 1, isLocked: true, unlockedByDeckId: "d1" };

describe("progress (D-024, D-029; rule pending #14)", () => {
  it("counts only completed Live attempts", () => {
    const ids = finishedCardIds([session("a", "live", true), session("b", "studio", true), session("c", "live", false)]);
    expect([...ids]).toEqual(["a"]);
  });
  it("reports progress and finishing", () => {
    expect(deckProgress(["a", "b"], [session("a", "live", true)])).toEqual({ total: 2, finished: 1, isFinished: false });
    expect(deckProgress(["a", "b"], [session("a", "live", true), session("b", "live", true)]).isFinished).toBe(true);
  });
  it("never treats an empty Deck as finished", () => {
    expect(deckProgress([], []).isFinished).toBe(false);
  });
  it("keeps a locked Deck locked until the required Deck is finished", () => {
    expect(isDeckLocked(base, ["a", "b"], [session("a", "live", true)])).toBe(true);
    expect(isDeckLocked(base, ["a", "b"], [session("a", "live", true), session("b", "live", true)])).toBe(false);
  });
  it("studio practice never unlocks a Deck", () => {
    expect(isDeckLocked(base, ["a"], [session("a", "studio", true)])).toBe(true);
  });
  it("stays locked when the required Deck is unknown, and open when not flagged locked", () => {
    expect(isDeckLocked(base, null, [])).toBe(true);
    expect(isDeckLocked({ ...base, unlockedByDeckId: undefined } as unknown as Deck, ["a"], [])).toBe(true);
    expect(isDeckLocked({ ...base, isLocked: false }, ["a"], [])).toBe(false);
  });
  it("a locked Deck whose required Deck has no visible Cards stays locked", () => {
    expect(isDeckLocked(base, [], [])).toBe(true);
  });
});
