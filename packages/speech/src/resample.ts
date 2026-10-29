import { SAMPLE_RATE } from "./pitch";

/**
 * Resample mono audio to 16 kHz: windowed-sinc low-pass below the new Nyquist,
 * then linear interpolation. Enough for pitch and spectral analysis.
 */
export function resampleTo16k(samples: Float32Array, sampleRate: number): Float32Array {
  if (sampleRate === SAMPLE_RATE) return samples;
  if (sampleRate < SAMPLE_RATE) throw new Error(`Sample rate ${sampleRate} is below ${SAMPLE_RATE}`);

  const ratio = sampleRate / SAMPLE_RATE;
  const cutoff = 0.45 / ratio; // fraction of the input rate, just under 8 kHz
  const taps = 63;
  const half = (taps - 1) / 2;
  const kernel = new Float64Array(taps);
  let norm = 0;
  for (let i = 0; i < taps; i += 1) {
    const x = i - half;
    const sinc = x === 0 ? 2 * cutoff : Math.sin(2 * Math.PI * cutoff * x) / (Math.PI * x);
    const hamming = 0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (taps - 1));
    kernel[i] = sinc * hamming;
    norm += kernel[i]!;
  }
  for (let i = 0; i < taps; i += 1) kernel[i] = kernel[i]! / norm;

  const filtered = new Float32Array(samples.length);
  for (let n = 0; n < samples.length; n += 1) {
    let acc = 0;
    for (let k = 0; k < taps; k += 1) {
      const idx = n + k - half;
      if (idx >= 0 && idx < samples.length) acc += samples[idx]! * kernel[k]!;
    }
    filtered[n] = acc;
  }

  const outLength = Math.floor(samples.length / ratio);
  const out = new Float32Array(outLength);
  for (let i = 0; i < outLength; i += 1) {
    const pos = i * ratio;
    const lo = Math.floor(pos);
    const frac = pos - lo;
    const a = filtered[lo]!;
    const b = filtered[Math.min(lo + 1, filtered.length - 1)]!;
    out[i] = a + (b - a) * frac;
  }
  return out;
}
