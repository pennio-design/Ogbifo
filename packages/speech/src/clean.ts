import { fft } from "./mfcc";

const FRAME = 512;
const HOP = 128;

const WINDOW = (() => {
  const w = new Float64Array(FRAME);
  for (let i = 0; i < FRAME; i += 1) w[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / FRAME);
  return w;
})();

export interface CleanOptions {
  /** How much of the estimated noise to remove. Higher removes more and risks a thin voice. Default 1.8. */
  overSubtraction?: number;
  /** Lowest gain kept in any band, so nothing is cut to silence and "musical" artefacts stay faint. Default 0.12. */
  floor?: number;
}

/**
 * Treat the recording before it is analysed (D-019: runs on the device, nothing leaves).
 *
 * 1. Remove DC and rumble below about 60 Hz (below the lowest pitch we track).
 * 2. Estimate the background noise per frequency band from the quietest part of the
 *    recording itself, then reduce it (spectral subtraction with a floor and a little
 *    smoothing). A steady hiss, fan or hum goes down; a voice well above it stays.
 *
 * It never adds anything and never changes the length. Pure and deterministic. It does
 * not make an unusable recording usable: the checks for too quiet or too noisy still apply.
 */
export function cleanAudio(samples: Float32Array, options: CleanOptions = {}): Float32Array {
  const alpha = options.overSubtraction ?? 1.8;
  const floor = options.floor ?? 0.12;
  const n = samples.length;

  // 1. DC and rumble: remove the mean, then a gentle two-pole high-pass at about 60 Hz.
  let mean = 0;
  for (let i = 0; i < n; i += 1) mean += samples[i]!;
  mean /= Math.max(n, 1);
  const hp = new Float32Array(n);
  const w0 = (2 * Math.PI * 60) / 16000;
  const alphaQ = Math.sin(w0) / (2 * Math.SQRT1_2);
  const a0 = 1 + alphaQ;
  const b0 = (1 + Math.cos(w0)) / 2 / a0;
  const b1 = -(1 + Math.cos(w0)) / a0;
  const a1 = (-2 * Math.cos(w0)) / a0;
  const a2 = (1 - alphaQ) / a0;
  let x1 = 0;
  let x2 = 0;
  let y1 = 0;
  let y2 = 0;
  for (let i = 0; i < n; i += 1) {
    const x = samples[i]! - mean;
    const y = b0 * x + b1 * x1 + b0 * x2 - a1 * y1 - a2 * y2;
    hp[i] = y;
    x2 = x1;
    x1 = x;
    y2 = y1;
    y1 = y;
  }
  if (n < FRAME * 3) return hp;

  // 2. Spectral subtraction on overlapping Hann frames.
  const frames = Math.floor((n - FRAME) / HOP) + 1;
  const bins = FRAME / 2 + 1;
  const mags: Float64Array[] = [];
  const res: Float64Array[] = [];
  const ims: Float64Array[] = [];
  for (let f = 0; f < frames; f += 1) {
    const re = new Float64Array(FRAME);
    const im = new Float64Array(FRAME);
    for (let i = 0; i < FRAME; i += 1) re[i] = hp[f * HOP + i]! * WINDOW[i]!;
    fft(re, im);
    const mag = new Float64Array(bins);
    for (let k = 0; k < bins; k += 1) mag[k] = Math.hypot(re[k]!, im[k]!);
    mags.push(mag);
    res.push(re);
    ims.push(im);
  }

  // Noise per band: a low quantile of its magnitude over time (speech is not there all the time).
  const noise = new Float64Array(bins);
  const column = new Float64Array(frames);
  const q = Math.min(frames - 1, Math.floor(frames * 0.15));
  for (let k = 0; k < bins; k += 1) {
    for (let f = 0; f < frames; f += 1) column[f] = mags[f]![k]!;
    noise[k] = Array.from(column).sort((p, r) => p - r)[q]!;
  }

  const out = new Float64Array(n);
  const norm = new Float64Array(n);
  const gain = new Float64Array(bins);
  for (let f = 0; f < frames; f += 1) {
    const mag = mags[f]!;
    for (let k = 0; k < bins; k += 1) gain[k] = Math.max(floor, 1 - (alpha * noise[k]!) / Math.max(mag[k]!, 1e-12));
    const smooth = new Float64Array(bins);
    for (let k = 0; k < bins; k += 1) smooth[k] = (gain[Math.max(0, k - 1)]! + 2 * gain[k]! + gain[Math.min(bins - 1, k + 1)]!) / 4;
    const re = res[f]!;
    const im = ims[f]!;
    for (let k = 0; k < bins; k += 1) {
      re[k] = re[k]! * smooth[k]!;
      im[k] = im[k]! * smooth[k]!;
      if (k > 0 && k < FRAME / 2) {
        re[FRAME - k] = re[k]!;
        im[FRAME - k] = -im[k]!;
      }
    }
    // Inverse FFT by conjugation.
    for (let i = 0; i < FRAME; i += 1) im[i] = -im[i]!;
    fft(re, im);
    for (let i = 0; i < FRAME; i += 1) {
      const v = (re[i]! / FRAME) * WINDOW[i]!;
      out[f * HOP + i] = out[f * HOP + i]! + v;
      norm[f * HOP + i] = norm[f * HOP + i]! + WINDOW[i]! * WINDOW[i]!;
    }
  }
  const result = new Float32Array(n);
  for (let i = 0; i < n; i += 1) result[i] = norm[i]! > 1e-6 ? out[i]! / norm[i]! : hp[i]!;
  return result;
}
