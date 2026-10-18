import { median, percentile, semitones } from "./stats";
import { yinFrame } from "./yin";

/** Bump when the pitch pipeline changes. Stored with every reference annotation. */
export const PITCH_ALGORITHM_VERSION = "ogb-pitch-2";

export const SAMPLE_RATE = 16000;
export const FRAME_MS = 40;
export const HOP_MS = 10;
const FRAME = (SAMPLE_RATE * FRAME_MS) / 1000;
const HOP = (SAMPLE_RATE * HOP_MS) / 1000;
const MEDIAN_RADIUS = 2;
const MAX_JUMP_SEMITONES = 6;
const JUMP_MEMORY_FRAMES = 3;

export interface PitchTrack {
  readonly hopMs: number;
  /** Hz per 10 ms frame, null where unvoiced. */
  readonly hz: readonly (number | null)[];
  /** RMS per frame, used for the noise floor and speech span. */
  readonly rms: readonly number[];
}

export function frameCount(sampleCount: number, frame = FRAME, hop = HOP): number {
  return sampleCount < frame ? 0 : Math.floor((sampleCount - frame) / hop) + 1;
}

export function trackPitch(samples: Float32Array): PitchTrack {
  const frames = frameCount(samples.length);
  const rms: number[] = new Array<number>(frames);
  const raw: (number | null)[] = new Array<number | null>(frames).fill(null);
  const aperiodicity: number[] = new Array<number>(frames).fill(1);
  const estimates: number[] = new Array<number>(frames).fill(0);

  for (let i = 0; i < frames; i += 1) {
    const frame = samples.subarray(i * HOP, i * HOP + FRAME);
    let sum = 0;
    for (let j = 0; j < frame.length; j += 1) sum += frame[j]! * frame[j]!;
    rms[i] = Math.sqrt(sum / frame.length);
    const result = yinFrame(frame, { sampleRate: SAMPLE_RATE });
    estimates[i] = result.hz;
    aperiodicity[i] = result.aperiodicity;
  }

  // Energy gate. The floor is the quiet end of the recording, capped so a
  // recording with no silence in it does not gate out its own speech.
  const p10 = percentile(rms, 0.1);
  const p95 = percentile(rms, 0.95);
  const floor = Math.min(p10, 0.1 * p95);
  const gate = Math.max(2 * floor, 0.05 * p95, 1e-4);
  for (let i = 0; i < frames; i += 1) {
    if (estimates[i]! > 0 && rms[i]! >= gate) raw[i] = estimates[i]!;
  }

  // 5-frame median over voiced neighbours.
  const smooth: (number | null)[] = raw.map((value, i) => {
    if (value === null) return null;
    const near: number[] = [];
    for (let k = Math.max(0, i - MEDIAN_RADIUS); k <= Math.min(frames - 1, i + MEDIAN_RADIUS); k += 1) {
      const neighbour = raw[k];
      if (neighbour !== null && neighbour !== undefined) near.push(neighbour);
    }
    return median(near);
  });

  // Reject octave-style jumps: more than 6 semitones from the last kept frame.
  let lastKept = -1;
  for (let i = 0; i < frames; i += 1) {
    const value = smooth[i];
    if (value === null || value === undefined) continue;
    if (lastKept >= 0 && i - lastKept <= JUMP_MEMORY_FRAMES) {
      const previous = smooth[lastKept]!;
      if (Math.abs(semitones(value, previous)) > MAX_JUMP_SEMITONES) {
        smooth[i] = null;
        continue;
      }
    }
    lastKept = i;
  }
  return { hopMs: HOP_MS, hz: smooth, rms };
}

/** Median voiced Hz inside [fromFrame, toFrame). NaN when nothing is voiced. */
export function medianHz(hz: readonly (number | null)[], fromFrame: number, toFrame: number): number {
  const voiced: number[] = [];
  for (let i = Math.max(0, fromFrame); i < Math.min(hz.length, toFrame); i += 1) {
    const value = hz[i];
    if (value !== null && value !== undefined) voiced.push(value);
  }
  return median(voiced);
}

/** Hz to semitones relative to a speaker's own median. Unvoiced stays null. */
export function toSemitoneContour(hz: readonly (number | null)[], referenceHz: number): (number | null)[] {
  return hz.map((value) => (value === null ? null : semitones(value, referenceHz)));
}
