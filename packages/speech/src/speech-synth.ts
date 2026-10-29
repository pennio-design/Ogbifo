/**
 * A speech-like synthetic voice for the DEVELOPMENT reference recording and for tests.
 *
 * It is a classic source-filter voice: a glottal pulse train with jitter, shimmer and
 * a little breath, shaped by vowel resonances, with a spectral tilt, a falling baseline,
 * smooth tone glides, simple consonant onsets (bursts, hiss, nasal murmur) and a
 * rise and fall of loudness on each syllable. It sounds like a low, robotic male voice
 * reading the Card, not like a musical note.
 *
 * It is NOT a Yorùbá voice. It does not know how the language is actually pronounced
 * (vowel colour and timing are rough, tones are citation levels), so it can never stand
 * in for a real reference recording: it carries the licence `synthetic_test`, appears
 * only where unreviewed content is allowed, and calibration with real speakers is
 * still a ship gate (OPEN_CONFLICTS #17).
 */
import { mulberry32 } from "./synth";
import type { Tone } from "./syllabify";

export const SPEECH_SR = 16000;

export interface SpeechSyllable {
  /** The syllable as written, e.g. "dì" or "gbà". Its letters pick the vowel and consonant. */
  readonly text: string;
  readonly tone: Tone;
}

export interface SpeechSynthOptions {
  /** Mid-tone pitch. Default 105 Hz, a low adult male voice. */
  baseHz?: number;
  registerSemitones?: number;
  /** Semitones between Mid and High (and Mid and Low). Default 3. */
  toneStepSemitones?: number;
  /** How fast the baseline falls, in semitones per second. Default 1. */
  declinationPerSecond?: number;
  /** 1 = unchanged, 2 = twice as slow. */
  tempo?: number;
  /** Scales all vowel resonances: a different-sized speaker. */
  formantScale?: number;
  /** Peak level of the result, 0 to 1. Default 0.5. */
  amplitude?: number;
  seed?: number;
  leadMs?: number;
  trailMs?: number;
  monotone?: boolean;
}

type Formants = readonly [number, number, number];

// Rough adult-male resonances (F1, F2, F3) for the Yorùbá oral vowels.
const VOWEL_FORMANTS: Record<string, Formants> = {
  i: [270, 2290, 3010],
  e: [400, 2100, 2700],
  ẹ: [530, 1840, 2480],
  a: [730, 1090, 2440],
  ọ: [570, 840, 2410],
  o: [430, 930, 2400],
  u: [300, 870, 2240],
};
const NASAL: Formants = [250, 1100, 2400];

type OnsetClass = "none" | "stop" | "affricate" | "fricative" | "nasal" | "approximant";

interface Parsed {
  readonly onset: OnsetClass;
  readonly voiced: boolean;
  readonly letters: string;
  readonly vowel: string | null;
}

const STOPS_VOICED = new Set(["b", "d", "g", "gb"]);
const STOPS_VOICELESS = new Set(["k", "p", "t", "kp"]);
const FRICATIVES = new Set(["f", "s", "ṣ", "h"]);
const NASALS = new Set(["m", "n"]);
const APPROX = new Set(["l", "r", "w", "y"]);

function parse(text: string): Parsed {
  const chars = Array.from(text.normalize("NFD"));
  let letters = "";
  let vowel: string | null = null;
  for (let i = 0; i < chars.length; i += 1) {
    const base = chars[i]!.toLowerCase();
    if (/\p{M}/u.test(base)) continue;
    if ("aeiou".includes(base)) {
      const dot = chars.slice(i + 1).findIndex((c) => !/\p{M}/u.test(c));
      const marks = chars.slice(i + 1, dot === -1 ? undefined : i + 1 + dot);
      vowel = marks.includes("̣") && (base === "e" || base === "o") ? (base === "e" ? "ẹ" : "ọ") : base;
      break;
    }
    const withDot = chars.slice(i + 1).find((c) => !/\p{M}/u.test(c)) !== undefined && chars[i + 1] === "̣" ? "ṣ" : base;
    letters += base === "s" && withDot === "ṣ" ? "ṣ" : base;
  }
  if (letters === "" && vowel === null) return { onset: "none", voiced: true, letters, vowel };
  if (vowel === null) return { onset: NASALS.has(letters) ? "nasal" : "none", voiced: true, letters, vowel };
  if (letters === "") return { onset: "none", voiced: true, letters, vowel };
  if (STOPS_VOICED.has(letters)) return { onset: "stop", voiced: true, letters, vowel };
  if (STOPS_VOICELESS.has(letters)) return { onset: "stop", voiced: false, letters, vowel };
  if (letters === "j") return { onset: "affricate", voiced: true, letters, vowel };
  if (FRICATIVES.has(letters)) return { onset: "fricative", voiced: false, letters, vowel };
  if (NASALS.has(letters)) return { onset: "nasal", voiced: true, letters, vowel };
  if (APPROX.has(letters)) return { onset: "approximant", voiced: true, letters, vowel };
  return { onset: "stop", voiced: false, letters, vowel };
}

