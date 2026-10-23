import type { AnnotatedSyllable } from "./annotation";
import { failResult, okResult, type SpeechResult } from "./result";
import { syllabify } from "./syllabify";

/** A region from an Audacity label track: start, end, text. */
export interface AudacityLabel {
  readonly startMs: number;
  readonly endMs: number;
  readonly text: string;
}

/**
 * Parse an exported Audacity label file (D-033): one label per line,
 * `start<TAB>end<TAB>text`, times in seconds. Lines beginning with a backslash
 * (frequency ranges Audacity may add) and blank lines are skipped.
 */
export function parseAudacityLabels(content: string): SpeechResult<AudacityLabel[]> {
  const labels: AudacityLabel[] = [];
  const lines = content.replace(/^﻿/, "").split(/\r?\n/);
  for (const [index, line] of lines.entries()) {
    if (line.trim() === "" || line.startsWith("\\")) continue;
    const parts = line.split("\t");
    if (parts.length < 3) return failResult("LABELS_INVALID", `Line ${index + 1}: expected start, end and text separated by tabs.`);
    const start = Number(parts[0]!.trim().replace(",", "."));
    const end = Number(parts[1]!.trim().replace(",", "."));
    const text = parts.slice(2).join("\t").trim();
    if (!Number.isFinite(start) || !Number.isFinite(end)) return failResult("LABELS_INVALID", `Line ${index + 1}: the times are not numbers.`);
    if (start < 0 || end <= start) return failResult("LABELS_INVALID", `Line ${index + 1}: a label must end after it starts.`);
    if (text === "") return failResult("LABELS_INVALID", `Line ${index + 1}: the label has no text.`);
    labels.push({ startMs: Math.round(start * 1000), endMs: Math.round(end * 1000), text });
  }
  if (labels.length === 0) return failResult("LABELS_INVALID", "No labels found in that file.");
  return okResult(labels.sort((a, b) => a.startMs - b.startMs));
}

/** One label is one syllable. The tone comes from the tone marks in the label text. */
export function labelsToSyllables(labels: readonly AudacityLabel[]): SpeechResult<AnnotatedSyllable[]> {
  const out: AnnotatedSyllable[] = [];
  for (const [index, label] of labels.entries()) {
    const parsed = syllabify(label.text);
    if (parsed.syllables.length !== 1) {
      return failResult("LABELS_INVALID", `Label ${index + 1} ("${label.text}") must be exactly one syllable, but it reads as ${parsed.syllables.length}.`);
    }
    out.push({ text: label.text.normalize("NFC"), tone: parsed.syllables[0]!.tone, startMs: label.startMs, endMs: label.endMs });
  }
  return okResult(out);
}

export interface TextMatch {
  readonly matches: boolean;
  readonly expected: readonly string[];
  readonly got: readonly string[];
}

/**
 * Compare a reviewer's syllables with the syllables the rules propose for the
 * Card text. A difference is not an error, because reviewers confirm or correct
 * the proposal, but the tool should show it.
 */
export function compareWithCardText(cardText: string, syllables: readonly { text: string }[]): TextMatch {
  const expected = syllabify(cardText).syllables.map((s) => s.text.normalize("NFC"));
  const got = syllables.map((s) => s.text.normalize("NFC"));
  return { matches: expected.length === got.length && expected.every((value, i) => value === got[i]), expected, got };
}
