import type { AttemptScored } from "./analyze";
import { HOP_MS } from "./pitch";

function stats(contour: readonly (number | null)[], fromMs: number, toMs: number) {
  const from = Math.max(0, Math.floor(fromMs / HOP_MS));
  const to = Math.min(contour.length, Math.ceil(toMs / HOP_MS));
  const frames = Math.max(1, to - from);
  const values = contour.slice(from, to).filter((v): v is number => v !== null).sort((a, b) => a - b);
  return {
    voicedPct: Math.round((values.length / frames) * 100),
    median: values.length > 0 ? values[Math.floor(values.length / 2)]! : null,
  };
}

const fixed = (v: number | null, digits = 1) => (v === null ? "  n/a" : (v >= 0 ? "+" : "") + v.toFixed(digits));

/**
 * Plain text for testers: the numbers behind a result, so a tester can paste them to
 * the builder when a reading scores strangely. Semitones are relative to each
 * speaker's own median. Shown only in development builds. Contains no audio.
 */
export function testerDetails(a: AttemptScored): string {
  const head =
    `${a.algorithmVersion} | tone ${a.tone} rhythm ${a.rhythm} overall ${a.overall} | ` +
    `coverage ${Math.round(a.coverage * 100)}% | pace ${a.pace.toFixed(2)} | alignment cost ${a.alignmentCost.toFixed(2)} | range scale ${a.rangeScale.toFixed(2)}`;
  const rows = a.syllables.map((s) => ({
    s,
    you: stats(a.learnerContour, s.learnerStartMs, s.learnerEndMs),
    ref: stats(a.referenceContour, s.referenceStartMs, s.referenceEndMs),
  }));
  const lines = ["syl      tone  you: ms         voiced  median st | ref: ms         voiced  median st"];
  for (const { s, you, ref } of rows) {
    lines.push(
      `${s.text.padEnd(8)} ${s.tone}     ` +
        `${String(Math.round(s.learnerStartMs)).padStart(5)}-${String(Math.round(s.learnerEndMs)).padEnd(5)}  ${String(you.voicedPct).padStart(4)}%  ${fixed(you.median).padStart(8)}  | ` +
        `${String(Math.round(s.referenceStartMs)).padStart(5)}-${String(Math.round(s.referenceEndMs)).padEnd(5)}  ${String(ref.voicedPct).padStart(4)}%  ${fixed(ref.median).padStart(8)}`,
    );
  }
  lines.push("", "pitch steps between neighbouring syllables, in semitones (you are shown before the range scale):");
  for (let i = 1; i < rows.length; i += 1) {
    const prev = rows[i - 1]!;
    const cur = rows[i]!;
    if (prev.you.median === null || cur.you.median === null || prev.ref.median === null || cur.ref.median === null) {
      lines.push(`${prev.s.text} to ${cur.s.text}: not measured on both sides`);
      continue;
    }
    const refStep = cur.ref.median - prev.ref.median;
    const youStep = cur.you.median - prev.you.median;
    lines.push(`${prev.s.text} to ${cur.s.text}: reference ${fixed(refStep)}  you ${fixed(youStep)}  scaled ${fixed(youStep * a.rangeScale)}  difference ${fixed(youStep * a.rangeScale - refStep)}`);
  }
  return `${head}\n${lines.join("\n")}`;
}
