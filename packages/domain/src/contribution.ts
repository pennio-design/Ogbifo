import {
  ARCHIVE_LICENCE_GRANT,
  CONSENT_VERSION,
  RIGHTS_DECLARATIONS,
  type ConsentRecord,
  type LicenceGrant,
  type RetentionPolicy,
  type RightsDeclaration,
} from "./consent";
import { fail, ok, type Result } from "./result";
import { countGraphemes, isBlank } from "./text";

/** Text only for now. Audio, video and links need speaker consent handling (OPEN_CONFLICTS #20). */
export type ContributionKind = "phrase" | "proverb" | "greeting" | "lyric";
export const CONTRIBUTION_KINDS: readonly ContributionKind[] = ["phrase", "proverb", "greeting", "lyric"];

/** `peer_verified` is shown as "Peer confirmed". It is never "Reviewed" (D-021). */
export type VerificationStatus = "pending_review" | "peer_verified" | "flagged" | "rejected";

export const PEER_THRESHOLD = 5;

export interface Verification {
  readonly status: VerificationStatus;
  readonly peerConfirmations: number;
  readonly peerThreshold: number;
  readonly verifiedAt: string | null;
}

export const LIMITS = {
  contentGraphemes: 1000,
  dialectGraphemes: 60,
  rightsNoteGraphemes: 300,
  tags: 8,
  tagGraphemes: 40,
} as const;

export interface Contribution {
  readonly id: string;
  /** Idempotency key for sync. */
  readonly clientId: string;
  /** Null until accounts exist (OPEN_CONFLICTS #20). */
  readonly userId: string | null;
  readonly type: "text";
  readonly kind: ContributionKind;
  readonly languageId: string;
  readonly dialect: string | null;
  /** Exactly as submitted. Never normalised in storage. */
  readonly contentText: string;
  readonly contextTags: readonly string[];
  readonly consentVersion: string;
  readonly consentAcceptedAt: string;
  readonly licenceGrant: LicenceGrant;
  readonly rightsDeclaration: RightsDeclaration;
  readonly rightsNote: string | null;
  /** Null for text. Required before any audio contribution exists. */
  readonly speakerConsentForAudio: null;
  readonly retentionPolicy: RetentionPolicy;
  readonly createdAt: string;
  readonly withdrawnAt: string | null;
  readonly verification: Verification;
}

export interface ContributionInput {
  readonly id: string;
  readonly clientId: string;
  readonly userId: string | null;
  readonly kind: ContributionKind;
  readonly languageId: string;
  readonly dialect?: string | undefined;
  readonly contentText: string;
  readonly contextTags?: readonly string[] | undefined;
  readonly consent: ConsentRecord | null;
  readonly rightsDeclaration: RightsDeclaration | null;
  readonly rightsNote?: string | undefined;
  readonly createdAt: string;
}

const rightsNoteRequired = (kind: ContributionKind, rights: RightsDeclaration) =>
  rights !== "own_work" || kind === "lyric";

export function createContribution(input: ContributionInput): Result<Contribution> {
  if (isBlank(input.id) || isBlank(input.clientId)) {
    return fail("CONTRIBUTION_INVALID", "A contribution needs an id.", "clientId");
  }
  if (!CONTRIBUTION_KINDS.includes(input.kind)) {
    return fail("CONTRIBUTION_INVALID", "Choose what you are adding.", "kind");
  }
  if (isBlank(input.languageId)) return fail("CONTRIBUTION_INVALID", "Choose a language.", "languageId");
  if (isBlank(input.contentText)) return fail("CONTRIBUTION_INVALID", "Write what you want to add.", "contentText");
  if (countGraphemes(input.contentText) > LIMITS.contentGraphemes) {
    return fail("CONTRIBUTION_INVALID", `Keep it to ${LIMITS.contentGraphemes} characters or fewer.`, "contentText");
  }

  const dialect = input.dialect === undefined || isBlank(input.dialect) ? null : input.dialect.trim();
  if (dialect !== null && countGraphemes(dialect) > LIMITS.dialectGraphemes) {
    return fail("CONTRIBUTION_INVALID", "The dialect name is too long.", "dialect");
  }

  const tags: string[] = [];
  for (const raw of input.contextTags ?? []) {
    const tag = raw.trim();
    if (tag === "") continue;
    if (countGraphemes(tag) > LIMITS.tagGraphemes) {
      return fail("CONTRIBUTION_INVALID", "A context tag is too long.", "contextTags");
    }
    if (!tags.includes(tag)) tags.push(tag);
  }
  if (tags.length > LIMITS.tags) {
    return fail("CONTRIBUTION_INVALID", `Use at most ${LIMITS.tags} context tags.`, "contextTags");
  }

  if (input.consent === null || input.consent.version !== CONSENT_VERSION || isBlank(input.consent.acceptedAt)) {
    return fail("CONSENT_REQUIRED", "Agree to the licence before adding to the Archive.", "consent");
  }
  if (input.rightsDeclaration === null || !RIGHTS_DECLARATIONS.includes(input.rightsDeclaration)) {
    return fail("RIGHTS_REQUIRED", "Say whose this is.", "rightsDeclaration");
  }

  const note = input.rightsNote === undefined || isBlank(input.rightsNote) ? null : input.rightsNote.trim();
  if (note === null && rightsNoteRequired(input.kind, input.rightsDeclaration)) {
    return fail("RIGHTS_REQUIRED", "Say who holds the rights, or where it comes from.", "rightsNote");
  }
  if (note !== null && countGraphemes(note) > LIMITS.rightsNoteGraphemes) {
    return fail("CONTRIBUTION_INVALID", "The rights note is too long.", "rightsNote");
  }

  return ok({
    id: input.id,
    clientId: input.clientId,
    userId: input.userId,
    type: "text",
    kind: input.kind,
    languageId: input.languageId,
    dialect,
    contentText: input.contentText,
    contextTags: tags,
    consentVersion: input.consent.version,
    consentAcceptedAt: input.consent.acceptedAt,
    licenceGrant: ARCHIVE_LICENCE_GRANT,
    rightsDeclaration: input.rightsDeclaration,
    rightsNote: note,
    speakerConsentForAudio: null,
    retentionPolicy: "until_withdrawn",
    createdAt: input.createdAt,
    withdrawnAt: null,
    verification: { status: "pending_review", peerConfirmations: 0, peerThreshold: PEER_THRESHOLD, verifiedAt: null },
  });
}

/** Idempotent. A withdrawn entry disappears from view (D-020); the record is kept for sync. */
export function withdrawContribution(contribution: Contribution, at: string): Contribution {
  return contribution.withdrawnAt === null ? { ...contribution, withdrawnAt: at } : contribution;
}

export const isVisible = (contribution: Contribution) => contribution.withdrawnAt === null;
