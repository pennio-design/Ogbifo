import { describe, expect, it } from "vitest";
import { emptyProgress, InMemoryProgressStore, parseProgress, PROGRESS_KEY, StorageProgressStore, type StorageLike } from "../src/progress-store";

class FakeStorage implements StorageLike {
  data = new Map<string, string>();
  getItem(k: string) { return this.data.get(k) ?? null; }
  setItem(k: string, v: string) { this.data.set(k, v); }
}

const done = { id: "s1", cardId: "c1", mode: "live", targetLanguage: "en", startedAt: "2026-10-18T10:00:00.000Z", completedAt: "2026-10-18T10:01:00.000Z", score: null };

describe("progress store", () => {
  it("round-trips sessions and positions", () => {
    const store = new StorageProgressStore(new FakeStorage());
    const state = { sessions: [done], positions: { d1: 3 } } as never;
    store.save(state);
    expect(store.load()).toEqual(state);
  });
  it("returns empty progress for missing, corrupt or wrong-shaped data", () => {
    expect(parseProgress(null)).toBe(emptyProgress);
    expect(parseProgress("{not json")).toBe(emptyProgress);
    expect(parseProgress("[1,2]")).toBe(emptyProgress);
    expect(parseProgress('"text"')).toBe(emptyProgress);
  });
  it("drops invalid entries and keeps valid ones", () => {
    const raw = JSON.stringify({
      sessions: [done, { id: 1 }, { ...done, id: "bad-mode", mode: "quiz" }, { ...done, id: "bad-time", completedAt: "2020-01-01T00:00:00.000Z" }, null],
      positions: { d1: 2, d2: -1, d3: 1.5, d4: "x" },
    });
    const p = parseProgress(raw);
    expect(p.sessions.map((s) => s.id)).toEqual(["s1"]);
    expect(p.positions).toEqual({ d1: 2 });
  });
  it("survives storage that throws, as in a blocked or full browser store", () => {
    const hostile: StorageLike = { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("full"); } };
    const store = new StorageProgressStore(hostile);
    expect(store.load()).toBe(emptyProgress);
    expect(() => store.save(emptyProgress)).not.toThrow();
  });
  it("uses a versioned key", () => expect(PROGRESS_KEY).toMatch(/v1$/));
  it("in-memory store keeps state", () => {
    const m = new InMemoryProgressStore();
    m.save({ sessions: [], positions: { d: 1 } });
    expect(m.load().positions).toEqual({ d: 1 });
  });
});
