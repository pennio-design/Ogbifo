export interface DtwAlignment {
  /** For each reference frame, the first and last learner frame matched to it. */
  readonly first: Int32Array;
  readonly last: Int32Array;
  /** Mean local cost along the path. Lower is a closer match. */
  readonly meanCost: number;
}

export const DTW_STEP_PENALTY = 0.3;
export const DTW_MAX_CELLS = 6_000_000;

function distance(a: Float64Array, b: Float64Array): number {
  let sum = 0;
  for (let d = 0; d < a.length; d += 1) {
    const delta = a[d]! - b[d]!;
    sum += delta * delta;
  }
  return Math.sqrt(sum);
}

/**
 * Dynamic time warping with an open start and end on the learner side, so
 * leading and trailing silence in the learner's recording does not matter. The
 * reference is trimmed to its speech, so it is matched end to end.
 */
export interface DtwOptions {
  readonly penalty?: number;
  /** The path must start within the first this-many learner frames. Default: anywhere. */
  readonly startWindow?: number;
  /** The path must end within the last this-many learner frames. Default: anywhere. */
  readonly endWindow?: number;
}

export function alignOpenEnded(
  reference: readonly Float64Array[],
  learner: readonly Float64Array[],
  options: DtwOptions = {},
): DtwAlignment | null {
  const penalty = options.penalty ?? DTW_STEP_PENALTY;
  const n = reference.length;
  const m = learner.length;
  if (n === 0 || m === 0 || n * m > DTW_MAX_CELLS) return null;

  const cost = new Float32Array(n * m);
  const from = new Uint8Array(n * m); // 0 diagonal, 1 vertical (reference advances), 2 horizontal
  const at = (i: number, j: number) => i * m + j;

  const startLimit = Math.min(options.startWindow ?? m, m);
  const endFrom = Math.max(m - (options.endWindow ?? m), 0);
  for (let j = 0; j < m; j += 1) cost[at(0, j)] = j < startLimit ? distance(reference[0]!, learner[j]!) : Number.POSITIVE_INFINITY;
  for (let i = 1; i < n; i += 1) {
    for (let j = 0; j < m; j += 1) {
      const local = distance(reference[i]!, learner[j]!);
      let best = cost[at(i - 1, j)]! + penalty;
      let step = 1;
      if (j > 0) {
        const diagonal = cost[at(i - 1, j - 1)]!;
        if (diagonal <= best) {
          best = diagonal;
          step = 0;
        }
        const horizontal = cost[at(i, j - 1)]! + penalty;
        if (horizontal < best) {
          best = horizontal;
          step = 2;
        }
      }
      cost[at(i, j)] = local + best;
      from[at(i, j)] = step;
    }
  }

  let endJ = endFrom;
  for (let j = endFrom + 1; j < m; j += 1) if (cost[at(n - 1, j)]! < cost[at(n - 1, endJ)]!) endJ = j;
  if (!Number.isFinite(cost[at(n - 1, endJ)]!)) return null;

  const first = new Int32Array(n).fill(-1);
  const last = new Int32Array(n).fill(-1);
  let i = n - 1;
  let j = endJ;
  let steps = 0;
  let total = 0;
  for (;;) {
    if (last[i]! < 0) last[i] = j;
    first[i] = j;
    total += distance(reference[i]!, learner[j]!);
    steps += 1;
    if (i === 0 && (j === 0 || from[at(i, j)] !== 2)) break;
    const step = i === 0 ? 2 : from[at(i, j)]!;
    if (step === 0) {
      i -= 1;
      j -= 1;
    } else if (step === 1) {
      i -= 1;
    } else {
      j -= 1;
    }
    if (j < 0) break;
  }
  return { first, last, meanCost: total / steps };
}
