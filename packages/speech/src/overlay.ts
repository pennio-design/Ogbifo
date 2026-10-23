import type { AttemptScored } from "./analyze";
import type { ReferenceAnnotation } from "./annotation";
import type { MarkerState } from "./metrics";
import { HOP_MS } from "./pitch";
import type { Tone } from "./syllabify";

export interface OverlayPoint {
  /** 0 to 1 along the reference's speech. */
  readonly x: number;
  /** Semitones from the speaker's own median. */
  readonly y: number;
}

export interface OverlaySyllable {
  readonly index: number;
  readonly text: string;
  readonly tone: Tone;
  readonly marker: MarkerState;
  readonly x0: number;
  readonly x1: number;
}

export interface Overlay {
  /** Runs of connected points. A gap (unvoiced) starts a new run. */
  readonly reference: readonly (readonly OverlayPoint[])[];
  readonly learner: readonly (readonly OverlayPoint[])[];
  readonly syllables: readonly OverlaySyllable[];
  readonly yMin: number;
  readonly yMax: number;
}

/**
 * Put the learner's contour on the reference's time axis by stretching each
 * learner syllable onto the matching reference syllable. Both contours are then
 * comparable by eye, whatever the learner's speed. The learner's pitch is drawn
 * with the same range correction the Tone score used.
 */
export function buildOverlay(analysis: AttemptScored, annotation: ReferenceAnnotation): Overlay {
  const first = annotation.syllables[0]!;
  const last = annotation.syllables[annotation.syllables.length - 1]!;
  const total = last.endMs - first.startMs;
  const xOf = (ms: number) => (ms - first.startMs) / total;

  const reference: OverlayPoint[][] = [];
  const learner: OverlayPoint[][] = [];
  let refRun: OverlayPoint[] = [];
  let learnerRun: OverlayPoint[] = [];
  const flush = () => {
    if (refRun.length > 0) reference.push(refRun);
    if (learnerRun.length > 0) learner.push(learnerRun);
    refRun = [];
    learnerRun = [];
  };
  const ys: number[] = [];
  const scale = analysis.rangeScale;

  const startFrame = Math.ceil(first.startMs / HOP_MS);
  const endFrame = Math.floor(last.endMs / HOP_MS);
  for (let frame = startFrame; frame < endFrame; frame += 1) {
    const ms = frame * HOP_MS;
    const k = analysis.syllables.findIndex((s) => ms >= s.referenceStartMs && ms < s.referenceEndMs);
    if (k < 0) {
      flush();
      continue;
    }
    const s = analysis.syllables[k]!;
    const x = xOf(ms);
    const referenceValue = analysis.referenceContour[frame];
    if (referenceValue === null || referenceValue === undefined) {
      if (refRun.length > 0) reference.push(refRun);
      refRun = [];
    } else {
      refRun.push({ x, y: referenceValue });
      ys.push(referenceValue);
    }
    const fraction = (ms - s.referenceStartMs) / (s.referenceEndMs - s.referenceStartMs);
    const learnerMs = s.learnerStartMs + fraction * (s.learnerEndMs - s.learnerStartMs);
    const learnerValue = analysis.learnerContour[Math.round(learnerMs / HOP_MS)];
    if (learnerValue === null || learnerValue === undefined) {
      if (learnerRun.length > 0) learner.push(learnerRun);
      learnerRun = [];
    } else {
      const y = learnerValue * scale;
      learnerRun.push({ x, y });
      ys.push(y);
    }
  }
  flush();

  const low = ys.length > 0 ? Math.min(...ys) : -3;
  const high = ys.length > 0 ? Math.max(...ys) : 3;
  const centre = (low + high) / 2;
  const half = Math.max((high - low) / 2 + 1, 3);
  return {
    reference,
    learner,
    syllables: analysis.syllables.map((s) => ({
      index: s.index,
      text: s.text,
      tone: s.tone,
      marker: s.marker,
      x0: xOf(s.referenceStartMs),
      x1: xOf(s.referenceEndMs),
    })),
    yMin: centre - half,
    yMax: centre + half,
  };
}
