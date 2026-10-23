import { MARKER_LABELS, type Overlay } from "@ogbifo/speech";

const W = 600;
const H = 200;
const PAD = { left: 8, right: 8, top: 12, bottom: 12 };

const path = (runs: Overlay["reference"], yMin: number, yMax: number) =>
  runs
    .filter((run) => run.length > 1)
    .map((run) =>
      run
        .map((p, i) => {
          const x = PAD.left + p.x * (W - PAD.left - PAD.right);
          const y = PAD.top + (1 - (p.y - yMin) / (yMax - yMin)) * (H - PAD.top - PAD.bottom);
          return `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`;
        })
        .join(" "),
    )
    .join(" ");

/**
 * The reference and the learner's pitch on one time axis. Syllables are shaded
 * in turn. Colour is never the only cue: the list under it names each syllable's
 * marker in words.
 */
export function ContourChart({ overlay }: { overlay: Overlay }) {
  const x = (v: number) => PAD.left + v * (W - PAD.left - PAD.right);
  return (
    <figure>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label="Pitch of the reference and of your reading, aligned syllable by syllable. The list below describes each step in words."
        className="h-auto w-full"
      >
        {overlay.syllables.map((s) => (
          <rect
            key={s.index}
            x={x(s.x0)}
            y={0}
            width={Math.max(x(s.x1) - x(s.x0), 1)}
            height={H}
            fill="currentColor"
            className={s.index % 2 === 0 ? "text-bone/[0.04]" : "text-bone/[0.08]"}
          />
        ))}
        <path d={path(overlay.reference, overlay.yMin, overlay.yMax)} fill="none" stroke="currentColor" strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" className="text-bone/30" />
        <path d={path(overlay.learner, overlay.yMin, overlay.yMax)} fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" className="text-ochre" />
      </svg>
      <figcaption className="mt-3 flex flex-wrap gap-x-6 gap-y-1 font-ui text-xs text-ash">
        <span><span aria-hidden="true" className="mr-2 inline-block h-0 w-6 border-t-[7px] border-bone/30 align-middle" />Reference</span>
        <span><span aria-hidden="true" className="mr-2 inline-block h-0 w-6 border-t-[3px] border-ochre align-middle" />Your reading</span>
      </figcaption>
    </figure>
  );
}

export const markerSymbol = { first: "•", close: "=", higher: "▲", lower: "▼", unmeasured: "?" } as const;
export { MARKER_LABELS };
