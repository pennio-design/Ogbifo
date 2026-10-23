import { alignOpenEnded } from "./dtw";
import { cleanAudio } from "./clean";
import { computeMfcc, normalizeCepstra } from "./mfcc";
import { rangeScale, rhythmScore, resonanceScore, toneScore, type MarkerState } from "./metrics";
import { HOP_MS, PITCH_ALGORITHM_VERSION, SAMPLE_RATE, medianHz, toSemitoneContour, trackPitch } from "./pitch";
import { median, percentile } from "./stats";
import type { ReferenceAnnotation } from "./annotation";
import type { Tone } from "./syllabify";

/** Initial limits, to be calibrated (SCORING_SPEC.md section 10). */
export const LIMITS: Record<"minSpeechMs" | "minPeakRms" | "maxClippedFraction" | "minSnrDb" | "maxSpeechFractionForNoiseCheck" | "minLengthRatio" | "maxLengthRatio" | "maxMeanDtwCost" | "minCoverage" | "minVoicedFrames", number> = {
  minSpeechMs: 300,
  minPeakRms: 0.005,
  maxClippedFraction: 0.01,
  minSnrDb: 8,
  /** Skip the noise check when speech fills almost the whole recording. */
  maxSpeechFractionForNoiseCheck: 0.9,
  /**
   * Pace is never scored or forced (D-045): alignment absorbs speed. These only catch a
   * reading so short or so long that it cannot be the phrase.
   */
  minLengthRatio: 0.25,
  maxLengthRatio: 4,
  /**
   * Only catches "could not follow that". It is not a wrong-words detector: in
   * synthetic tests wrong phrases cost 2.9 to 4.6 and legitimate very different
   * voices cost up to 4.7, so the two overlap.
   */
  maxMeanDtwCost: 6,
  minCoverage: 0.6,
  minVoicedFrames: 3,
};

export type RefusalReason =
  | "too_quiet"
  | "clipping"
  | "too_short"
  | "noisy"
  | "wrong_length"
  | "alignment_failed"
  | "not_enough_voice"
  | "reference_mismatch";

/** What to tell the learner. Says what happened and what to do, never "error". */
export const REFUSAL_MESSAGES: Record<RefusalReason, string> = {
  too_quiet: "We could barely hear that. Move closer to the microphone and try again.",
  clipping: "That recording was too loud and distorted. Move back a little and try again.",
  too_short: "That was too short for us to follow. Read the whole phrase and try again.",
  noisy: "There was too much background noise. Find a quieter spot and try again.",
  wrong_length: "We couldn't match that to the phrase. Read the whole phrase at a natural pace and try again.",
  alignment_failed: "We couldn't follow that reading. Listen to the reference once more and try again.",
  not_enough_voice: "We couldn't hear enough of your voice to follow the tones. Try again a little louder.",
  reference_mismatch: "This Card's reference needs updating. Please try again later.",
};

export interface SyllableResult {
  readonly index: number;
  readonly text: string;
  readonly tone: Tone;
  readonly marker: MarkerState;
  readonly referenceStartMs: number;
  readonly referenceEndMs: number;
  readonly learnerStartMs: number;
  readonly learnerEndMs: number;
}

export interface AttemptScored {
  readonly status: "scored";
  readonly algorithmVersion: string;
  readonly tone: number;
  readonly rhythm: number;
  /** Always computed. The UI shows it only while `showResonanceNumber` is on (D-036). */
  readonly overall: number;
  /** Share of syllables measured on both sides. */
  readonly coverage: number;
  /** Learner speech duration over reference duration. Informational, never scored. */
  readonly pace: number;
  /** Mean alignment cost. For calibration logging only; never sent to analytics. */
  readonly alignmentCost: number;
  /** Factor applied to the learner's pitch steps (1 = none). */
  readonly rangeScale: number;
  readonly syllables: readonly SyllableResult[];
  /** Normalised pitch (semitones from the speaker's median) per 10 ms, null where unvoiced. */
  readonly learnerContour: readonly (number | null)[];
  readonly referenceContour: readonly (number | null)[];
}

export interface AttemptRefused {
  readonly status: "refused";
  readonly reason: RefusalReason;
  readonly message: string;
}

export type AttemptAnalysis = AttemptScored | AttemptRefused;

const refuse = (reason: RefusalReason): AttemptRefused => ({ status: "refused", reason, message: REFUSAL_MESSAGES[reason] });

function syllablePitch(contour: readonly (number | null)[], start: number, end: number, minVoiced: number): number | null {
  const length = end - start;
  if (length <= 0) return null;
  const from = start + Math.floor(0.2 * length);
  const to = start + Math.ceil(0.8 * length);
  const voiced: number[] = [];
  for (let i = from; i < to && i < contour.length; i += 1) {
    const value = contour[i];
    if (value !== null && value !== undefined) voiced.push(value);
  }
  return voiced.length >= minVoiced ? median(voiced) : null;
}

/**
 * Score one reading against a reference. `learner` is mono audio at 16 kHz in
 * the range -1 to 1 (use resampleTo16k first). Pure and deterministic.
 */
