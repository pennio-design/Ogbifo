import { describe, expect, it } from "vitest";
import { analyzeAttempt, REFUSAL_MESSAGES, type AttemptScored } from "../src/analyze";
import { buildReferenceAnnotation, type ReferenceAnnotation } from "../src/annotation";
import { KAAARO, LONG_PHRASE, mulberry32, synthUtterance, type SynthOptions, type SynthSyllable } from "./synth";

function annotate(sylls: readonly SynthSyllable[], options: SynthOptions = {}): ReferenceAnnotation {
  const t = synthUtterance(sylls, { seed: 1, ...options });
  const r = buildReferenceAnnotation({
    samples: t.samples,
    syllables: t.spans.map((s, i) => ({ text: `s${i}`, tone: sylls[i]!.tone, ...s })),
  });
  if (!r.ok) throw new Error(r.error.message);
  return r.value;
}

const reference = annotate(KAAARO);
const read = (sylls: readonly SynthSyllable[], options: SynthOptions) =>
  analyzeAttempt(synthUtterance(sylls, options).samples, reference);
function scored(sylls: readonly SynthSyllable[], options: SynthOptions): AttemptScored {
  const r = read(sylls, options);
  if (r.status !== "scored") throw new Error(`refused: ${r.reason}`);
  return r;
}

const swapped = KAAARO.map((s, i) => (i === 1 ? { ...s, tone: "L" as const } : i === 2 ? { ...s, tone: "H" as const } : s));

describe("a correct reading scores high, whoever reads it", () => {
  it("scores the same reading with new noise at 95 or more", () => {
    const r = scored(KAAARO, { seed: 2 });
    expect(r.overall).toBeGreaterThanOrEqual(95);
    expect(r.coverage).toBe(1);
    expect(r.syllables.map((s) => s.marker)).toEqual(["first", "close", "close", "close", "close"]);
  });

  it.each([
    ["a higher voice with different vowel colour", { registerSemitones: 7, formantScale: 1.15 }],
    ["a lower voice", { registerSemitones: -5, formantScale: 0.9 }],
    ["a much higher voice", { registerSemitones: 10, formantScale: 1.25 }],
    ["a child-like voice", { registerSemitones: 14, formantScale: 1.4, baseHz: 110 }],
  ])("%s scores 90 or more on Tone, Rhythm and Overall", (_name, options) => {
    const r = scored(KAAARO, { seed: 3, ...options });
    expect(r.tone).toBeGreaterThanOrEqual(90);
    expect(r.rhythm).toBeGreaterThanOrEqual(90);
    expect(r.overall).toBeGreaterThanOrEqual(90);
  });

  it("scores a higher and a lower voice within 5 points of each other (SCORING_SPEC section 10)", () => {
    const high = scored(KAAARO, { seed: 3, registerSemitones: 7, formantScale: 1.15 });
    const low = scored(KAAARO, { seed: 3, registerSemitones: -5, formantScale: 0.9 });
    expect(Math.abs(high.overall - low.overall)).toBeLessThanOrEqual(5);
  });

  it.each([0.75, 1.3])("ignores overall speed (x%f) and reports it as pace instead", (tempo) => {
    const r = scored(KAAARO, { seed: 4, tempo });
    expect(r.rhythm).toBeGreaterThanOrEqual(90);
    expect(Math.abs(r.pace - tempo) / tempo).toBeLessThan(0.1);
  });

  it.each([0.5, 0.7, 1.5, 2])("tolerates a pitch range of x%f the reference's", (k) => {
    const r = scored(KAAARO, { seed: 1, levels: { H: 2.5 * k, M: 0, L: -2.5 * k } });
    expect(r.tone).toBeGreaterThanOrEqual(90);
  });

  it("copes with moderate background noise", () => {
    expect(scored(KAAARO, { seed: 8, noiseStd: 0.05 }).overall).toBeGreaterThanOrEqual(90);
  });
});

describe("a reading that differs in tone or timing scores clearly lower", () => {
  const good = scored(KAAARO, { seed: 2 }).overall;

  it("scores a monotone reading low on Tone, and below 45 overall", () => {
    const r = scored(KAAARO, { seed: 6, monotone: true });
    expect(r.tone).toBeLessThanOrEqual(25);
    expect(r.overall).toBeLessThanOrEqual(45);
    expect(r.rangeScale).toBeCloseTo(1 / 0.6, 2); // stretched to the limit, and still low
  });

  it("scores two swapped tones at least 40 points below the correct reading, and marks the steps", () => {
    const r = scored(swapped, { seed: 7 });
    expect(good - r.overall).toBeGreaterThanOrEqual(40);
    expect(r.syllables.some((s) => s.marker === "lower" || s.marker === "higher")).toBe(true);
  });

  it("scores wrong timing low on Rhythm but not on Tone", () => {
    const wrongTiming = KAAARO.map((s, i) => ({ ...s, ms: [320, 120, 350, 100, 140][i]! }));
    const r = scored(wrongTiming, { seed: 12 });
    expect(r.rhythm).toBeLessThanOrEqual(50);
    expect(r.tone).toBeGreaterThanOrEqual(90);
  });

  it("separates fluent from monotone readings across voices (AUC of 1 on synthetic data)", () => {
    const voices: SynthOptions[] = [{}, { registerSemitones: 7, formantScale: 1.15 }, { registerSemitones: -5, formantScale: 0.9 }, { tempo: 1.2 }, { noiseStd: 0.02 }];
    const fluent = voices.map((v, i) => scored(KAAARO, { seed: 20 + i, ...v }).overall);
    const flat = voices.map((v, i) => scored(KAAARO, { seed: 30 + i, ...v, monotone: true }).overall);
    expect(Math.min(...fluent)).toBeGreaterThan(Math.max(...flat));
  });
});

