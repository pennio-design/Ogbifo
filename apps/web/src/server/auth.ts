import { createHash, randomBytes, randomUUID } from "node:crypto";
import {
  AuthService,
  InMemoryLoginTokenRepository,
  InMemoryRateLimiter,
  InMemorySessionRepository,
  InMemoryUserRepository,
  devMailboxAllowed,
  ok,
  type AuthCrypto,
  type EmailSender,
} from "@ogbifo/domain";

/**
 * Composition root for sign-in (D-022). Storage is in memory: accounts and sessions
 * vanish when the server restarts and are not shared between instances. A Postgres
 * adapter (migration 0005 is ready) is needed before a real deployment
 * (OPEN_CONFLICTS #21).
 */
export const SESSION_COOKIE = "ogbifo_session";

export const baseUrl = (process.env.OGBIFO_BASE_URL ?? (process.env.NODE_ENV === "production" ? "" : `http://localhost:${process.env.PORT ?? 3000}`)).replace(/\/$/, "");
export const secureCookies = baseUrl.startsWith("https://");

const nodeCrypto: AuthCrypto = {
  randomToken: () => randomBytes(32).toString("base64url"),
  hash: async (token) => createHash("sha256").update(token).digest("hex"),
  newId: () => randomUUID(),
};

const devLinks = new Map<string, string>();
const devSender: EmailSender = {
  sendSignInLink: async (to, link) => {
    devLinks.set(to, link);
    return ok(undefined);
  },
};

export const devMailbox = devMailboxAllowed(process.env, baseUrl);
export const devLinkFor = (email: string): string | undefined => (devMailbox ? devLinks.get(email) : undefined);

/** No real email provider is wired yet (OPEN_CONFLICTS #21), so outside the dev mailbox sign-in stays closed. */
const sender: EmailSender | null = devMailbox ? devSender : null;

const globalForAuth = globalThis as unknown as { ogbifoAuth?: AuthService };

export function getAuthService(): AuthService {
  globalForAuth.ogbifoAuth ??= new AuthService({
    users: new InMemoryUserRepository(),
    tokens: new InMemoryLoginTokenRepository(),
    sessions: new InMemorySessionRepository(),
    limiter: new InMemoryRateLimiter(),
    crypto: nodeCrypto,
    email: sender,
    now: () => new Date(),
    baseUrl,
  });
  return globalForAuth.ogbifoAuth;
}
