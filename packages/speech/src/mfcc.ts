import { SAMPLE_RATE } from "./pitch";

export const MFCC_DIMS = 13;
const WIN = 400; // 25 ms
const HOP = 160; // 10 ms
const FFT_SIZE = 512;
const FILTERS = 26;
const LOW_HZ = 80;
const HIGH_HZ = 7600;
const PREEMPHASIS = 0.97;

const hz2mel = (hz: number) => 2595 * Math.log10(1 + hz / 700);
const mel2hz = (mel: number) => 700 * (10 ** (mel / 2595) - 1);

function fft(re: Float64Array, im: Float64Array): void {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i += 1) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      [re[i], re[j]] = [re[j]!, re[i]!];
      [im[i], im[j]] = [im[j]!, im[i]!];
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const angle = (-2 * Math.PI) / len;
    const wr = Math.cos(angle);
    const wi = Math.sin(angle);
    for (let i = 0; i < n; i += len) {
      let cr = 1;
      let ci = 0;
      for (let k = 0; k < len / 2; k += 1) {
        const a = i + k;
        const b = a + len / 2;
        const tr = re[b]! * cr - im[b]! * ci;
        const ti = re[b]! * ci + im[b]! * cr;
        re[b] = re[a]! - tr;
        im[b] = im[a]! - ti;
        re[a] = re[a]! + tr;
        im[a] = im[a]! + ti;
        const nr = cr * wr - ci * wi;
        ci = cr * wi + ci * wr;
        cr = nr;
      }
    }
  }
}

let filterbank: Float64Array[] | null = null;
function getFilterbank(): Float64Array[] {
  if (filterbank) return filterbank;
  const bins = FFT_SIZE / 2 + 1;
  const points: number[] = [];
  const lo = hz2mel(LOW_HZ);
  const hi = hz2mel(HIGH_HZ);
  for (let i = 0; i < FILTERS + 2; i += 1) points.push(Math.floor(((FFT_SIZE + 1) * mel2hz(lo + ((hi - lo) * i) / (FILTERS + 1))) / SAMPLE_RATE));
  const bank: Float64Array[] = [];
  for (let m = 1; m <= FILTERS; m += 1) {
    const f = new Float64Array(bins);
    const [l, c, r] = [points[m - 1]!, points[m]!, points[m + 1]!];
    for (let k = l; k < c; k += 1) f[k] = c === l ? 0 : (k - l) / (c - l);
    for (let k = c; k < r; k += 1) f[k] = r === c ? 0 : (r - k) / (r - c);
    bank.push(f);
  }
  filterbank = bank;
  return bank;
}

const window = Float64Array.from({ length: WIN }, (_, i) => 0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (WIN - 1)));

/** Raw 13-dimensional MFCCs, one frame per 10 ms (25 ms window). */
export function computeMfcc(samples: Float32Array): Float64Array[] {
  const frames = samples.length < WIN ? 0 : Math.floor((samples.length - WIN) / HOP) + 1;
  const bank = getFilterbank();
  const out: Float64Array[] = [];
  const re = new Float64Array(FFT_SIZE);
  const im = new Float64Array(FFT_SIZE);
  const logMel = new Float64Array(FILTERS);

  for (let f = 0; f < frames; f += 1) {
    re.fill(0);
    im.fill(0);
    const start = f * HOP;
    for (let i = 0; i < WIN; i += 1) {
      const prev = i === 0 ? samples[start]! : samples[start + i - 1]!;
      re[i] = (samples[start + i]! - PREEMPHASIS * prev) * window[i]!;
    }
    fft(re, im);
    for (let m = 0; m < FILTERS; m += 1) {
      let energy = 0;
      const filter = bank[m]!;
      for (let k = 0; k <= FFT_SIZE / 2; k += 1) energy += filter[k]! * (re[k]! * re[k]! + im[k]! * im[k]!);
      logMel[m] = Math.log(energy + 1e-10);
    }
    const c = new Float64Array(MFCC_DIMS);
    for (let n = 0; n < MFCC_DIMS; n += 1) {
      let sum = 0;
      for (let m = 0; m < FILTERS; m += 1) sum += logMel[m]! * Math.cos((Math.PI * n * (m + 0.5)) / FILTERS);
      c[n] = sum;
    }
    out.push(c);
  }
  return out;
}

/** Cepstral mean and variance normalisation over the given frames. */
export function normalizeCepstra(frames: readonly Float64Array[]): Float64Array[] {
  if (frames.length === 0) return [];
  const mean = new Float64Array(MFCC_DIMS);
  for (const frame of frames) for (let d = 0; d < MFCC_DIMS; d += 1) mean[d] = mean[d]! + frame[d]! / frames.length;
  const std = new Float64Array(MFCC_DIMS);
  for (const frame of frames) for (let d = 0; d < MFCC_DIMS; d += 1) std[d] = std[d]! + (frame[d]! - mean[d]!) ** 2 / frames.length;
  for (let d = 0; d < MFCC_DIMS; d += 1) std[d] = Math.max(Math.sqrt(std[d]!), 1e-3);
  return frames.map((frame) => Float64Array.from(frame, (v, d) => (v - mean[d]!) / std[d]!));
}
