import { computeMfcc } from "./mfcc";
import { HOP_MS, PITCH_ALGORITHM_VERSION, SAMPLE_RATE, trackPitch } from "./pitch";
import { failResult, okResult, type SpeechResult } from "./result";
import type { Tone } from "./syllabify";

export interface AnnotatedSyllable {
  readonly text: string;
  readonly tone: Tone;
  readonly startMs: number;
  readonly endMs: number;
}

/**
 * Stored with a Card beside its reference audio (D-014, D-033). Computed once,
 * when a reviewer saves the annotation, so learners' devices never analyse the
 * reference recording. `algorithmVersion` must match the scorer.
 */
export interface ReferenceAnnotation {
  readonly algorithmVersion: string;
  readonly hopMs: number;
  readonly durationMs: number;
  readonly syllables: readonly AnnotatedSyllable[];
  /** Hz per hop, null where unvoiced. */
  readonly contourHz: readonly (number | null)[];
  /** Raw 13-dimensional MFCC per 10 ms frame. */
  readonly mfcc: readonly (readonly number[])[];
}

const TONES: readonly string[] = ["H", "M", "L"];

export function buildReferenceAnnotation(input: {
  samples: Float32Array;
  syllables: readonly AnnotatedSyllable[];
}): SpeechResult<ReferenceAnnotation> {
  const { samples, syllables } = input;
  const durationMs = (samples.length / SAMPLE_RATE) * 1000;
  if (syllables.length < 2) return failResult("ANNOTATION_INVALID", "A reference needs at least two syllables.");

  let previousEnd = 0;
  for (const [index, s] of syllables.entries()) {
    if (s.text.trim() === "") return failResult("ANNOTATION_INVALID", `Syllable ${index + 1} has no text.`);
    if (!TONES.includes(s.tone)) return failResult("ANNOTATION_INVALID", `Syllable ${index + 1} has an unknown tone.`);
    if (!(s.startMs >= 0) || !(s.endMs > s.startMs)) return failResult("ANNOTATION_INVALID", `Syllable ${index + 1} must end after it starts.`);
    if (s.startMs < previousEnd) return failResult("ANNOTATION_INVALID", `Syllable ${index + 1} overlaps the one before it.`);
    if (s.endMs > durationMs + 1) return failResult("ANNOTATION_INVALID", `Syllable ${index + 1} ends after the recording.`);
    previousEnd = s.endMs;
  }

  const track = trackPitch(samples);
  const mfcc = computeMfcc(samples).map((frame) => Array.from(frame, (v) => Math.round(v * 1000) / 1000));
  return okResult({
    algorithmVersion: PITCH_ALGORITHM_VERSION,
    hopMs: HOP_MS,
    durationMs,
    syllables: syllables.map((s) => ({ ...s })),
    contourHz: track.hz.map((v) => (v === null ? null : Math.round(v * 10) / 10)),
    mfcc,
  });
}
