import { describe, expect, it } from "vitest";
import { medianHz, SAMPLE_RATE, toSemitoneContour, trackPitch } from "../src/pitch";
import { resampleTo16k } from "../src/resample";
import { yinFrame } from "../src/yin";
import { mulberry32 } from "../src/synth";

function harmonic(hz: number, seconds: number, sr = SAMPLE_RATE, harmonics = 10): Float32Array {
  const out = new Float32Array(Math.round(seconds * sr));
  for (let i = 0; i < out.length; i += 1) {
    let v = 0;
    for (let h = 1; h <= harmonics && h * hz < sr / 2; h += 1) v += Math.sin((2 * Math.PI * h * hz * i) / sr) / h;
    out[i] = 0.3 * v;
  }
  return out;
}

describe("YIN", () => {
  it.each([80, 100, 120, 150, 200, 260, 330, 400])("recovers %i Hz within 1 percent", (hz) => {
    const frame = harmonic(hz, 0.04);
    const result = yinFrame(frame, { sampleRate: SAMPLE_RATE });
    expect(Math.abs(result.hz - hz) / hz).toBeLessThan(0.01);
    expect(result.aperiodicity).toBeLessThan(0.15);
  });

  it("finds no pitch in silence", () => {
    expect(yinFrame(new Float32Array(640), { sampleRate: SAMPLE_RATE }).hz).toBe(0);
  });

  it("finds no pitch in noise", () => {
    const rand = mulberry32(5);
    const noise = Float32Array.from({ length: 640 }, () => rand() - 0.5);
    expect(yinFrame(noise, { sampleRate: SAMPLE_RATE }).hz).toBe(0);
  });

  it("is deterministic", () => {
    const frame = harmonic(173, 0.04);
    expect(yinFrame(frame, { sampleRate: SAMPLE_RATE })).toEqual(yinFrame(frame, { sampleRate: SAMPLE_RATE }));
  });
});

describe("pitch track", () => {
  it("tracks a steady voice with under 2 percent octave errors", () => {
    for (const hz of [90, 140, 220, 330]) {
      const track = trackPitch(harmonic(hz, 1.5));
      const voiced = track.hz.filter((v): v is number => v !== null);
      expect(voiced.length / track.hz.length).toBeGreaterThan(0.9);
      const octave = voiced.filter((v) => Math.abs(12 * Math.log2(v / hz)) > 6).length;
      expect(octave / voiced.length).toBeLessThan(0.02);
      expect(Math.abs(medianHz(track.hz, 0, track.hz.length) - hz) / hz).toBeLessThan(0.01);
    }
  });

  it("has no voiced frames in silence", () => {
    const track = trackPitch(new Float32Array(SAMPLE_RATE));
    expect(track.hz.every((v) => v === null)).toBe(true);
  });

  it("has almost no voiced frames in noise", () => {
    const rand = mulberry32(9);
    const track = trackPitch(Float32Array.from({ length: SAMPLE_RATE }, () => 0.3 * (rand() - 0.5)));
    expect(track.hz.filter((v) => v !== null).length / track.hz.length).toBeLessThan(0.1);
  });

  it("follows a rising glide of one octave", () => {
    const sr = SAMPLE_RATE;
    const n = sr * 2;
    const out = new Float32Array(n);
    let phase = 0;
    for (let i = 0; i < n; i += 1) {
      const hz = 120 * 2 ** (i / n);
      phase += (2 * Math.PI * hz) / sr;
      let v = 0;
      for (let h = 1; h <= 8; h += 1) v += Math.sin(h * phase) / h;
      out[i] = 0.3 * v;
    }
    const st = toSemitoneContour(trackPitch(out).hz, 120);
    const early = st.slice(10, 30).filter((v): v is number => v !== null);
    const late = st.slice(170, 190).filter((v): v is number => v !== null);
    const avg = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
    expect(avg(late) - avg(early)).toBeGreaterThan(9);
  });
});

describe("resampling", () => {
  it.each([48000, 44100])("keeps the pitch of a %i Hz recording", (sr) => {
    const out = resampleTo16k(harmonic(220, 0.5, sr), sr);
    expect(Math.abs(out.length - 8000)).toBeLessThanOrEqual(2);
    const hz = yinFrame(out.subarray(1000, 1640), { sampleRate: SAMPLE_RATE }).hz;
    expect(Math.abs(hz - 220) / 220).toBeLessThan(0.01);
  });
  it("returns 16 kHz input untouched and rejects lower rates", () => {
    const x = new Float32Array(10);
    expect(resampleTo16k(x, 16000)).toBe(x);
    expect(() => resampleTo16k(x, 8000)).toThrow();
  });
});