export function analyzeAttempt(
  learner: Float32Array,
  reference: ReferenceAnnotation,
  overrides: Partial<Record<keyof typeof LIMITS, number>> = {},
  options: { denoise?: boolean } = {},
): AttemptAnalysis {
  const limits = { ...LIMITS, ...overrides };
  if (reference.algorithmVersion !== PITCH_ALGORITHM_VERSION) return refuse("reference_mismatch");

  // Clean the audio first (D-045): remove rumble and steady background noise, keep the voice.
  const audio = options.denoise === false ? learner : cleanAudio(learner);
  const track = trackPitch(audio);
  const frames = track.rms.length;
  if (frames === 0) return refuse("too_short");

  const p10 = percentile(track.rms, 0.1);
  const p95 = percentile(track.rms, 0.95);
  if (p95 < limits.minPeakRms) return refuse("too_quiet");

  let clipped = 0;
  for (let i = 0; i < learner.length; i += 1) if (Math.abs(learner[i]!) >= 0.99) clipped += 1;
  if (clipped / learner.length > limits.maxClippedFraction) return refuse("clipping");

  // Speech span: first and last frame well above the quiet end.
  const speechGate = Math.max(0.05 * p95, 1e-4);
  let s0 = -1;
  let s1 = -1;
  let speechFrames = 0;
  for (let i = 0; i < frames; i += 1) {
    if (track.rms[i]! >= speechGate) {
      if (s0 < 0) s0 = i;
      s1 = i;
      speechFrames += 1;
    }
  }
  if (s0 < 0 || ((s1 - s0 + 1) * HOP_MS) < limits.minSpeechMs) return refuse("too_short");

  if (speechFrames / frames <= limits.maxSpeechFractionForNoiseCheck) {
    const snr = 20 * Math.log10(p95 / Math.max(p10, 1e-6));
    if (snr < limits.minSnrDb) return refuse("noisy");
  }

  const refFirstFrame = Math.round(reference.syllables[0]!.startMs / reference.hopMs);
  const refLastFrame = Math.round(reference.syllables[reference.syllables.length - 1]!.endMs / reference.hopMs);
  const refSpanMs = (refLastFrame - refFirstFrame) * reference.hopMs;
  const learnerSpanMs = (s1 - s0 + 1) * HOP_MS;
  const ratio = learnerSpanMs / refSpanMs;
  if (ratio < limits.minLengthRatio || ratio > limits.maxLengthRatio) return refuse("wrong_length");

  // Align on normalised MFCCs: reference trimmed to its speech, learner padded a little.
  const pad = 15;
  const learnerFrom = Math.max(0, s0 - pad);
  const learnerTo = Math.min(frames, s1 + 1 + pad);
  const learnerMfcc = computeMfcc(audio);
  const learnerSlice = normalizeCepstra(learnerMfcc.slice(learnerFrom, learnerTo));
  const refSlice = normalizeCepstra(
    reference.mfcc.slice(refFirstFrame, refLastFrame).map((frame) => Float64Array.from(frame)),
  );
  // Start and end are pinned near the speech span found from energy, so the
  // path cannot end early and shorten the last syllables.
  const window = pad + 5;
  const alignment = alignOpenEnded(refSlice, learnerSlice, { startWindow: window, endWindow: window });
  if (!alignment || alignment.meanCost > limits.maxMeanDtwCost) return refuse("alignment_failed");

  // Carry the reviewer's syllable boundaries across the warping path.
  const spans = reference.syllables.map((s) => {
    const a = Math.min(Math.max(Math.round(s.startMs / reference.hopMs) - refFirstFrame, 0), refSlice.length - 1);
    const b = Math.min(Math.max(Math.round(s.endMs / reference.hopMs) - refFirstFrame, a + 1), refSlice.length);
    const start = learnerFrom + alignment.first[a]!;
    const end = Math.max(start + 1, learnerFrom + alignment.last[b - 1]! + 1);
    return { start, end };
  });

  const learnerFirst = spans[0]!.start;
  const learnerLast = spans[spans.length - 1]!.end;
  const learnerMedian = medianHz(track.hz, learnerFirst, learnerLast);
  const refMedian = medianHz(reference.contourHz, refFirstFrame, refLastFrame);
  if (Number.isNaN(learnerMedian) || Number.isNaN(refMedian)) return refuse("not_enough_voice");

  const learnerContour = toSemitoneContour(track.hz, learnerMedian);
  const referenceContour = toSemitoneContour(reference.contourHz, refMedian);

  const learnerValues = spans.map((s) => syllablePitch(learnerContour, s.start, s.end, limits.minVoicedFrames));
  const referenceValues = reference.syllables.map((s) =>
    syllablePitch(referenceContour, Math.round(s.startMs / reference.hopMs), Math.round(s.endMs / reference.hopMs), limits.minVoicedFrames),
  );
  const measured = learnerValues.filter((v, i) => v !== null && referenceValues[i] !== null).length;
  const coverage = measured / spans.length;
  if (coverage < limits.minCoverage) return refuse("not_enough_voice");

  const scale = rangeScale(learnerValues, referenceValues);
  const tone = toneScore(
    learnerValues.map((v) => (v === null ? null : v * scale)),
    referenceValues,
  );
  if (tone.score === null) return refuse("not_enough_voice");
  const rhythm = rhythmScore(
    spans.map((s) => (s.end - s.start) * HOP_MS),
    reference.syllables.map((s) => s.endMs - s.startMs),
  );
  if (rhythm.score === null) return refuse("alignment_failed");

  return {
    status: "scored",
    algorithmVersion: PITCH_ALGORITHM_VERSION,
    tone: Math.round(tone.score),
    rhythm: Math.round(rhythm.score),
    overall: resonanceScore(tone.score, rhythm.score),
    coverage,
    pace: rhythm.pace,
    alignmentCost: alignment.meanCost,
    rangeScale: scale,
    syllables: reference.syllables.map((s, index) => ({
      index,
      text: s.text,
      tone: s.tone,
      marker: tone.markers[index] ?? "unmeasured",
      referenceStartMs: s.startMs,
      referenceEndMs: s.endMs,
      learnerStartMs: spans[index]!.start * HOP_MS,
      learnerEndMs: spans[index]!.end * HOP_MS,
    })),
    learnerContour,
    referenceContour,
  };
}

export { SAMPLE_RATE };
