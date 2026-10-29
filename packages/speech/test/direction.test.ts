import { describe, expect, it } from "vitest";
import { analyzeAttempt, type AttemptScored } from "../src/analyze";
import { buildReferenceAnnotation, type ReferenceAnnotation } from "../src/annotation";
import { directionToneScore } from "../src/metrics";
import { synthSpeech, type SpeechSynthOptions } from "../src/speech-synth";
import { syllabify } from "../src/syllabify";

const GREETING = syllabify("Ẹ káàárọ̀").syllables;
const PROVERB = syllabify("Adìyẹ tí kò kú ṣì maa jẹ àgbàdo.").syllables;

function annotate(parts: typeof GREETING, options: SpeechSynthOptions = {}): ReferenceAnnotation {
  const v = synthSpeech(parts, { seed: 1, toneStepSemitones: 2, ...options });
  const r = buildReferenceAnnotation({ samples: v.samples, syllables: parts.map((p, i) => ({ text: p.text, tone: p.tone, ...v.spans[i]! })) });
  if (!r.ok) throw new Error(r.error.message);
  return r.value;
}
const GREETING_REF = annotate(GREETING);
const PROVERB_REF = annotate(PROVERB);

function read(parts: typeof GREETING, ref: ReferenceAnnotation, options: SpeechSynthOptions, method: "direction" | "contour" = "direction"): AttemptScored {
  const r = analyzeAttempt(synthSpeech(parts, { leadMs: 500, trailMs: 500, ...options }).samples, ref, {}, { toneMethod: method });
  if (r.status !== "scored") throw new Error(`refused: ${r.reason}`);
  return r;
}

describe("direction-based Tone (D-046)", () => {
  it("scores a natural reading high: smaller contrast, strong downdrift, another pitch, another pace", () => {
    // The owner's failure: a relaxed reading, steps well under the reference's, falling through the phrase.
    const natural = { seed: 21, toneStepSemitones: 1.3, declinationPerSecond: 2.5, registerSemitones: 7, formantScale: 1.12, tempo: 1.25 };
    for (const [parts, ref] of [[GREETING, GREETING_REF], [PROVERB, PROVERB_REF]] as const) {
      expect(read(parts, ref, natural).tone).toBeGreaterThanOrEqual(85);
    }
  });
  it("does not depend on the reference at all: the same reading scores the same against a flat or a wide reference", () => {
    const reading = { seed: 26, toneStepSemitones: 2, registerSemitones: 4 };
    const narrow = read(GREETING, annotate(GREETING, { toneStepSemitones: 0.8 }), reading).tone;
    const wide = read(GREETING, annotate(GREETING, { toneStepSemitones: 4 }), reading).tone;
    expect(Math.abs(narrow - wide)).toBeLessThanOrEqual(2);
  });
  it("still scores an exaggerated, robot-like reading high: imitating is not punished, it is just not required", () => {
    expect(read(GREETING, GREETING_REF, { seed: 22, toneStepSemitones: 3.5 }).tone).toBeGreaterThanOrEqual(90);
  });
  it("scores low when the pitch goes the wrong way", () => {
    const swapped = GREETING.map((s, i) => (i === 1 ? { ...s, tone: "L" as const } : i === 2 ? { ...s, tone: "H" as const } : s));
    const r = read(swapped, GREETING_REF, { seed: 23 });
    expect(r.tone).toBeLessThanOrEqual(60);
    expect(r.syllables.some((s) => s.marker === "lower" || s.marker === "higher")).toBe(true);
  });
  it("scores a monotone reading low", () => {
    expect(read(PROVERB, PROVERB_REF, { seed: 24, monotone: true }).tone).toBeLessThanOrEqual(35);
  });
  it("says which way each step went against the tone marks", () => {
    const swapped = GREETING.map((s, i) => (i === 1 ? { ...s, tone: "L" as const } : s));
    const r = read(swapped, GREETING_REF, { seed: 25 });
    // Syllable 1 should rise (M to H) but was read low: its step is "lower than the marks call for".
    expect(r.syllables[1]!.marker).toBe("lower");
    expect(r.toneMethod).toBe("direction");
    expect(r.rangeScale).toBe(1);
  });
});

describe("directionToneScore", () => {
  const T = ["M", "H", "L", "H", "L"] as const;
  it("credits steps that go the way the marks call for, whatever their size", () => {
    expect(directionToneScore([0, 1, -1, 1, -1], T).score).toBe(100);
    expect(directionToneScore([0, 6, -6, 6, -6], T).score).toBe(100);
  });
  it("gives no credit for a flat or reversed step", () => {
    expect(directionToneScore([0, 0, 0, 0, 0], T).score).toBe(0);
    expect(directionToneScore([0, -2, 2, -2, 2], T).score).toBe(0);
  });
  it("expects a High to Low drop to be about twice a one-level step", () => {
    const r = directionToneScore([0, 0.75], ["L", "H"]);
    expect(r.score).toBe(50); // 0.75 st is a full one-level step, half of the two levels from Low to High
  });
  it("allows level tones to drift down a little", () => {
    expect(directionToneScore([0, -1.2], ["H", "H"]).score).toBe(100);
    expect(directionToneScore([0, -3.5], ["H", "H"]).score).toBe(0);
    expect(directionToneScore([0, 2.5], ["M", "M"]).markers[1]).toBe("higher");
  });
  it("skips pairs it could not measure, and says nothing when none could be", () => {
    const r = directionToneScore([0, null, -1, 1], ["M", "H", "L", "H"]);
    expect(r.pairs).toBe(1);
    expect(directionToneScore([null, null], ["M", "H"]).score).toBeNull();
  });
});
