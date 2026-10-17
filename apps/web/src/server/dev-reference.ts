import {
  buildReferenceAnnotation,
  encodeWav,
  KAAARO,
  SR,
  synthUtterance,
  syllabify,
  type ReferenceAnnotation,
} from "@ogbifo/speech";

/**
 * Development only. A synthetic tone sequence with the tones of "Ẹ káàárọ̀"
 * (Mid High Low High Low), so the whole Studio and Live loop can be exercised
 * before any real reference voice exists. NOT a Yorùbá voice. Shown only when
 * unreviewed content is allowed, and it can never be on a reviewed Card
 * (licence `synthetic_test`).
 */
export const DEV_REFERENCE_CARD_ID = "card-yo-greeting-1";
export const DEV_REFERENCE_AUDIO_URL = "/api/dev/reference-audio";

let cached: { annotation: ReferenceAnnotation; wav: Uint8Array } | undefined;

export function devReference(cardText: string) {
  if (cached) return cached;
  const voice = synthUtterance(KAAARO, { seed: 1, baseHz: 120 });
  const parts = syllabify(cardText).syllables;
  const built = buildReferenceAnnotation({
    samples: voice.samples,
    syllables: parts.map((p, i) => ({ text: p.text, tone: p.tone, ...voice.spans[i]! })),
  });
  if (!built.ok) throw new Error(`Development reference failed: ${built.error.message}`);
  cached = { annotation: built.value, wav: encodeWav(voice.samples, SR) };
  return cached;
}
