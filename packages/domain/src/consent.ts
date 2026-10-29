/**
 * Consent, licence and rights for contributions (D-005, D-020; OPEN_CONFLICTS #5).
 *
 * The wording below is a DRAFT that counsel has not reviewed. It exists so the
 * fields, the flow and the tests can be built. Nothing leaves the contributor's
 * device while `CONSENT_IS_DRAFT` is true (see `sync-transport.ts`). Replace the
 * copy, bump `CONSENT_VERSION` and flip the flag only after counsel signs off.
 */
export const CONSENT_VERSION = "draft-0.1";
export const CONSENT_IS_DRAFT = true;

export type RightsDeclaration = "own_work" | "rights_holder_permission" | "open_licence";

export const RIGHTS_DECLARATIONS: readonly RightsDeclaration[] = [
  "own_work",
  "rights_holder_permission",
  "open_licence",
];

/** D-020: non-exclusive, on Ogbifọ only, revocable. Nothing is licensed to third parties. */
export interface LicenceGrant {
  readonly scope: "archive_display_and_verification";
  readonly exclusive: false;
  readonly platform: "ogbifo_only";
  readonly revocable: true;
}

export const ARCHIVE_LICENCE_GRANT: LicenceGrant = {
  scope: "archive_display_and_verification",
  exclusive: false,
  platform: "ogbifo_only",
  revocable: true,
};

/** Only one policy exists until counsel sets retention periods (OPEN_CONFLICTS #5). */
export type RetentionPolicy = "until_withdrawn";

export interface ConsentRecord {
  readonly version: string;
  readonly acceptedAt: string;
}

export const CONSENT_COPY = {
  draftNotice:
    "Draft wording. A lawyer has not yet reviewed this, and nothing you add will leave this device until they have.",
  title: "Before you add to the Archive",
  points: [
    "You keep ownership of what you add.",
    "You give Ogbifọ a non-exclusive licence to show it on Ogbifọ, keep it in the Archive, and let the community confirm it.",
    "We will not license it to anyone else.",
    "You can withdraw this licence at any time. The entry will then disappear from view.",
  ],
  rightsLabel: "Whose is it?",
  rights: {
    own_work: "I wrote or said it myself.",
    rights_holder_permission: "I have the rights holder's permission to add it.",
    open_licence: "It is in the public domain or under an open licence.",
  } satisfies Record<RightsDeclaration, string>,
  rightsNoteLabel: {
    own_work: "Source or context (optional)",
    rights_holder_permission: "Who gave permission?",
    open_licence: "Which licence, and where is it from?",
  } satisfies Record<RightsDeclaration, string>,
  lyricsNotice:
    "Lyrics and other copyrighted works need a rights declaration. Say who holds the rights.",
  acceptLabel: "I have read this and I agree.",
} as const;
