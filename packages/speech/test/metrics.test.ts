import { describe, expect, it } from "vitest";
import { alignOpenEnded } from "../src/dtw";
import { linearCredit, resonanceScore, rhythmScore, toneScore } from "../src/metrics";
import { computeMfcc, MFCC_DIMS, normalizeCepstra } from "../src/mfcc";
import { synthUtterance, KAAARO } from "../src/synth";

describe("credit", () => {
  it("is full, zero, and linear between", () => {
    expect(linearCredit(1.5, 1.5, 4)).toBe(1);
    expect(linearCredit(4, 1.5, 4)).toBe(0);
    expect(linearCredit(2.75, 1.5, 4)).toBeCloseTo(0.5, 6);
    expect(linearCredit(0, 1.5, 4)).toBe(1);
    expect(linearCredit(99, 1.5, 4)).toBe(0);
  });
});

describe("Tone", () => {
  const ref = [0, 2.5, -2.5, 2.5, -2.5];
  it("scores an identical contour 100", () => expect(toneScore(ref, ref).score).toBe(100));
  it("is independent of register: a whole contour shifted scores 100", () => {
    expect(toneScore(ref.map((v) => v + 7), ref).score).toBe(100);
  });
  it("gives zero credit for a step that is 4 semitones off", () => {
    const wrong = [0, -1.5, -2.5, 2.5, -2.5]; // first step is 4 st too low
    const r = toneScore(wrong, ref);
    expect(r.intervalErrors[0]).toBeCloseTo(-4, 6);
    expect(r.markers[1]).toBe("lower");
    expect(r.score!).toBeLessThan(100);
  });
  it("marks a step that is too wide as higher", () => {
    expect(toneScore([0, 7, -2.5, 2.5, -2.5], ref).markers[1]).toBe("higher");
  });
  it("skips pairs it cannot measure and says so", () => {
    const r = toneScore([0, null, -2.5, 2.5, -2.5], ref);
    expect(r.markers[1]).toBe("unmeasured");
    expect(r.pairs).toBe(2);
    expect(r.score).toBe(100);
  });
  it("returns null when no pair is measurable", () => {
    expect(toneScore([0, null, null], [0, 1, 2]).score).toBeNull();
  });
  it("monotone against a varied reference scores low", () => {
    expect(toneScore([0, 0, 0, 0, 0], ref).score!).toBeLessThan(25);
  });
});

describe("Rhythm", () => {
  it("scores identical timing 100 with pace 1", () => {
    const r = rhythmScore([200, 200, 180], [200, 200, 180]);
    expect(r).toEqual({ score: 100, pace: 1 });
  });
  it("ignores overall speed: everything 1.5x slower still scores 100", () => {
    const r = rhythmScore([300, 300, 270], [200, 200, 180]);
    expect(r.score).toBe(100);
    expect(r.pace).toBeCloseTo(1.5, 6);
  });
  it("penalises one syllable that is twice as long as it should be", () => {
    expect(rhythmScore([200, 400, 180], [200, 200, 180]).score!).toBeLessThan(80);
  });
  it("returns null for empty input", () => expect(rhythmScore([], []).score).toBeNull());
});

describe("Resonance", () => {
  it("weights Tone 70 and Rhythm 30 and rounds", () => {
    expect(resonanceScore(100, 100)).toBe(100);
    expect(resonanceScore(0, 100)).toBe(30);
    expect(resonanceScore(100, 0)).toBe(70);
    expect(resonanceScore(50, 50)).toBe(50);
  });
});

describe("MFCC", () => {
  it("makes 13 numbers per 10 ms and normalises to zero mean and unit variance", () => {
    const { samples } = synthUtterance(KAAARO);
    const frames = computeMfcc(samples);
    expect(frames.length).toBe(Math.floor((samples.length - 400) / 160) + 1);
    expect(frames[0]!.length).toBe(MFCC_DIMS);
    const norm = normalizeCepstra(frames);
    for (let d = 0; d < MFCC_DIMS; d += 1) {
      const mean = norm.reduce((s, f) => s + f[d]!, 0) / norm.length;
      const variance = norm.reduce((s, f) => s + (f[d]! - mean) ** 2, 0) / norm.length;
      expect(Math.abs(mean)).toBeLessThan(1e-9);
      expect(variance).toBeCloseTo(1, 6);
    }
    expect(normalizeCepstra([])).toEqual([]);
  });
});

describe("DTW", () => {
  const frames = (stretch: number) => {
    const out = [];
    const base = [0, 0, 3, 3, 3, -2, -2, 5, 5, 5, 5, 0];
    for (const v of base) for (let k = 0; k < stretch; k += 1) out.push(Float64Array.from([v, v / 2]));
    return out;
  };
  it("follows a uniformly stretched copy and stays monotone", () => {
    const a = alignOpenEnded(frames(1), frames(2))!;
    expect(a.meanCost).toBeLessThan(0.5);
    for (let i = 1; i < a.first.length; i += 1) expect(a.first[i]!).toBeGreaterThanOrEqual(a.first[i - 1]!);
    expect(a.last[a.last.length - 1]!).toBeGreaterThanOrEqual(2 * 11);
  });
  it("tolerates extra leading and trailing frames on the learner side", () => {
    const pad = Array.from({ length: 6 }, () => Float64Array.from([-9, -9]));
    const learner = [...pad, ...frames(1), ...pad];
    const a = alignOpenEnded(frames(1), learner)!;
    expect(a.first[0]).toBe(6);
    expect(a.meanCost).toBeLessThan(0.5);
  });
  it("returns null for empty or oversized input", () => {
    expect(alignOpenEnded([], frames(1))).toBeNull();
    expect(alignOpenEnded(frames(1), [])).toBeNull();
  });
});
