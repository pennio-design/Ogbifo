/**
 * D-036: the Resonance Score number stays hidden until calibration passes
 * (SCORING_SPEC.md section 10). Turn on with NEXT_PUBLIC_SHOW_RESONANCE_NUMBER=1.
 * Read at build time. Studio never shows a number whatever this says (D-024).
 */
export const showResonanceNumber = process.env.NEXT_PUBLIC_SHOW_RESONANCE_NUMBER === "1";
