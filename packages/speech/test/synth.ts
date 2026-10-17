/**
 * Synthetic speech for tests: harmonic voices with a controllable pitch contour,
 * syllable timing, vowel colour (formants), register and noise. Known ground
 * truth, deterministic. It is NOT a substitute for real recordings: calibration
 * on volunteer speakers is still a ship gate (OPEN_CONFLICTS #17).
 */
import type { Tone } from "../src/syllabify";

export const SR = 16000;

export interface SynthSyllable {
  readonly tone: Tone;
  readonly ms: number;
  /** Index into VOWELS, gives each syllable a different spectrum. */
  readonly vowel: number;
}

export interface SynthOptions {
  baseHz?: number;
  registerSemitones?: number;
  tempo?: number; // duration multiplier, 1 = unchanged, 2 = twice as slow
  formantScale?: number; // a different "speaker": scales all formants
  noiseStd?: number;
  seed?: number;
  leadMs?: number;
  trailMs?: number;
  amplitude?: number;
  /** Replace every tone with Mid. */
  monotone?: boolean;
  levels?: Record<Tone, number>;
}

const VOWELS: readonly (readonly [number, number])[] = [
  [700, 1200], [400, 2000], [300, 2300], [500, 900], [350, 800], [600, 1700],
];

export const DEFAULT_LEVELS: Record<Tone, number> = { H: 2.5, M: 0, L: -2.5 };

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const gaussian = (rand: () => number) => Math.sqrt(-2 * Math.log(Math.max(rand(), 1e-12))) * Math.cos(2 * Math.PI * rand());

export function synthUtterance(syllables: readonly SynthSyllable[], options: SynthOptions = {}) {
  const base = (options.baseHz ?? 120) * 2 ** ((options.registerSemitones ?? 0) / 12);
  const tempo = options.tempo ?? 1;
  const formantScale = options.formantScale ?? 1;
  const lead = Math.round(((options.leadMs ?? 300) / 1000) * SR);
  const trail = Math.round(((options.trailMs ?? 300) / 1000) * SR);
  const levels = options.levels ?? DEFAULT_LEVELS;
  const rand = mulberry32(options.seed ?? 1);

  const lengths = syllables.map((s) => Math.round(((s.ms * tempo) / 1000) * SR));
  const speech = lengths.reduce((a, b) => a + b, 0);
  const out = new Float32Array(lead + speech + trail);
  const spans: { startMs: number; endMs: number }[] = [];

  let phase = 0;
  let cursor = lead;
  let previousLevel = levels[options.monotone ? "M" : syllables[0]!.tone];
  for (const [k, syllable] of syllables.entries()) {
    const n = lengths[k]!;
    const level = levels[options.monotone ? "M" : syllable.tone];
    const [f1, f2] = VOWELS[syllable.vowel % VOWELS.length]!;
    const glide = Math.min(Math.round(0.04 * SR), Math.floor(n * 0.4));
    spans.push({ startMs: (cursor / SR) * 1000, endMs: ((cursor + n) / SR) * 1000 });
    for (let i = 0; i < n; i += 1) {
      const semitone = i < glide ? previousLevel + ((level - previousLevel) * i) / Math.max(glide, 1) : level;
      const f0 = base * 2 ** (semitone / 12);
      phase += (2 * Math.PI * f0) / SR;
      let sample = 0;
      for (let h = 1; h * f0 < 3800; h += 1) {
        const f = h * f0;
        const colour = 1 + 4 * Math.exp(-(((f - f1 * formantScale) / 150) ** 2)) + 3 * Math.exp(-(((f - f2 * formantScale) / 250) ** 2));
        sample += (colour / h) * Math.sin(h * phase);
      }
      const ramp = Math.min(1, i / (0.012 * SR), (n - i) / (0.012 * SR));
      out[cursor + i] = sample * ramp;
    }
    previousLevel = level;
    cursor += n;
  }

  let peak = 0;
  for (const v of out) peak = Math.max(peak, Math.abs(v));
  const gain = ((options.amplitude ?? 0.5) / (peak || 1));
  const noise = options.noiseStd ?? 0.002;
  for (let i = 0; i < out.length; i += 1) out[i] = out[i]! * gain + noise * gaussian(rand);
  return { samples: out, spans };
}

/** "Ẹ káàárọ̀": Mid High Low High Low, five syllables. */
export const KAAARO: readonly SynthSyllable[] = [
  { tone: "M", ms: 220, vowel: 1 },
  { tone: "H", ms: 200, vowel: 0 },
  { tone: "L", ms: 180, vowel: 2 },
  { tone: "H", ms: 200, vowel: 3 },
  { tone: "L", ms: 260, vowel: 4 },
];

/** A longer phrase: 40 syllables of varied tone, about 8 seconds. */
export const LONG_PHRASE: readonly SynthSyllable[] = Array.from({ length: 40 }, (_, i) => ({
  tone: (["M", "H", "L", "H", "L", "M", "H", "H"] as const)[i % 8]!,
  ms: 190 + (i % 3) * 20,
  vowel: i % 6,
}));
