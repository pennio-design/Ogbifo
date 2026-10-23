import { describe, expect, it } from "vitest";
import { ARCHIVE_LICENCE_GRANT, CONSENT_IS_DRAFT, CONSENT_VERSION } from "../src/consent";
import { createContribution, LIMITS, withdrawContribution, type ContributionInput } from "../src/contribution";

const consent = { version: CONSENT_VERSION, acceptedAt: "2026-10-18T10:00:00.000Z" };
const base: ContributionInput = {
  id: "c1", clientId: "c1", userId: "u-author", kind: "proverb", languageId: "yo",
  contentText: "Ẹni tó bá fẹ́ jẹun, kò gbọdọ̀ jẹkí", consent, rightsDeclaration: "own_work",
  createdAt: "2026-10-18T10:00:00.000Z",
};

describe("createContribution", () => {
  it("keeps text exactly as submitted and starts pending_review", () => {
    const decomposed = "Ẹ̀kọ́".normalize("NFD");
    const r = createContribution({ ...base, contentText: decomposed });
    expect(r.ok && r.value.contentText).toBe(decomposed);
    expect(r.ok && r.value.verification).toEqual({ status: "pending_review", peerConfirmations: 0, peerThreshold: 5, verifiedAt: null });
  });
  it("records consent, licence grant, rights and retention", () => {
    const r = createContribution(base);
    expect(r.ok && r.value).toMatchObject({
      consentVersion: CONSENT_VERSION, licenceGrant: ARCHIVE_LICENCE_GRANT, rightsDeclaration: "own_work",
      speakerConsentForAudio: null, retentionPolicy: "until_withdrawn", withdrawnAt: null,
    });
  });
  it("refuses without consent, or with a stale consent version", () => {
    for (const bad of [null, { ...consent, version: "old" }]) {
      const r = createContribution({ ...base, consent: bad });
      expect(!r.ok && r.error.code).toBe("CONSENT_REQUIRED");
    }
  });
  it("refuses without a rights declaration", () => {
    const r = createContribution({ ...base, rightsDeclaration: null });
    expect(!r.ok && r.error.code).toBe("RIGHTS_REQUIRED");
  });
  it("needs a rights note for lyrics, permission and open licences, not for own phrases", () => {
    expect(createContribution(base).ok).toBe(true);
    for (const patch of [{ kind: "lyric" as const }, { rightsDeclaration: "rights_holder_permission" as const }, { rightsDeclaration: "open_licence" as const }]) {
      const r = createContribution({ ...base, ...patch });
      expect(!r.ok && r.error.field).toBe("rightsNote");
      expect(createContribution({ ...base, ...patch, rightsNote: "  Publisher X, by letter  " })).toMatchObject({ ok: true, value: { rightsNote: "Publisher X, by letter" } });
    }
  });
  it("counts graphemes, not code units, for length", () => {
    const fits = "ẹ́".repeat(LIMITS.contentGraphemes);
    expect(createContribution({ ...base, contentText: fits }).ok).toBe(true);
    expect(createContribution({ ...base, contentText: fits + "a" }).ok).toBe(false);
  });
  it("refuses a contribution with no signed-in user", () => {
    const r = createContribution({ ...base, userId: " " });
    expect(!r.ok && r.error.code).toBe("SIGN_IN_REQUIRED");
  });
  it("refuses blank text and missing language", () => {
    expect(createContribution({ ...base, contentText: "  \n" }).ok).toBe(false);
    expect(createContribution({ ...base, languageId: "" }).ok).toBe(false);
  });
  it("trims and de-duplicates tags, and caps their number", () => {
    const r = createContribution({ ...base, contextTags: [" greeting ", "greeting", "", "market"] });
    expect(r.ok && r.value.contextTags).toEqual(["greeting", "market"]);
    expect(createContribution({ ...base, contextTags: Array.from({ length: 9 }, (_, i) => `t${i}`) }).ok).toBe(false);
  });
  it("stores a blank dialect as null", () => {
    const r = createContribution({ ...base, dialect: "   " });
    expect(r.ok && r.value.dialect).toBeNull();
  });
  it("withdraws idempotently", () => {
    const c = createContribution(base);
    if (!c.ok) throw new Error("setup");
    const w = withdrawContribution(c.value, "2026-10-19T00:00:00.000Z");
    expect(w.withdrawnAt).toBe("2026-10-19T00:00:00.000Z");
    expect(withdrawContribution(w, "2027-01-01T00:00:00.000Z")).toBe(w);
  });
  it("is still marked draft until counsel reviews the wording", () => expect(CONSENT_IS_DRAFT).toBe(true));
});
