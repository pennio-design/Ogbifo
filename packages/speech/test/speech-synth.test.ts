import { describe, expect, it } from "vitest";
import { analyzeAttempt } from "../src/analyze";
import { buildReferenceAnnotation } from "../src/annotation";
import { medianHz, trackPitch } from "../src/pitch";
import { syllabify } from "../src/syllabify";
import { SPEECH_SR, synthSpeech } from "../src/speech-synth";
import { KAAARO, synthUtterance } from "../src/synth";

const syllablesOf = (text: string) => syllabify(text).syllables;
const GREETING = syllablesOf("Ẹ káàárọ̀");
const PROVERB = syllablesOf("Adìyẹ tí kò kú ṣì maa jẹ àgbàdo.");

/**
 * How much loudness moves inside the speech: the 15th percentile of 20 ms frame RMS over
 * the 85th, among frames that are not silence. A steady tone sits near 1; speech dips
 * between syllables and consonants.
 */
function loudnessSwing(samples: Float32Array, fromMs: number, toMs: number): number {
  const frame = Math.round(0.02 * SPEECH_SR);
  const rms: number[] = [];
  for (let s = Math.round((fromMs / 1000) * SPEECH_SR); s + frame < Math.round((toMs / 1000) * SPEECH_SR); s += frame) {
    let e = 0;
    for (let i = 0; i < frame; i += 1) e += samples[s + i]! ** 2;
    rms.push(Math.sqrt(e / frame));
  }
  rms.sort((x, y) => x - y);
  return rms[Math.floor(rms.length * 0.15)]! / rms[Math.floor(rms.length * 0.85)]!;
}

describe("speech-like synthetic voice", () => {
  it("is deterministic for a seed and different for another", () => {
    const a = synthSpeech(GREETING, { seed: 3 });
    expect(Array.from(synthSpeech(GREETING, { seed: 3 }).samples.slice(5000, 5010))).toEqual(Array.from(a.samples.slice(5000, 5010)));
    expect(Array.from(synthSpeech(GREETING, { seed: 4 }).samples.slice(5000, 5010))).not.toEqual(Array.from(a.samples.slice(5000, 5010)));
  });
  it("gives one ordered span per syllable, inside the audio, with silence either side", () => {
    const v = synthSpeech(PROVERB, { leadMs: 300, trailMs: 300 });
    expect(v.spans).toHaveLength(PROVERB.length);
    expect(v.spans[0]!.startMs).toBeCloseTo(300, 0);
    v.spans.forEach((s, i) => {
      expect(s.endMs).toBeGreaterThan(s.startMs);
      if (i > 0) expect(s.startMs).toBeCloseTo(v.spans[i - 1]!.endMs, 3);
    });
    expect(v.spans.at(-1)!.endMs).toBeLessThan((v.samples.length / SPEECH_SR) * 1000 - 250);
    expect(Math.max(...v.samples.map(Math.abs))).toBeLessThanOrEqual(0.55);
  });
  it("is a low voice: pitch about 90 to 130 Hz, High above Mid above Low", () => {
    const v = synthSpeech(GREETING, { seed: 1 });
    const track = trackPitch(v.samples);
    const hz = (k: number) => {
      const s = v.spans[k]!;
      const from = Math.floor(((s.startMs + (s.endMs - s.startMs) * 0.4) / 1000) * 100);
      const to = Math.floor(((s.endMs - (s.endMs - s.startMs) * 0.1) / 1000) * 100);
      return medianHz(track.hz, from, to);
    };
    const [m, h, l] = [hz(0), hz(1), hz(2)];
    expect(m).toBeGreaterThan(85);
    expect(m).toBeLessThan(135);
    expect(h).toBeGreaterThan(m);
    expect(l).toBeLessThan(m);
  });
  it("moves in loudness like speech, where the old test tones stay steady", () => {
    const speech = synthSpeech(PROVERB, { seed: 1 });
    const swing = loudnessSwing(speech.samples, speech.spans[0]!.startMs, speech.spans.at(-1)!.endMs);
    const tones = synthUtterance(KAAARO, { seed: 1, baseHz: 120, leadMs: 0, trailMs: 0 });
    const steady = loudnessSwing(tones.samples, tones.spans[0]!.startMs, tones.spans.at(-1)!.endMs);
    expect(swing).toBeLessThan(0.6);
    expect(steady).toBeGreaterThan(swing);
  });
  it("is not perfectly periodic: pitch wobbles a little inside a vowel, as a voice does", () => {
    const v = synthSpeech(PROVERB, { seed: 1 });
    const track = trackPitch(v.samples);
    const s = v.spans[1]!;
    const from = Math.floor(((s.startMs + (s.endMs - s.startMs) * 0.5) / 1000) * 100);
    const to = Math.floor(((s.endMs - 10) / 1000) * 100);
    const seg = track.hz.slice(from, to).filter((h): h is number => h !== null);
    expect(seg.length).toBeGreaterThan(3);
    const st = seg.map((h) => 12 * Math.log2(h / seg[0]!));
    const spread = Math.max(...st) - Math.min(...st);
    expect(spread).toBeGreaterThan(0.01);
    expect(spread).toBeLessThan(3);
  });
  it("reads cleanly through the real pipeline: annotation builds, and a re-recording scores high", () => {
    const ref = synthSpeech(PROVERB, { seed: 1 });
    const annotation = buildReferenceAnnotation({
      samples: ref.samples,
      syllables: PROVERB.map((s, i) => ({ text: s.text, tone: s.tone, ...ref.spans[i]! })),
    });
    expect(annotation.ok).toBe(true);
    if (!annotation.ok) return;
    const learner = synthSpeech(PROVERB, { seed: 9, registerSemitones: 8, formantScale: 1.15, tempo: 1.08, leadMs: 500, trailMs: 500 });
    const result = analyzeAttempt(learner.samples, annotation.value);
    expect(result.status).toBe("scored");
    if (result.status === "scored") {
      expect(result.tone).toBeGreaterThan(75);
      expect(result.overall).toBeGreaterThan(75);
    }
  });
  it("a flat reading of the same words scores clearly lower", () => {
    const ref = synthSpeech(GREETING, { seed: 1 });
    const annotation = buildReferenceAnnotation({
      samples: ref.samples,
      syllables: GREETING.map((s, i) => ({ text: s.text, tone: s.tone, ...ref.spans[i]! })),
    });
    if (!annotation.ok) throw new Error(annotation.error.message);
    const good = analyzeAttempt(synthSpeech(GREETING, { seed: 5, registerSemitones: 6 }).samples, annotation.value);
    const flat = analyzeAttempt(synthSpeech(GREETING, { seed: 6, registerSemitones: 6, monotone: true }).samples, annotation.value);
    if (good.status !== "scored" || flat.status !== "scored") throw new Error("refused");
    expect(flat.tone).toBeLessThan(good.tone - 20);
  });
});
