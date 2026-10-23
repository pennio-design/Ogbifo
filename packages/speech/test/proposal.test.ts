import { describe, expect, it } from "vitest";
import { detectSpeechSpan, proposeSyllables } from "../src/proposal";
import { KAAARO, synthUtterance } from "../src/synth";

describe("speech span", () => {
  it("finds the speech inside leading and trailing silence, within 40 ms", () => {
    const t = synthUtterance(KAAARO, { seed: 1, leadMs: 500, trailMs: 800 });
    const span = detectSpeechSpan(t.samples)!;
    expect(Math.abs(span.startMs - t.spans[0]!.startMs)).toBeLessThan(40);
    expect(Math.abs(span.endMs - t.spans[4]!.endMs)).toBeLessThan(50);
  });
  it("returns null for silence and for too-short input", () => {
    expect(detectSpeechSpan(new Float32Array(16000))).toBeNull();
    expect(detectSpeechSpan(new Float32Array(10))).toBeNull();
  });
});

describe("proposed syllables", () => {
  it("divide the span evenly, in order, with no gaps or overlaps", () => {
    const parts = proposeSyllables({ startMs: 300, endMs: 1300 }, [
      { text: "a", tone: "H" }, { text: "b", tone: "M" }, { text: "c", tone: "L" }, { text: "d", tone: "H" },
    ]);
    expect(parts.map((p) => [p.startMs, p.endMs])).toEqual([[300, 550], [550, 800], [800, 1050], [1050, 1300]]);
    expect(parts.map((p) => p.tone)).toEqual(["H", "M", "L", "H"]);
  });
});
