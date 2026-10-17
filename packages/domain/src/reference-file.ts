import type { ReferenceAnnotation } from "@ogbifo/speech";
import { createCard, type Card } from "./card";
import { validateProvenance, type ReferenceProvenance } from "./provenance";
import { fail, ok, type Result } from "./result";
import { isBlank } from "./text";

/**
 * What the reviewer annotation tool downloads (D-033) and the app loads. The
 * audio file is placed in public/references and this JSON in content/references.
 */
export interface ReferenceFile {
  readonly cardId: string;
  readonly audioUrl: string;
  readonly annotation: ReferenceAnnotation;
  readonly provenance: ReferenceProvenance;
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const AUDIO_EXTENSIONS = ["wav", "mp3", "m4a", "ogg", "webm", "flac"];

export function audioExtension(filename: string): string | null {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  return AUDIO_EXTENSIONS.includes(ext) ? ext : null;
}

export const referenceJsonName = (cardId: string) => `${cardId}.json`;
export const referenceAudioUrl = (cardId: string, extension: string) => `/references/${cardId}.${extension}`;

function checkAnnotation(a: unknown): string | null {
  if (!isRecord(a)) return "The annotation is missing.";
  if (typeof a.algorithmVersion !== "string" || a.algorithmVersion === "") return "The annotation has no algorithm version.";
  if (typeof a.hopMs !== "number" || typeof a.durationMs !== "number") return "The annotation has no timing.";
  if (!Array.isArray(a.syllables) || a.syllables.length < 2) return "The annotation needs at least two syllables.";
  let previousEnd = 0;
  for (const [i, s] of (a.syllables as unknown[]).entries()) {
    if (!isRecord(s) || typeof s.text !== "string" || isBlank(s.text) || !["H", "M", "L"].includes(String(s.tone))) return `Syllable ${i + 1} is malformed.`;
    if (typeof s.startMs !== "number" || typeof s.endMs !== "number" || !(s.endMs > s.startMs) || s.startMs < previousEnd) return `Syllable ${i + 1} has bad times.`;
    previousEnd = s.endMs;
  }
  if (!Array.isArray(a.contourHz) || a.contourHz.some((v) => v !== null && typeof v !== "number")) return "The pitch contour is malformed.";
  if (!Array.isArray(a.mfcc) || a.mfcc.length === 0 || a.mfcc.some((f) => !Array.isArray(f) || f.length !== 13 || f.some((x) => typeof x !== "number"))) {
    return "The spectral features are malformed.";
  }
  return null;
}

export function parseReferenceFile(input: unknown): Result<ReferenceFile> {
  if (!isRecord(input)) return fail("REFERENCE_FILE_INVALID", "The file is not a reference file.");
  if (typeof input.cardId !== "string" || isBlank(input.cardId)) return fail("REFERENCE_FILE_INVALID", "The file names no Card.", "cardId");
  if (typeof input.audioUrl !== "string" || !input.audioUrl.startsWith("/")) return fail("REFERENCE_FILE_INVALID", "The audio location must start with a slash.", "audioUrl");
  const problem = checkAnnotation(input.annotation);
  if (problem) return fail("REFERENCE_FILE_INVALID", problem, "annotation");
  if (!isRecord(input.provenance)) return fail("REFERENCE_FILE_INVALID", "The provenance record is missing.", "provenance");
  const provenance = validateProvenance(input.provenance as unknown as ReferenceProvenance, { reviewed: false });
  if (!provenance.ok) return fail(provenance.error.code, provenance.error.message, "provenance");
  return ok({
    cardId: input.cardId,
    audioUrl: input.audioUrl,
    annotation: input.annotation as ReferenceAnnotation,
    provenance: provenance.value,
  });
}

/**
 * Attach a reference file to its Card, through the same validation as any other
 * Card edit. Either all of it applies or none of it does.
 */
export function attachReference(card: Card, file: ReferenceFile): Result<Card> {
  if (file.cardId !== card.id) return fail("REFERENCE_FILE_INVALID", `The file is for ${file.cardId}, not ${card.id}.`, "cardId");
  return createCard({
    ...card,
    referenceAudioUrl: file.audioUrl,
    referenceAnnotation: file.annotation,
    referenceProvenance: file.provenance,
  });
}
