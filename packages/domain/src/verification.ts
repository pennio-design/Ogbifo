import { PEER_THRESHOLD, type Contribution, type Verification } from "./contribution";
import { fail, ok, type Result } from "./result";

export interface PeerConfirmation {
  readonly contributionId: string;
  readonly userId: string;
  readonly createdAt: string;
}

export interface ConfirmationOutcome {
  readonly contribution: Contribution;
  readonly confirmations: readonly PeerConfirmation[];
  /** False when this user had already confirmed (idempotent repeat). */
  readonly added: boolean;
}

/**
 * Peer confirmation (VERIFICATION_SYSTEM.md, D-021). Pure and deterministic; the
 * server will be authoritative. Who may confirm, and abuse controls, are open
 * (OPEN_CONFLICTS #4): this function only enforces the rules that are decided.
 */
export function confirmContribution(
  contribution: Contribution,
  existing: readonly PeerConfirmation[],
  userId: string,
  at: string,
): Result<ConfirmationOutcome> {
  if (userId.trim() === "") return fail("CONFIRMATION_INVALID", "Sign in to confirm.");
  if (contribution.userId !== null && contribution.userId === userId) {
    return fail("CONFIRM_OWN", "You cannot confirm your own contribution.");
  }
  if (contribution.withdrawnAt !== null) {
    return fail("CONFIRMATION_CLOSED", "This contribution has been withdrawn.");
  }
  const mine = existing.filter((c) => c.contributionId === contribution.id);
  if (mine.some((c) => c.userId === userId)) {
    return ok({ contribution, confirmations: existing, added: false });
  }
  if (contribution.verification.status === "flagged" || contribution.verification.status === "rejected") {
    return fail("CONFIRMATION_CLOSED", "This contribution cannot be confirmed right now.");
  }

  const confirmations = [...existing, { contributionId: contribution.id, userId, createdAt: at }];
  const count = mine.length + 1;
  const threshold = contribution.verification.peerThreshold || PEER_THRESHOLD;
  const verified = count >= threshold;
  const verification: Verification = {
    status: verified ? "peer_verified" : contribution.verification.status,
    peerConfirmations: count,
    peerThreshold: threshold,
    verifiedAt: verified ? (contribution.verification.verifiedAt ?? at) : contribution.verification.verifiedAt,
  };
  return ok({ contribution: { ...contribution, verification }, confirmations, added: true });
}

/** Copy for the contributor and community. "Peer confirmed" is never "Reviewed" (D-021). */
export function verificationLabel(v: Verification): string {
  switch (v.status) {
    case "peer_verified":
      return "Peer confirmed";
    case "flagged":
      return "Under review by the community";
    case "rejected":
      return "Not accepted";
    case "pending_review":
      return v.peerConfirmations === 0
        ? "Pending community review"
        : `${v.peerConfirmations} / ${v.peerThreshold} confirmations`;
  }
}
