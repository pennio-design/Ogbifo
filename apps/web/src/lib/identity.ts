import { anonymousIdentityProvider, type Identity, type IdentityProvider } from "@ogbifo/domain";

/**
 * There is no sign-in yet (D-022). `NEXT_PUBLIC_DEV_ACCOUNT=1` stands in for a
 * signed-in user in local development and browser tests only. Never set it in a
 * deployment: it would let anyone write to their own browser as "dev-user".
 */
const devProvider: IdentityProvider = {
  current: () => ({ kind: "account", userId: "dev-user", displayName: "Dev account" }),
};

export const identityProvider: IdentityProvider =
  process.env.NEXT_PUBLIC_DEV_ACCOUNT === "1" ? devProvider : anonymousIdentityProvider;

export const currentIdentity = (): Identity => identityProvider.current();
