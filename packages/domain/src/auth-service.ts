import {
  DEFAULT_DISPLAY_NAME,
  LINK_TTL_MS,
  normalizeEmail,
  RATE_LIMITS,
  SESSION_TTL_MS,
  type AuthCrypto,
  type EmailSender,
  type LoginTokenRepository,
  type RateLimiter,
  type SessionRepository,
  type User,
  type UserRepository,
} from "./auth";
import { fail, ok, type Result } from "./result";

export interface AuthDeps {
  readonly users: UserRepository;
  readonly tokens: LoginTokenRepository;
  readonly sessions: SessionRepository;
  readonly limiter: RateLimiter;
  readonly crypto: AuthCrypto;
  /** Null when no email provider is configured: sign-in is closed, nothing is faked. */
  readonly email: EmailSender | null;
  readonly now: () => Date;
  /** Origin the link points at, e.g. https://ogbifo.example. */
  readonly baseUrl: string;
}

export interface SignedIn {
  readonly sessionToken: string;
  readonly user: User;
  readonly expiresAt: string;
}

const LINK_INVALID = "This sign-in link has expired or was already used. Ask for a new one.";

export class AuthService {
  constructor(private readonly deps: AuthDeps) {}

  /**
   * Send a sign-in link. The answer is the same whether or not the address has an
   * account, so the form cannot be used to find out who is registered.
   */
  async requestLink(rawEmail: string, ip: string): Promise<Result<void>> {
    const { deps } = this;
    if (deps.email === null) return fail("SIGN_IN_CLOSED", "Sign-in is not open yet.");
    const email = normalizeEmail(rawEmail);
    if (!email.ok) return email;

    const now = deps.now();
    const e = RATE_LIMITS.perEmail;
    const i = RATE_LIMITS.perIp;
    const [emailOk, ipOk] = await Promise.all([
      deps.limiter.allow(`email:${email.value}`, e.limit, e.windowMs, now),
      deps.limiter.allow(`ip:${ip}`, i.limit, i.windowMs, now),
    ]);
    if (!emailOk || !ipOk) return fail("RATE_LIMITED", "Too many sign-in links requested. Try again in an hour.");

    const token = deps.crypto.randomToken();
    await deps.tokens.put({
      tokenHash: await deps.crypto.hash(token),
      email: email.value,
      createdAt: now.toISOString(),
      expiresAt: new Date(now.getTime() + LINK_TTL_MS).toISOString(),
      usedAt: null,
    });
    const link = `${deps.baseUrl.replace(/\/$/, "")}/auth/verify?token=${encodeURIComponent(token)}`;
    const sent = await deps.email.sendSignInLink(email.value, link);
    return sent.ok ? ok(undefined) : fail("EMAIL_FAILED", "We could not send the email. Try again in a moment.");
  }

  /** Exchange a link token for a session. A link works once. */
  async redeem(token: string): Promise<Result<SignedIn>> {
    const { deps } = this;
    if (token.length === 0 || token.length > 200) return fail("LINK_INVALID", LINK_INVALID);
    const now = deps.now();
    const tokenHash = await deps.crypto.hash(token);
    const found = await deps.tokens.get(tokenHash);
    if (found === null || found.usedAt !== null || Date.parse(found.expiresAt) <= now.getTime()) {
      return fail("LINK_INVALID", LINK_INVALID);
    }
    if (!(await deps.tokens.markUsed(tokenHash, now.toISOString()))) return fail("LINK_INVALID", LINK_INVALID);

    const user =
      (await deps.users.findByEmail(found.email)) ??
      (await deps.users.create({
        id: deps.crypto.newId(),
        email: found.email,
        displayName: DEFAULT_DISPLAY_NAME,
        createdAt: now.toISOString(),
      }));

    const sessionToken = deps.crypto.randomToken();
    const expiresAt = new Date(now.getTime() + SESSION_TTL_MS).toISOString();
    await deps.sessions.put({
      tokenHash: await deps.crypto.hash(sessionToken),
      userId: user.id,
      createdAt: now.toISOString(),
      expiresAt,
    });
    return ok({ sessionToken, user, expiresAt });
  }

  /** The signed-in user for a session token, or null. Expired sessions are removed. */
  async userForSession(sessionToken: string | undefined): Promise<User | null> {
    if (!sessionToken) return null;
    const { deps } = this;
    const tokenHash = await deps.crypto.hash(sessionToken);
    const session = await deps.sessions.get(tokenHash);
    if (session === null) return null;
    if (Date.parse(session.expiresAt) <= deps.now().getTime()) {
      await deps.sessions.delete(tokenHash);
      return null;
    }
    return deps.users.findById(session.userId);
  }

  async signOut(sessionToken: string | undefined): Promise<void> {
    if (!sessionToken) return;
    await this.deps.sessions.delete(await this.deps.crypto.hash(sessionToken));
  }
}
