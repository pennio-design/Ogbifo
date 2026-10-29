import { describe, expect, it } from "vitest";
import { CONSENT_VERSION } from "../src/consent";
import { createContribution, type Contribution } from "../src/contribution";
import { confirmContribution, verificationLabel, type PeerConfirmation } from "../src/verification";

const make = (userId = "author"): Contribution => {
  const r = createContribution({
    id: "c1", clientId: "c1", userId, kind: "phrase", languageId: "yo", contentText: "Ẹ káàbọ̀",
    consent: { version: CONSENT_VERSION, acceptedAt: "t" }, rightsDeclaration: "own_work", createdAt: "t",
  });
  if (!r.ok) throw new Error("setup");
  return r.value;
};
const T = "2026-10-18T10:00:00.000Z";

describe("peer confirmation", () => {
  it("counts distinct users and becomes peer_verified at five", () => {
    let c = make();
    let list: readonly PeerConfirmation[] = [];
    for (let i = 1; i <= 5; i++) {
      const r = confirmContribution(c, list, `u${i}`, T);
      if (!r.ok) throw new Error(r.error.code);
      c = r.value.contribution; list = r.value.confirmations;
      expect(c.verification.status).toBe(i < 5 ? "pending_review" : "peer_verified");
    }
    expect(c.verification).toMatchObject({ peerConfirmations: 5, verifiedAt: T });
  });
  it("is idempotent for the same user", () => {
    const first = confirmContribution(make(), [], "u1", T);
    if (!first.ok) throw new Error("setup");
    const again = confirmContribution(first.value.contribution, first.value.confirmations, "u1", T);
    expect(again.ok && again.value.added).toBe(false);
    expect(again.ok && again.value.contribution.verification.peerConfirmations).toBe(1);
  });
  it("refuses the author's own confirmation", () => {
    const r = confirmContribution(make("me"), [], "me", T);
    expect(!r.ok && r.error.code).toBe("CONFIRM_OWN");
  });
  it("refuses confirmations on withdrawn, flagged or rejected entries", () => {
    const c = make();
    expect(confirmContribution({ ...c, withdrawnAt: T }, [], "u1", T).ok).toBe(false);
    for (const status of ["flagged", "rejected"] as const) {
      expect(confirmContribution({ ...c, verification: { ...c.verification, status } }, [], "u1", T).ok).toBe(false);
    }
  });
  it("ignores confirmations recorded for other contributions", () => {
    const other: PeerConfirmation[] = [{ contributionId: "x", userId: "u1", createdAt: T }];
    const r = confirmContribution(make(), other, "u1", T);
    expect(r.ok && r.value.contribution.verification.peerConfirmations).toBe(1);
  });
  it("labels never say Reviewed", () => {
    const v = make().verification;
    expect(verificationLabel(v)).toBe("Pending community review");
    expect(verificationLabel({ ...v, peerConfirmations: 3 })).toBe("3 / 5 confirmations");
    expect(verificationLabel({ ...v, status: "peer_verified" })).toBe("Peer confirmed");
    for (const s of ["pending_review", "peer_verified", "flagged", "rejected"] as const) {
      expect(verificationLabel({ ...v, status: s })).not.toMatch(/reviewed$/i);
    }
  });
});
