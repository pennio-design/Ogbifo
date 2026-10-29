import { createHash, randomBytes, randomUUID } from "node:crypto";
import {
  AuthService,
  InMemoryLoginTokenRepository,
  InMemoryRateLimiter,
  InMemorySessionRepository,
  InMemoryUserRepository,
  devMailboxAllowed,
  ok,
  PostgresLoginTokenRepository,
  PostgresRateLimiter,
  PostgresSessionRepository,
  PostgresUserRepository,
  type AuthCrypto,
  type EmailSender,
} from "@ogbifo/domain";
import { getDb } from "./db";

/**
 * Composition root for sign-in (D-022, D-039). With `DATABASE_URL` set, accounts, links,
 * sessions and rate limits live in Postgres (run `npm run migrate` first). Without it,
 * development uses memory (lost on restart) and production leaves sign-in closed.
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

const db = getDb();

/**
 * No real email provider is wired yet (OPEN_CONFLICTS #21), so outside the dev mailbox
 * sign-in stays closed. It is also closed in production without a database: in-memory
 * accounts would vanish on every restart.
 */
const storageOk = db !== null || process.env.NODE_ENV !== "production";
const sender: EmailSender | null = devMailbox && storageOk ? devSender : null;

const globalForAuth = globalThis as unknown as { ogbifoAuth?: AuthService };

export function getAuthService(): AuthService {
  globalForAuth.ogbifoAuth ??= new AuthService({
    users: db ? new PostgresUserRepository(db) : new InMemoryUserRepository(),
    tokens: db ? new PostgresLoginTokenRepository(db) : new InMemoryLoginTokenRepository(),
    sessions: db ? new PostgresSessionRepository(db) : new InMemorySessionRepository(),
    limiter: db ? new PostgresRateLimiter(db) : new InMemoryRateLimiter(),
    crypto: nodeCrypto,
    email: sender,
    now: () => new Date(),
    baseUrl,
  });
  return globalForAuth.ogbifoAuth;
}
