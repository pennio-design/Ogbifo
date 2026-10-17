/**
 * D-022. Anyone can read anonymously. An account keeps progress between
 * visits. The provider sits behind this interface so Google, Apple or an email
 * link can be chosen later without touching domain logic.
 */
export type Identity =
  | { readonly kind: "anonymous" }
  | { readonly kind: "account"; readonly userId: string; readonly displayName: string };

export interface IdentityProvider {
  current(): Identity;
}

export const anonymousIdentityProvider: IdentityProvider = {
  current: () => ({ kind: "anonymous" }),
};

export const canKeepProgress = (identity: Identity): boolean => identity.kind === "account";
