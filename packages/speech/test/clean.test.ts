import { describe, expect, it } from "vitest";
import { analyzeAttempt } from "../src/analyze";
import { buildReferenceAnnotation } from "../src/annotation";
import { cleanAudio } from "../src/clean";
import { trackPitch } from "../src/pitch";
import { synthSpeech } from "../src/speech-synth";
import { syllabify } from "../src/syllabify";
import { mulberry32 } from "../src/synth";

const parts = syllabify("Adìyẹ tí kò kú ṣì maa jẹ àgbàdo.").syllables;
const ref = synthSpeech(parts, { seed: 1, toneStepSemitones: 2 });
const built = buildReferenceAnnotation({ samples: ref.samples, syllables: parts.map((p, i) => ({ text: p.text, tone: p.tone, ...ref.spans[i]! })) });
if (!built.ok) throw new Error("setup");
const annotation = built.value;

const rms = (x: Float32Array) => Math.sqrt(x.reduce((a, v) => a + v * v, 0) / Math.max(x.length, 1));
const voiced = (x: Float32Array) => trackPitch(x).hz.filter((h) => h !== null).length;
const reading = (options = {}) => synthSpeech(parts, { seed: 7, registerSemitones: 6, toneStepSemitones: 2, leadMs: 600, trailMs: 600, ...options }).samples;

function noisy(x: Float32Array, snrDb: number, hum = false, seed = 3): Float32Array {
  const r = mulberry32(seed);
  const edge = Math.round(0.4 * 16000);
  const noiseRms = rms(x.slice(edge, x.length - edge)) / 10 ** (snrDb / 20);
  return x.map((v, i) => {
    const g = Math.sqrt(-2 * Math.log(Math.max(r(), 1e-12))) * Math.cos(2 * Math.PI * r());
    return v + noiseRms * g + (hum ? 0.5 * noiseRms * Math.sin((2 * Math.PI * 50 * i) / 16000) : 0);
  });
}

describe("audio treatment", () => {
  it("keeps the length, is deterministic and never adds energy", () => {
    const x = noisy(reading(), 15);
    const a = cleanAudio(x);
    expect(a).toHaveLength(x.length);
    expect(Array.from(cleanAudio(x).slice(4000, 4010))).toEqual(Array.from(a.slice(4000, 4010)));
    expect(rms(a)).toBeLessThanOrEqual(rms(x) * 1.05);
  });
  it("removes a constant offset and low rumble", () => {
    const n = 16000 * 2;
    const x = new Float32Array(n).map((_, i) => 0.2 + 0.1 * Math.sin((2 * Math.PI * 20 * i) / 16000));
    expect(rms(cleanAudio(x).slice(8000))).toBeLessThan(0.02);
  });
  it("does not turn silence into sound", () => {
    expect(rms(cleanAudio(new Float32Array(16000)))).toBe(0);
    expect(cleanAudio(new Float32Array(100))).toHaveLength(100);
  });
  it("leaves a clean reading scoring as before", () => {
    const x = reading({ seed: 9 });
    const treated = analyzeAttempt(x, annotation);
    const untreated = analyzeAttempt(x, annotation, {}, { denoise: false });
    if (treated.status !== "scored" || untreated.status !== "scored") throw new Error("refused");
    expect(treated.tone).toBeGreaterThanOrEqual(untreated.tone - 3);
    expect(treated.rhythm).toBeGreaterThanOrEqual(untreated.rhythm - 5);
  });
  it("finds more of the voice in noise, and in hum", () => {
    for (const x of [noisy(reading(), 10), noisy(reading(), 10, true)]) {
      expect(voiced(cleanAudio(x))).toBeGreaterThan(voiced(x));
    }
  });
  it("reads a very noisy recording that would otherwise be refused (5 dB)", () => {
    const x = noisy(reading(), 5);
    expect(analyzeAttempt(x, annotation, {}, { denoise: false }).status).toBe("refused");
    const treated = analyzeAttempt(x, annotation);
    expect(treated.status).toBe("scored");
    if (treated.status === "scored") expect(treated.tone).toBeGreaterThan(80);
  });
  it("still refuses what cannot be heard", () => {
    const r = analyzeAttempt(noisy(reading(), 0), annotation);
    expect(r.status).toBe("refused");
  });
});

describe("pace is not forced (D-045)", () => {
  it.each([
    ["slow, 2.5 times as long", 2.5],
    ["quick, 0.5 times as long", 0.5],
    ["much slower, 3.5 times as long", 3.5],
  ])("%s still scores the tones high", (_name, tempo) => {
    const r = analyzeAttempt(reading({ tempo, seed: 11 }), annotation);
    expect(r.status).toBe("scored");
    if (r.status === "scored") {
      expect(r.tone).toBeGreaterThanOrEqual(85);
      expect(r.pace).toBeGreaterThan(0);
    }
  });
});