describe("it says so when it cannot follow the reading", () => {
  const refusal = (samples: Float32Array) => {
    const r = analyzeAttempt(samples, reference);
    return r.status === "refused" ? r.reason : "scored";
  };

  it("refuses a recording that is too quiet", () => {
    expect(refusal(synthUtterance(KAAARO, { seed: 9, amplitude: 0.001, noiseStd: 0.0001 }).samples)).toBe("too_quiet");
  });

  it("refuses a recording that is clipped", () => {
    const loud = synthUtterance(KAAARO, { seed: 9, amplitude: 4 }).samples.map((v) => Math.max(-1, Math.min(1, v)));
    expect(refusal(loud)).toBe("clipping");
  });

  it("refuses a recording that is too short", () => {
    expect(refusal(synthUtterance([{ tone: "M", ms: 120, vowel: 1 }], { seed: 1 }).samples)).toBe("too_short");
    expect(refusal(new Float32Array(100))).toBe("too_short");
  });

  it("refuses a reading three times too slow", () => {
    expect(refusal(synthUtterance(KAAARO, { seed: 1, tempo: 3 }).samples)).toBe("wrong_length");
  });

  it("refuses heavy noise instead of guessing", () => {
    expect(refusal(synthUtterance(KAAARO, { seed: 8, noiseStd: 0.15 }).samples)).not.toBe("scored");
  });

  it("refuses silence and unvoiced noise", () => {
    expect(refusal(new Float32Array(16000 * 2))).not.toBe("scored");
    const rand = mulberry32(3);
    expect(refusal(Float32Array.from({ length: 16000 * 2 }, () => 0.3 * (rand() - 0.5)))).not.toBe("scored");
  });

  it("refuses against a reference built by a different pitch algorithm version", () => {
    const stale = { ...reference, algorithmVersion: "ogb-pitch-0" };
    const r = analyzeAttempt(synthUtterance(KAAARO, { seed: 2 }).samples, stale);
    expect(r).toMatchObject({ status: "refused", reason: "reference_mismatch" });
  });

  it("has plain, specific copy for every refusal, never the word error", () => {
    for (const message of Object.values(REFUSAL_MESSAGES)) {
      expect(message).not.toMatch(/error/i);
      expect(message.length).toBeGreaterThan(20);
    }
  });
});

describe("properties of the analysis itself", () => {
  it("is deterministic and does not modify its input", () => {
    const samples = synthUtterance(KAAARO, { seed: 2 }).samples;
    const copy = Float32Array.from(samples);
    const a = analyzeAttempt(samples, reference);
    const b = analyzeAttempt(samples, reference);
    expect(a).toEqual(b);
    expect(samples).toEqual(copy);
  });

  it("returns learner syllable spans in order, inside the recording", () => {
    const r = scored(KAAARO, { seed: 2, tempo: 1.2 });
    let previous = 0;
    for (const s of r.syllables) {
      expect(s.learnerEndMs).toBeGreaterThan(s.learnerStartMs);
      expect(s.learnerStartMs).toBeGreaterThanOrEqual(previous - 20);
      previous = s.learnerEndMs;
    }
  });

  it("scores a long phrase correctly and quickly enough for a phone (under 3 s here)", () => {
    const longRef = annotate(LONG_PHRASE);
    const samples = synthUtterance(LONG_PHRASE, { seed: 2, registerSemitones: 5, formantScale: 1.1 }).samples;
    const start = performance.now();
    const r = analyzeAttempt(samples, longRef);
    const elapsed = performance.now() - start;
    expect(samples.length / 16000).toBeGreaterThan(7);
    expect(r.status).toBe("scored");
    if (r.status === "scored") expect(r.overall).toBeGreaterThanOrEqual(90);
    expect(elapsed).toBeLessThan(3000);
  });
});

describe("reference annotation", () => {
  const t = synthUtterance(KAAARO, { seed: 1 });
  const sylls = t.spans.map((s, i) => ({ text: `s${i}`, tone: KAAARO[i]!.tone, ...s }));
  const code = (syllables: typeof sylls) => {
    const r = buildReferenceAnnotation({ samples: t.samples, syllables });
    return r.ok ? "ok" : r.error.code;
  };

  it("accepts a well-formed annotation and records the algorithm version", () => {
    const r = buildReferenceAnnotation({ samples: t.samples, syllables: sylls });
    expect(r.ok && r.value.algorithmVersion).toBe("ogb-pitch-1");
    expect(r.ok && r.value.syllables).toHaveLength(5);
    expect(r.ok && r.value.mfcc[0]).toHaveLength(13);
  });
  it("rejects too few syllables, blank text, bad tones, bad or overlapping times", () => {
    expect(code(sylls.slice(0, 1))).toBe("ANNOTATION_INVALID");
    expect(code([{ ...sylls[0]!, text: " " }, ...sylls.slice(1)])).toBe("ANNOTATION_INVALID");
    expect(code([{ ...sylls[0]!, tone: "X" as never }, ...sylls.slice(1)])).toBe("ANNOTATION_INVALID");
    expect(code([{ ...sylls[0]!, endMs: sylls[0]!.startMs }, ...sylls.slice(1)])).toBe("ANNOTATION_INVALID");
    expect(code([sylls[0]!, { ...sylls[1]!, startMs: sylls[0]!.startMs }, ...sylls.slice(2)])).toBe("ANNOTATION_INVALID");
    expect(code([...sylls.slice(0, 4), { ...sylls[4]!, endMs: 99999 }])).toBe("ANNOTATION_INVALID");
  });
});
