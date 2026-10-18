import {
  buildReferenceAnnotation,
  encodeWav,
  SPEECH_SR,
  synthSpeech,
  syllabify,
  type ReferenceAnnotation,
} from "@ogbifo/speech";

/**
 * Development only. A speech-like synthetic voice (low, robotic, with a falling
 * baseline, vowel colour and consonant onsets) reads each seed Card with its citation
 * tones, so the whole Studio and Live loop can be exercised before any real reference
 * voice exists. NOT a Yorùbá voice and not how the words are really pronounced. Shown
 * only when unreviewed content is allowed, and it can never be on a reviewed Card
 * (licence `synthetic_test`).
 */
export const DEV_REFERENCE_CARD_IDS = ["card-yo-greeting-1", "card-yo-proverb-1"] as const;
/** Kept for the greeting, which the browser tests use. */
export const DEV_REFERENCE_CARD_ID = DEV_REFERENCE_CARD_IDS[0];

export const isDevReferenceCard = (id: string): boolean => (DEV_REFERENCE_CARD_IDS as readonly string[]).includes(id);
export const devReferenceAudioUrl = (id: string): string => `/api/dev/reference-audio?card=${encodeURIComponent(id)}`;

const cache = new Map<string, { annotation: ReferenceAnnotation; wav: Uint8Array }>();

export function devReference(cardId: string, cardText: string) {
  const hit = cache.get(cardId);
  if (hit) return hit;
  const parts = syllabify(cardText).syllables;
  // Steps of 2 semitones each side of Mid (4 between High and Low): a guess at relaxed speech, to be replaced by a recorded voice.
  const voice = synthSpeech(parts, { seed: 1, toneStepSemitones: 2 });
  const built = buildReferenceAnnotation({
    samples: voice.samples,
    syllables: parts.map((p, i) => ({ text: p.text, tone: p.tone, ...voice.spans[i]! })),
  });
  if (!built.ok) throw new Error(`Development reference failed: ${built.error.message}`);
  const made = { annotation: built.value, wav: encodeWav(voice.samples, SPEECH_SR) };
  cache.set(cardId, made);
  return made;
}
