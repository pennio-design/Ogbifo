import type { SVGProps } from "react";

/**
 * The Royal Seal. Geometry is copied from docs/brand/royal-seal.svg and is
 * checked against it in tests. Do not redraw or add a second loop.
 * Spokes follow `currentColor`; the loop and fulcrum are always Ochre.
 */
export const SEAL_SPOKES = [
  [83, 50, 88, 50], [80.5, 61.5, 85, 63], [72.5, 72.5, 77.5, 77.5], [61.5, 80.5, 63, 85],
  [50, 83, 50, 88], [38.5, 80.5, 37, 85], [27.5, 72.5, 22.5, 77.5], [19.5, 61.5, 15, 63],
  [17, 50, 12, 50], [19.5, 38.5, 15, 37], [27.5, 27.5, 22.5, 22.5], [38.5, 19.5, 37, 15],
  [50, 17, 50, 12], [61.5, 19.5, 63, 15], [72.5, 27.5, 77.5, 22.5], [80.5, 38.5, 85, 37],
] as const;

export const SEAL_LOOP_PATH = "M 32 50 C 32 36, 68 36, 68 50 C 68 64, 32 64, 32 50 Z";
const OCHRE = "var(--ogb-ochre, #D49B41)";

export interface RoyalSealProps extends Omit<SVGProps<SVGSVGElement>, "viewBox" | "fill"> {
  size?: number | string;
  /** Accessible name. Omit when the seal sits beside text that already names it. */
  title?: string;
}

export function RoyalSeal({ size = 48, title, ...rest }: RoyalSealProps) {
  const labelled = title !== undefined;
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      role={labelled ? "img" : undefined}
      aria-label={labelled ? title : undefined}
      aria-hidden={labelled ? undefined : true}
      focusable="false"
      {...rest}
    >
      <g stroke="currentColor" strokeWidth={3} strokeLinecap="round">
        {SEAL_SPOKES.map(([x1, y1, x2, y2]) => (
          <line key={`${x1}-${y1}`} x1={x1} y1={y1} x2={x2} y2={y2} />
        ))}
      </g>
      <path d={SEAL_LOOP_PATH} stroke={OCHRE} strokeWidth={4.5} />
      <circle cx={50} cy={50} r={5} fill={OCHRE} />
    </svg>
  );
}
