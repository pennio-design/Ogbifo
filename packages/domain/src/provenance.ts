import { fail, ok, type Result } from "./result";
import { isBlank } from "./text";

/**
 * D-034. Reference audio comes only from: a speaker recorded for Ogbifọ under a
 * written licence; an existing recording with its rights holder's written
 * permission; or a CC BY or CC0 clip with attribution kept. `synthetic_test` is
 * a development tone sequence and can never be on a reviewed Card.
 */
export const REFERENCE_LICENCES = [
  "recorded_for_ogbifo",
  "written_permission",
  "cc_by",
  "cc0",
  "synthetic_test",
] as const;

export type ReferenceLicence = (typeof REFERENCE_LICENCES)[number];

export interface ReferenceProvenance {
  readonly source: string;
  readonly licence: ReferenceLicence;
  readonly rightsHolder: string;
  /** The speaker agreed in writing to this use. Required when recorded for Ogbifọ. */
  readonly speakerConsent: boolean;
  /** ISO date the recording was made or the permission was given. */
  readonly recordedOn: string;
  /** Required for CC BY: shown wherever the audio plays. */
  readonly attribution?: string;
}

export function isReferenceLicence(value: string): value is ReferenceLicence {
  return (REFERENCE_LICENCES as readonly string[]).includes(value);
}

export function validateProvenance(
  provenance: ReferenceProvenance,
  context: { reviewed: boolean },
): Result<ReferenceProvenance> {
  if (!isReferenceLicence(provenance.licence)) return fail("PROVENANCE_INVALID", "Unknown licence.", "licence");
  if (isBlank(provenance.source)) return fail("PROVENANCE_INVALID", "Say where the recording came from.", "source");
  if (isBlank(provenance.rightsHolder)) return fail("PROVENANCE_INVALID", "Name the rights holder.", "rightsHolder");
  if (Number.isNaN(Date.parse(provenance.recordedOn))) return fail("PROVENANCE_INVALID", "Give the date as an ISO date.", "recordedOn");
  if (provenance.licence === "synthetic_test" && context.reviewed) {
    return fail("PROVENANCE_INVALID", "A synthetic test recording cannot be on a reviewed Card.", "licence");
  }
  if (provenance.licence === "recorded_for_ogbifo" && !provenance.speakerConsent) {
    return fail("PROVENANCE_INVALID", "A recording made for Ogbifọ needs the speaker's written consent.", "speakerConsent");
  }
  if (provenance.licence === "cc_by" && (provenance.attribution === undefined || isBlank(provenance.attribution))) {
    return fail("PROVENANCE_INVALID", "A CC BY recording needs its attribution text.", "attribution");
  }
  return ok({ ...provenance });
}
