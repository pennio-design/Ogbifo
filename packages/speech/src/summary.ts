import type { MarkerState } from "./metrics";

export const MARKER_LABELS: Record<MarkerState, string> = {
  first: "starting point",
  close: "close to the reference",
  higher: "a higher pitch step than the reference",
  lower: "a lower pitch step than the reference",
  unmeasured: "not measured",
};

export const NOT_WORDS_NOTE = "This checks the tones and timing of your reading, not the words.";

export interface StepSummary {
  readonly measured: number;
  readonly close: number;
  readonly sentence: string;
  /** Syllables whose step differed from the reference, to listen to again. */
  readonly revisit: readonly { readonly index: number; readonly direction: "higher" | "lower" }[];
}

/** A description of the markers. Not a score and not a judgement. */
export function stepSummary(markers: readonly MarkerState[]): StepSummary {
  let measured = 0;
  let close = 0;
  const revisit: { index: number; direction: "higher" | "lower" }[] = [];
  markers.forEach((marker, index) => {
    if (marker === "close") {
      measured += 1;
      close += 1;
    } else if (marker === "higher" || marker === "lower") {
      measured += 1;
      revisit.push({ index, direction: marker });
    }
  });
  const sentence =
    measured === 0
      ? "We couldn't measure the pitch steps in this reading."
      : `${close} of ${measured} pitch ${measured === 1 ? "step was" : "steps were"} close to the reference.`;
  return { measured, close, sentence, revisit };
}

/** Pace is information only. Returns null when the reading was close to the reference's speed. */
export function paceSentence(pace: number): string | null {
  if (!Number.isFinite(pace)) return null;
  if (pace > 1.15) return `You read about ${Math.round((pace - 1) * 100)}% slower than the reference.`;
  if (pace < 1 / 1.15) return `You read about ${Math.round((1 - pace) * 100)}% faster than the reference.`;
  return null;
}

/**
 * Wording for a score band. Used only while the number is shown (D-036).
 * Never says correct, wrong, perfect, authentic, native-like or accent.
 */
export function scoreSentence(overall: number): string {
  if (overall >= 80) return "Your reading followed the tones closely.";
  if (overall >= 60) return "Your reading followed most of the tones.";
  if (overall >= 40) return "Some tones differed from the reference. Listen again and try the marked syllables.";
  return "The tones differed from the reference. Listen again, then try once more.";
}
