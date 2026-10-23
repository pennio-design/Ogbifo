import { HOP_MS, trackPitch } from "./pitch";
import { percentile } from "./stats";
import type { AnnotatedSyllable } from "./annotation";
import type { Tone } from "./syllabify";

export interface SpeechSpan {
  readonly startMs: number;
  readonly endMs: number;
}

/**
 * Where the speech is in a 16 kHz recording: the first and last frames well
 * above the quiet end. Used to start the annotation tool near the right place.
 */
export function detectSpeechSpan(samples: Float32Array): SpeechSpan | null {
  const { rms } = trackPitch(samples);
  if (rms.length === 0) return null;
  const gate = Math.max(0.05 * percentile(rms, 0.95), 1e-4);
  let first = -1;
  let last = -1;
  for (let i = 0; i < rms.length; i += 1) {
    if (rms[i]! >= gate) {
      if (first < 0) first = i;
      last = i;
    }
  }
  if (first < 0) return null;
  return { startMs: first * HOP_MS, endMs: (last + 1) * HOP_MS };
}

/** A starting guess: divide the speech evenly among the syllables. The reviewer then moves the boundaries. */
export function proposeSyllables(
  span: SpeechSpan,
  syllables: readonly { text: string; tone: Tone }[],
): AnnotatedSyllable[] {
  const width = (span.endMs - span.startMs) / syllables.length;
  return syllables.map((s, i) => ({
    text: s.text,
    tone: s.tone,
    startMs: Math.round(span.startMs + i * width),
    endMs: Math.round(span.startMs + (i + 1) * width),
  }));
}
