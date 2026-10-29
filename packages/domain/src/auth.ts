import { fail, ok, type Result } from "./result";

/**
 * Email-link sign-in (D-022, no passwords). Deterministic domain logic; the
 * web app supplies crypto, storage and the email sender through the ports below.
 * Only hashes of link and session tokens are stored, so a leaked table cannot sign anyone in.
 */
export interface User {
  readonly id: string;
  /** Normalised (see `normalizeEmail`). Personal data: never shown to other users. */
  readonly email: string;
  /** What the community sees. Never derived from the email address. */
  readonly displayName: string;
  readonly createdAt: string;
}

export interface LoginToken {
  readonly tokenHash: string;
  readonly email: string;
  readonly createdAt: string;
  readonly expiresAt: string;
  readonly usedAt: string | null;
}

export interface Session {
  readonly tokenHash: string;
  readonly userId: string;
  readonly createdAt: string;
  readonly expiresAt: string;
}

export const LINK_TTL_MS = 15 * 60_000;
export const SESSION_TTL_MS = 30 * 24 * 60 * 60_000;
export const DEFAULT_DISPLAY_NAME = "Reader";
export const RATE_LIMITS = {
  perEmail: { limit: 5, windowMs: 60 * 60_000 },
  perIp: { limit: 20, windowMs: 60 * 60_000 },
} as const;

const EMAIL_MAX = 254;
const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Trim, NFC, lower-case. Does not strip `+tags` or dots: they can be real, distinct addresses. */
export function normalizeEmail(raw: string): Result<string> {
  const email = raw.trim().normalize("NFC").toLowerCase();
  if (email.length === 0 || email.length > EMAIL_MAX || !EMAIL_SHAPE.test(email)) {
    return fail("INVALID_EMAIL", "Enter an email address like name@example.com.", "email");
  }
  return ok(email);
}

export interface AuthCrypto {
  /** A new unguessable token (at least 256 bits), URL safe. */
  randomToken(): string;
  hash(token: string): Promise<string>;
  newId(): string;
}

export interface EmailSender {
  /** Send the sign-in link. Must not log or store the link anywhere durable. */
  sendSignInLink(to: string, link: string): Promise<Result<void>>;
}

export interface UserRepository {
  findByEmail(email: string): Promise<User | null>;
  findById(id: string): Promise<User | null>;
  /** Fails (returns the existing user) if the email already exists, so concurrent sign-ins cannot duplicate. */
  create(user: User): Promise<User>;
}

export interface LoginTokenRepository {
  put(token: LoginToken): Promise<void>;
  get(tokenHash: string): Promise<LoginToken | null>;
  /** Atomic compare-and-set. True only for the one caller that marks an unused token used. */
  markUsed(tokenHash: string, at: string): Promise<boolean>;
}

export interface SessionRepository {
  put(session: Session): Promise<void>;
  get(tokenHash: string): Promise<Session | null>;
  delete(tokenHash: string): Promise<void>;
}

export interface RateLimiter {
  /** Records one hit and says whether it is within the limit. */
  allow(key: string, limit: number, windowMs: number, now: Date): Promise<boolean>;
}

export class InMemoryUserRepository implements UserRepository {
  private readonly byEmail = new Map<string, User>();
  private readonly byId = new Map<string, User>();
  async findByEmail(email: string) {
    return this.byEmail.get(email) ?? null;
  }
  async findById(id: string) {
    return this.byId.get(id) ?? null;
  }
  async create(user: User) {
    const existing = this.byEmail.get(user.email);
    if (existing) return existing;
    this.byEmail.set(user.email, user);
    this.byId.set(user.id, user);
    return user;
  }
}

export class InMemoryLoginTokenRepository implements LoginTokenRepository {
  private readonly tokens = new Map<string, LoginToken>();
  async put(token: LoginToken) {
    this.tokens.set(token.tokenHash, token);
  }
  async get(tokenHash: string) {
    return this.tokens.get(tokenHash) ?? null;
  }
  async markUsed(tokenHash: string, at: string) {
    const t = this.tokens.get(tokenHash);
    if (!t || t.usedAt !== null) return false;
    this.tokens.set(tokenHash, { ...t, usedAt: at });
    return true;
  }
}

export class InMemorySessionRepository implements SessionRepository {
  private readonly sessions = new Map<string, Session>();
  async put(session: Session) {
    this.sessions.set(session.tokenHash, session);
  }
  async get(tokenHash: string) {
    return this.sessions.get(tokenHash) ?? null;
  }
  async delete(tokenHash: string) {
    this.sessions.delete(tokenHash);
  }
}

export class InMemoryRateLimiter implements RateLimiter {
  private readonly hits = new Map<string, number[]>();
  async allow(key: string, limit: number, windowMs: number, now: Date) {
    const since = now.getTime() - windowMs;
    const recent = (this.hits.get(key) ?? []).filter((t) => t > since);
    recent.push(now.getTime());
    this.hits.set(key, recent);
    return recent.length <= limit;
  }
}

/**
 * Development mailbox: keeps the newest link per address so a developer or the
 * browser tests can click it. Handing a sign-in link to whoever asks lets anyone
 * sign in as anyone, so it is allowed only when the site's own address is local.
 */
export function devMailboxAllowed(env: Record<string, string | undefined>, base: string): boolean {
  if (env.OGBIFO_DEV_EMAIL !== "1") return false;
  try {
    const host = new URL(base).hostname;
    return host === "localhost" || host === "127.0.0.1";
  } catch {
    return false;
  }
}

