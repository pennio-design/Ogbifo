import { describe, expect, it } from "vitest";
import { currentCardId, initialReadingRoom, readingRoomReducer as reduce } from "../src/reading-room";
import { completeReadingSession, createReadingSession } from "../src/reading-session";

const ids = ["a", "b", "c"];
const live = (cardId: string) => {
  const s = createReadingSession({ id: `s-${cardId}`, cardId, mode: "live", startedAt: "2026-10-18T10:00:00.000Z" });
  if (!s.ok) throw new Error("fixture");
  const d = completeReadingSession(s.value, "2026-10-18T10:01:00.000Z", null);
  if (!d.ok) throw new Error("fixture");
  return d.value;
};

describe("Reading Room state", () => {
  it("starts in Studio on the first Card, and clamps a stale saved position", () => {
    const s = initialReadingRoom(ids);
    expect(s).toMatchObject({ index: 0, mode: "studio", status: "reading" });
    expect(initialReadingRoom(ids, [], 99).index).toBe(2);
    expect(initialReadingRoom(ids, [], -5).index).toBe(0);
  });
  it("advances, goes back, and does not go before the first Card", () => {
    let s = initialReadingRoom(ids);
    s = reduce(s, { type: "next" });
    expect(currentCardId(s)).toBe("b");
    s = reduce(reduce(s, { type: "previous" }), { type: "previous" });
    expect(currentCardId(s)).toBe("a");
  });
  it("ends the Deck after the last Card, and Previous returns to it", () => {
    let s = initialReadingRoom(ids, [], 2);
    s = reduce(s, { type: "next" });
    expect(s.status).toBe("ended");
    expect(reduce(s, { type: "next" })).toBe(s);
    s = reduce(s, { type: "previous" });
    expect(s).toMatchObject({ status: "reading", index: 2 });
  });
  it("restarts from the first Card", () => {
    expect(reduce(initialReadingRoom(ids, [], 2), { type: "restart" }).index).toBe(0);
  });
  it("switches mode without moving", () => {
    const s = initialReadingRoom(ids, [], 1);
    expect(reduce(s, { type: "setMode", mode: "live" })).toMatchObject({ mode: "live", index: 1 });
    expect(reduce(s, { type: "setMode", mode: "studio" })).toBe(s);
  });
  it("records a completed attempt only for a Card in this Deck", () => {
    const s = initialReadingRoom(ids);
    expect(reduce(s, { type: "attemptCompleted", session: live("b") }).sessions).toHaveLength(1);
    expect(reduce(s, { type: "attemptCompleted", session: live("zzz") })).toBe(s);
    const open = createReadingSession({ id: "open", cardId: "a", mode: "live", startedAt: "2026-10-18T10:00:00.000Z" });
    if (!open.ok) throw new Error("fixture");
    expect(reduce(s, { type: "attemptCompleted", session: open.value })).toBe(s);
  });
  it("copes with an empty Deck", () => {
    const s = initialReadingRoom([]);
    expect(currentCardId(s)).toBeNull();
    expect(reduce(s, { type: "next" })).toBe(s);
  });
});
