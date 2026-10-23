/**
 * YIN fundamental-frequency estimator (de Cheveigne and Kawahara, 2002).
 * Deterministic, no model. One frame in, one estimate out.
 */
export interface YinOptions {
  readonly sampleRate: number;
  readonly minHz?: number;
  readonly maxHz?: number;
  readonly threshold?: number;
}

export interface YinResult {
  /** 0 when no pitch was found. */
  readonly hz: number;
  /** Cumulative mean normalised difference at the chosen lag. Lower is more periodic. */
  readonly aperiodicity: number;
}

export const YIN_MIN_HZ = 70;
export const YIN_MAX_HZ = 450;
export const YIN_THRESHOLD = 0.15;

export function yinFrame(frame: Float32Array, options: YinOptions): YinResult {
  const sr = options.sampleRate;
  const minHz = options.minHz ?? YIN_MIN_HZ;
  const maxHz = options.maxHz ?? YIN_MAX_HZ;
  const threshold = options.threshold ?? YIN_THRESHOLD;

  const tauMin = Math.max(2, Math.floor(sr / maxHz));
  const tauMax = Math.ceil(sr / minHz);
  const window = frame.length - tauMax;
  if (window < tauMin * 2) return { hz: 0, aperiodicity: 1 };

  // Difference function, then cumulative mean normalisation.
  const cmnd = new Float64Array(tauMax + 2);
  cmnd[0] = 1;
  let running = 0;
  for (let tau = 1; tau <= tauMax; tau += 1) {
    let sum = 0;
    for (let j = 0; j < window; j += 1) {
      const delta = frame[j]! - frame[j + tau]!;
      sum += delta * delta;
    }
    running += sum;
    cmnd[tau] = running === 0 ? 1 : (sum * tau) / running;
  }

  // First dip under the threshold, walked down to its local minimum.
  let tau = -1;
  for (let t = tauMin; t <= tauMax; t += 1) {
    if (cmnd[t]! < threshold) {
      let best = t;
      while (best + 1 <= tauMax && cmnd[best + 1]! < cmnd[best]!) best += 1;
      tau = best;
      break;
    }
  }
  if (tau === -1) {
    let best = tauMin;
    for (let t = tauMin + 1; t <= tauMax; t += 1) if (cmnd[t]! < cmnd[best]!) best = t;
    return { hz: 0, aperiodicity: cmnd[best]! };
  }

  // Parabolic interpolation around the minimum for sub-sample accuracy.
  let refined = tau;
  if (tau > 1 && tau < tauMax) {
    const s0 = cmnd[tau - 1]!;
    const s1 = cmnd[tau]!;
    const s2 = cmnd[tau + 1]!;
    const denom = 2 * (s0 - 2 * s1 + s2);
    if (denom !== 0) refined = tau + (s0 - s2) / denom;
  }
  const hz = sr / refined;
  if (hz < minHz || hz > maxHz) return { hz: 0, aperiodicity: cmnd[tau]! };
  return { hz, aperiodicity: cmnd[tau]! };
}
