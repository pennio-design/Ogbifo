/**
 * Unicode helpers. Language text is stored exactly as submitted; these helpers
 * only measure, cut and compare it. Never truncate by bytes or UTF-16 units.
 */
const segmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });

export function graphemes(text: string): string[] {
  return Array.from(segmenter.segment(text), (part) => part.segment);
}

export function countGraphemes(text: string): number {
  return [...segmenter.segment(text)].length;
}

/** Cut to at most `max` user-perceived characters, the ellipsis counting as one. */
export function truncateGraphemes(text: string, max: number, ellipsis = "…"): string {
  if (max < 1) return "";
  const parts = graphemes(text);
  if (parts.length <= max) return text;
  return parts.slice(0, max - 1).join("") + ellipsis;
}

/** Comparison only. Do not store the result in place of the original text. */
export function normalizeForCompare(text: string): string {
  return text.normalize("NFC");
}

export function sameText(a: string, b: string): boolean {
  return normalizeForCompare(a) === normalizeForCompare(b);
}

export function isBlank(text: string): boolean {
  return text.trim().length === 0;
}
