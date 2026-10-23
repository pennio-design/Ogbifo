/**
 * Tone and Rhythm (SCORING_SPEC.md section 6). Every threshold and weight is an
 * initial value to be calibrated, not a validated fact.
 */
export const TONE_FULL_CREDIT_SEMITONES = 1.5;
export const TONE_ZERO_CREDIT_SEMITONES = 4;
export const RHYTHM_FULL_CREDIT_LOG_RATIO = 0.15;
export const RHYTHM_ZERO_CREDIT_LOG_RATIO = 0.7;
/**
 * Speakers differ in how wide their pitch moves, so the learner's pitch steps
 * are rescaled to the reference's spread before comparing, within these bounds.
 * The bounds stop a flat reading being stretched into a match. Set both to 1
 * to switch it off. Added after Sprint 3 testing showed half or 1.5x the
 * reference range dropped Tone to 70.
 */
export const RANGE_SCALE_MIN = 0.6;
export const RANGE_SCALE_MAX = 1 / 0.6;
export const WEIGHT_TONE = 0.7;
export const WEIGHT_RHYTHM = 0.3;

/** 1 up to `full`, 0 from `zero`, linear between. */
export function linearCredit(error: number, full: number, zero: number): number {
  if (error <= full) return 1;
  if (error >= zero) return 0;
  return (zero - error) / (zero - full);
}

const spread = (values: readonly number[]): number => {
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  return Math.sqrt(values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length);
};

/** Factor to apply to the learner's semitone values so their pitch spread matches the reference's, clamped. */
export function rangeScale(learner: readonly (number | null)[], reference: readonly (number | null)[]): number {
  const l: number[] = [];
  const r: number[] = [];
  for (let k = 0; k < Math.min(learner.length, reference.length); k += 1) {
    const a = learner[k];
    const b = reference[k];
    if (a !== null && a !== undefined && b !== null && b !== undefined) {
      l.push(a);
      r.push(b);
    }
  }
  if (l.length < 2) return 1;
  const ls = spread(l);
  const rs = spread(r);
  if (rs < 1e-6) return 1;
  const raw = ls < 1e-6 ? RANGE_SCALE_MAX : rs / ls;
  return Math.min(Math.max(raw, RANGE_SCALE_MIN), RANGE_SCALE_MAX);
}

export type MarkerState = "first" | "close" | "higher" | "lower" | "unmeasured";

export interface ToneResult {
  /** 0 to 100, or null when no syllable pair could be measured on both sides. */
  readonly score: number | null;
  readonly pairs: number;
  readonly markers: readonly MarkerState[];
  /** Learner interval minus reference interval, per syllable after the first. */
  readonly intervalErrors: readonly (number | null)[];
}

/**
 * Compare pitch steps between consecutive syllables. Heights are never
 * compared, only steps, so register and voice type drop out.
 */
export function toneScore(learner: readonly (number | null)[], reference: readonly (number | null)[]): ToneResult {
  const count = Math.min(learner.length, reference.length);
  const markers: MarkerState[] = new Array<MarkerState>(count).fill("unmeasured");
  const intervalErrors: (number | null)[] = [];
  let credit = 0;
  let pairs = 0;
  if (count > 0 && learner[0] !== null && reference[0] !== null) markers[0] = "first";

  for (let k = 1; k < count; k += 1) {
    const l0 = learner[k - 1];
    const l1 = learner[k];
    const r0 = reference[k - 1];
    const r1 = reference[k];
    if (l0 === null || l0 === undefined || l1 === null || l1 === undefined || r0 === null || r0 === undefined || r1 === null || r1 === undefined) {
      intervalErrors.push(null);
      continue;
    }
    const diff = l1 - l0 - (r1 - r0);
    intervalErrors.push(diff);
    markers[k] = Math.abs(diff) <= TONE_FULL_CREDIT_SEMITONES ? "close" : diff > 0 ? "higher" : "lower";
    credit += linearCredit(Math.abs(diff), TONE_FULL_CREDIT_SEMITONES, TONE_ZERO_CREDIT_SEMITONES);
    pairs += 1;
  }
  return { score: pairs === 0 ? null : (credit / pairs) * 100, pairs, markers, intervalErrors };
}

export interface RhythmResult {
  readonly score: number | null;
  /** Learner speech duration divided by reference duration. Informational, never scored. */
  readonly pace: number;
}

/** Compare each syllable's share of the whole utterance. Overall speed drops out. */
export function rhythmScore(learnerDurations: readonly number[], referenceDurations: readonly number[]): RhythmResult {
  const count = Math.min(learnerDurations.length, referenceDurations.length);
  const lTotal = learnerDurations.slice(0, count).reduce((a, b) => a + b, 0);
  const rTotal = referenceDurations.slice(0, count).reduce((a, b) => a + b, 0);
  if (count === 0 || lTotal <= 0 || rTotal <= 0) return { score: null, pace: Number.NaN };
  let credit = 0;
  for (let k = 0; k < count; k += 1) {
    const l = Math.max(learnerDurations[k]!, 1e-6) / lTotal;
    const r = Math.max(referenceDurations[k]!, 1e-6) / rTotal;
    credit += linearCredit(Math.abs(Math.log(l / r)), RHYTHM_FULL_CREDIT_LOG_RATIO, RHYTHM_ZERO_CREDIT_LOG_RATIO);
  }
  return { score: (credit / count) * 100, pace: lTotal / rTotal };
}

export function resonanceScore(tone: number, rhythm: number): number {
  return Math.round(WEIGHT_TONE * tone + WEIGHT_RHYTHM * rhythm);
}
