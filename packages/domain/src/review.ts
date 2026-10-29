import { resolveDialect, type DialectRegister } from "./dialect";
import { isBlank } from "./text";

export interface Finding {
  readonly code: string;
  readonly message: string;
}

export interface Reviewer {
  readonly name: string;
  readonly dialects: readonly string[];
}

export interface ReviewSlot {
  readonly name: string;
  /** What the sheet says this reviewer speaks: register ids or names, separated by ; or /. */
  readonly dialects: string;
}

export const personKey = (name: string) => name.normalize("NFC").trim().replace(/\s+/g, " ").toLowerCase();

/**
 * The sign-off rule shared by lexicon entries and Cards (D-012, D-043): two different
 * people, neither the contributor, each speaking the dialect, and a real review date.
 * Findings are appended to `errors` and `warnings`; the result says who counts.
 */
export function checkReview(input: {
  contributor: string;
  /** Register id of the entry's dialect, or null when it is missing or unknown. */
  dialect: string | null;
  register: DialectRegister;
  slots: readonly ReviewSlot[];
  reviewedOn: string;
  errors: Finding[];
  warnings: Finding[];
}): { reviewers: Reviewer[]; reviewedOn: string | null; signed: boolean } {
  const { errors, warnings, register, dialect } = input;
  const reviewers: Reviewer[] = [];

  input.slots.forEach((slot, index) => {
    const n = index + 1;
    if (isBlank(slot.name)) {
      if (!isBlank(slot.dialects)) errors.push({ code: "REVIEWER_NAME_MISSING", message: `reviewer_${n}_dialect is filled but reviewer_${n} is empty.` });
      return;
    }
    const spoken = slot.dialects
      .split(/[;/]/)
      .map((d) => resolveDialect(register, d))
      .filter((d): d is string => d !== null);
    if (isBlank(slot.dialects) || spoken.length === 0) {
      errors.push({ code: "REVIEWER_DIALECT_MISSING", message: `Say which dialect reviewer ${n} (${slot.name.trim()}) speaks, using the register.` });
      return;
    }
    if (dialect !== null && !spoken.includes(dialect)) {
      errors.push({ code: "REVIEWER_DIALECT_MISMATCH", message: `${slot.name.trim()} does not speak this entry's dialect, so cannot review it.` });
      return;
    }
    if (personKey(slot.name) === personKey(input.contributor)) {
      errors.push({ code: "REVIEWER_IS_CONTRIBUTOR", message: `${slot.name.trim()} contributed this and cannot also review it.` });
      return;
    }
    reviewers.push({ name: slot.name.trim(), dialects: spoken });
  });

  if (reviewers.length === 2 && personKey(reviewers[0]!.name) === personKey(reviewers[1]!.name)) {
    errors.push({ code: "SAME_REVIEWER_TWICE", message: "The same person is listed as both reviewers. Two different people are needed." });
    reviewers.pop();
  }

  let reviewedOn: string | null = null;
  let dateInvalid = false;
  if (!isBlank(input.reviewedOn)) {
    reviewedOn = input.reviewedOn.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(reviewedOn) || Number.isNaN(Date.parse(reviewedOn))) {
      errors.push({ code: "REVIEWED_ON_INVALID", message: "reviewed_on must be a date like 2026-10-31." });
      reviewedOn = null;
      dateInvalid = true;
    }
  }
  const signed = reviewers.length === 2;
  if (signed && reviewedOn === null && !dateInvalid) {
    errors.push({ code: "REVIEWED_ON_MISSING", message: "Two reviewers are listed. Add the date they reviewed it." });
  }
  if (reviewers.length === 1) warnings.push({ code: "NEEDS_SECOND_REVIEWER", message: "Only one reviewer so far. A second is needed before this is Reviewed." });
  if (reviewers.length === 0 && !isBlank(input.reviewedOn)) {
    warnings.push({ code: "DATE_WITHOUT_REVIEWERS", message: "reviewed_on is set but there are no reviewers." });
  }
  return { reviewers, reviewedOn, signed: signed && reviewedOn !== null };
}
