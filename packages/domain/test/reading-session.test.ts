import { describe, expect, it } from "vitest";
import { completeReadingSession, createReadingSession } from "../src/reading-session";

const start = { id: "s1", cardId: "c1", mode: "live" as const, startedAt: "2026-10-18T10:00:00.000Z" };

describe("reading sessions", () => {
  it("starts unscored with English as the translation language", () => {
    const r = createReadingSession(start);
    expect(r.ok && r.value).toMatchObject({ targetLanguage: "en", score: null });
    expect(r.ok && "completedAt" in r.value).toBe(false);
  });
  it("keeps the user id only when given", () => {
    const r = createReadingSession({ ...start, userId: "u1" });
    expect(r.ok && r.value.userId).toBe("u1");
  });
  it.each([
    ["blank id", { id: " " }],
    ["blank card", { cardId: "" }],
    ["unknown mode", { mode: "quiz" as never }],
    ["bad date", { startedAt: "soon" }],
  ])("rejects %s", (_n, patch) => expect(createReadingSession({ ...start, ...patch }).ok).toBe(false));

  it("completes once, with a score", () => {
    const s = createReadingSession(start);
    if (!s.ok) throw new Error("fixture");
    const done = completeReadingSession(s.value, "2026-10-18T10:01:00.000Z", 72);
    expect(done.ok && done.value).toMatchObject({ completedAt: "2026-10-18T10:01:00.000Z", score: 72 });
    if (!done.ok) throw new Error("fixture");
    const again = completeReadingSession(done.value, "2026-10-18T10:02:00.000Z", 80);
    expect(!again.ok && again.error.code).toBe("SESSION_ALREADY_COMPLETE");
  });
  it("rejects completion before the start, and non-finite scores", () => {
    const s = createReadingSession(start);
    if (!s.ok) throw new Error("fixture");
    expect(completeReadingSession(s.value, "2026-10-18T09:00:00.000Z", null).ok).toBe(false);
    expect(completeReadingSession(s.value, "2026-10-18T10:01:00.000Z", Number.NaN).ok).toBe(false);
  });
});