const ONSET_MS: Record<OnsetClass, number> = { none: 0, stop: 45, affricate: 70, fricative: 80, nasal: 60, approximant: 45 };
const VOWEL_MS = 150;

const gaussian = (rand: () => number) => Math.sqrt(-2 * Math.log(Math.max(rand(), 1e-12))) * Math.cos(2 * Math.PI * rand());

/** One resonator (Klatt): unity gain at 0 Hz. */
class Resonator {
  private y1 = 0;
  private y2 = 0;
  step(x: number, freq: number, bandwidth: number): number {
    const c = -Math.exp((-2 * Math.PI * bandwidth) / SPEECH_SR);
    const b = 2 * Math.exp((-Math.PI * bandwidth) / SPEECH_SR) * Math.cos((2 * Math.PI * freq) / SPEECH_SR);
    const a = 1 - b - c;
    const y = a * x + b * this.y1 + c * this.y2;
    this.y2 = this.y1;
    this.y1 = y;
    return y;
  }
}

export function synthSpeech(syllables: readonly SpeechSyllable[], options: SpeechSynthOptions = {}) {
  const rand = mulberry32(options.seed ?? 1);
  const base = (options.baseHz ?? 105) * 2 ** ((options.registerSemitones ?? 0) / 12);
  const step = options.toneStepSemitones ?? 3;
  const decl = options.declinationPerSecond ?? 1;
  const tempo = options.tempo ?? 1;
  const scale = options.formantScale ?? 1;
  const lead = Math.round(((options.leadMs ?? 350) / 1000) * SPEECH_SR);
  const trail = Math.round(((options.trailMs ?? 350) / 1000) * SPEECH_SR);
  const level: Record<Tone, number> = { H: step, M: 0, L: -step };

  const plan = syllables.map((s, k) => {
    const p = parse(s.text);
    const last = k === syllables.length - 1;
    const onsetN = Math.round(((ONSET_MS[p.onset] * tempo) / 1000) * SPEECH_SR);
    const vowelN = Math.round(((VOWEL_MS * (last ? 1.25 : 1) * (p.vowel === null ? 0.8 : 1) * tempo) / 1000) * SPEECH_SR);
    const formants = (p.vowel === null ? NASAL : (VOWEL_FORMANTS[p.vowel] ?? VOWEL_FORMANTS.a!)).map((f) => f * scale) as unknown as Formants;
    return { p, tone: options.monotone ? ("M" as Tone) : s.tone, onsetN, vowelN, formants, final: last };
  });

  const total = plan.reduce((a, s) => a + s.onsetN + s.vowelN, 0);
  const out = new Float32Array(lead + total + trail);
  const spans: { startMs: number; endMs: number }[] = [];

  const f1 = new Resonator();
  const f2 = new Resonator();
  const f3 = new Resonator();
  const f4 = new Resonator();
  let lp1 = 0;
  let lp2 = 0;
  const lpCoef = Math.exp((-2 * Math.PI * 160) / SPEECH_SR);
  let prevSource = 0;
  let prevOut = 0;
  let prevNoise = 0;
  let phase = 0;
  let pitchSt = 0;
  let drift = 0;
  let prevFormants: Formants = plan[0]?.formants ?? NASAL;
  let cursor = lead;
  const smooth = 1 - Math.exp(-1 / (0.03 * SPEECH_SR));
  const driftStep = 1 - Math.exp(-1 / (0.4 * SPEECH_SR));

  for (const seg of plan) {
    const n = seg.onsetN + seg.vowelN;
    spans.push({ startMs: (cursor / SPEECH_SR) * 1000, endMs: ((cursor + n) / SPEECH_SR) * 1000 });
    const target = level[seg.tone];
    const transition = Math.round(0.03 * SPEECH_SR);
    for (let i = 0; i < n; i += 1) {
      const t = (cursor + i - lead) / SPEECH_SR;
      // Phrase-final lowering: the last syllable drifts about a semitone down, as speech does.
      const finalDrop = seg.final ? -1 * Math.min(1, i / Math.max(n, 1)) : 0;
      pitchSt += (target + finalDrop - pitchSt) * smooth;
      drift += (gaussian(rand) * 0.15 - drift) * driftStep;
      const f0 = base * 2 ** ((pitchSt - decl * t + drift) / 12);

      const inOnset = i < seg.onsetN;
      const j = inOnset ? i : i - seg.onsetN;
      const vowelPos = inOnset ? 0 : j / Math.max(seg.vowelN, 1);

      // Loudness: rises into the vowel, falls out of it; louder on High.
      const attack = Math.min(1, j / (0.015 * SPEECH_SR));
      // The phrase-final syllable fades out slowly instead of being cut off.
      const release = Math.min(1, (seg.vowelN - j) / ((seg.final ? 0.12 : 0.025) * SPEECH_SR));
      const hump = 0.75 + 0.25 * Math.sin(Math.PI * Math.min(1, vowelPos * 1.1));
      const toneGain = seg.tone === "H" ? 1.15 : seg.tone === "L" ? 0.95 : 1;
      let voicing = 0;
      let noiseGain = 0;
      let burst = 0;
      if (inOnset) {
        const q = i / Math.max(seg.onsetN, 1);
        switch (seg.p.onset) {
          case "stop":
            voicing = seg.p.voiced ? 0.15 : 0;
            burst = i > seg.onsetN * 0.55 ? Math.exp(-(i - seg.onsetN * 0.55) / (0.004 * SPEECH_SR)) : 0;
            break;
          case "affricate":
            voicing = 0.1;
            noiseGain = q > 0.5 ? 0.5 : 0;
            break;
          case "fricative":
            voicing = 0;
            noiseGain = Math.sin(Math.PI * Math.min(1, q)) * (seg.p.letters === "h" ? 0.25 : 0.7);
            break;
          case "nasal":
            voicing = 0.35;
            break;
          case "approximant":
            voicing = 0.5;
            break;
          default:
            voicing = 0.3 + 0.7 * q;
        }
      } else {
        voicing = attack * release * hump * toneGain * (seg.p.vowel === null ? 0.6 : 1);
      }

      // Source: pulse train with jitter and shimmer, plus breath.
      phase += (f0 * (1 + 0.006 * gaussian(rand))) / SPEECH_SR;
      let pulse = 0;
      if (phase >= 1) {
        phase -= 1;
        pulse = (1 + 0.05 * gaussian(rand)) * 40;
      }
      const white = gaussian(rand);
      const source = pulse * voicing + white * (0.035 + 0.06 * voicing) * (voicing > 0 ? 1 : 0);
      lp1 = (1 - lpCoef) * source + lpCoef * lp1;
      lp2 = (1 - lpCoef) * lp1 + lpCoef * lp2;

      // Resonances glide from the previous syllable's vowel.
      const w = Math.min(1, (cursor + i - (cursor)) / transition);
      const F = [0, 1, 2].map((k) => prevFormants[k]! + (seg.formants[k]! - prevFormants[k]!) * w) as unknown as Formants;
      let voiced = f1.step(lp2 * 14, F[0], 70 + 0.05 * F[0]);
      voiced = f2.step(voiced, F[1], 90 + 0.04 * F[1]);
      voiced = f3.step(voiced, F[2], 140);
      voiced = f4.step(voiced, 3500, 220);

      // Hiss (fricatives, affricates) and release bursts: high-passed noise.
      const hiss = white - 0.85 * prevNoise;
      prevNoise = white;
      const unvoiced = (hiss * noiseGain * 0.5 + hiss * burst * 0.9) * 0.6;

      const mix = voiced + unvoiced;
      // Radiation: a gentle rise with frequency.
      const radiated = mix - 0.95 * prevSource;
      prevSource = mix;
      out[cursor + i] = radiated;
      prevOut = radiated;
    }
    prevFormants = seg.formants;
    cursor += n;
  }
  void prevOut;

  let peak = 0;
  for (const v of out) peak = Math.max(peak, Math.abs(v));
  const gain = (options.amplitude ?? 0.5) / (peak || 1);
  for (let i = 0; i < out.length; i += 1) out[i] = out[i]! * gain + 0.0008 * gaussian(rand);
  return { samples: out, spans };
}
