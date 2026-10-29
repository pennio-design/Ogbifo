import { createHash, randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  devMailboxAllowed, InMemoryLoginTokenRepository, InMemoryRateLimiter, InMemorySessionRepository, InMemoryUserRepository,
  LINK_TTL_MS, normalizeEmail, RATE_LIMITS, SESSION_TTL_MS, type AuthCrypto, type EmailSender,
} from "../src/auth";
import { AuthService } from "../src/auth-service";
import { fail, ok } from "../src/result";

describe("normalizeEmail", () => {
  it("trims and lower-cases, keeping plus tags and dots", () => {
    expect(normalizeEmail("  Ada.Lovelace+test@Example.COM ")).toEqual({ ok: true, value: "ada.lovelace+test@example.com" });
  });
  it.each(["", "   ", "nope", "a@b", "a b@c.com", "@x.com", "a@@b.com", `${"a".repeat(250)}@x.com`])("rejects %j", (bad) => {
    const r = normalizeEmail(bad);
    expect(!r.ok && r.error.code).toBe("INVALID_EMAIL");
  });
});

function setup(emailOk = true, withEmail = true) {
  let now = new Date("2026-10-20T10:00:00.000Z");
  let n = 0;
  const sent: { to: string; link: string }[] = [];
  const crypto: AuthCrypto = {
    randomToken: () => randomBytes(32).toString("base64url"),
    hash: async (t) => createHash("sha256").update(t).digest("hex"),
    newId: () => `user-${++n}`,
  };
  const email: EmailSender = {
    sendSignInLink: async (to, link) => { sent.push({ to, link }); return emailOk ? ok(undefined) : fail("X", "down"); },
  };
  const users = new InMemoryUserRepository();
  const tokens = new InMemoryLoginTokenRepository();
  const sessions = new InMemorySessionRepository();
  const auth = new AuthService({
    users, tokens, sessions, limiter: new InMemoryRateLimiter(), crypto, email: withEmail ? email : null,
    now: () => now, baseUrl: "https://ogbifo.test/",
  });
  const tokenFromLink = (link: string) => new URL(link).searchParams.get("token")!;
  return { auth, sent, tokens, sessions, users, tokenFromLink, advance: (ms: number) => { now = new Date(now.getTime() + ms); } };
}

describe("sign in by email link", () => {
  it("sends a link, redeems it once, and creates the account", async () => {
    const t = setup();
    expect((await t.auth.requestLink("Ada@Example.com", "1.1.1.1")).ok).toBe(true);
    expect(t.sent).toHaveLength(1);
    expect(t.sent[0]!.to).toBe("ada@example.com");
    expect(t.sent[0]!.link.startsWith("https://ogbifo.test/auth/verify?token=")).toBe(true);
    const r = await t.auth.redeem(t.tokenFromLink(t.sent[0]!.link));
    expect(r.ok && r.value.user).toMatchObject({ email: "ada@example.com", displayName: "Reader" });
    const again = await t.auth.redeem(t.tokenFromLink(t.sent[0]!.link));
    expect(!again.ok && again.error.code).toBe("LINK_INVALID");
  });
  it("gives a returning user the same account", async () => {
    const t = setup();
    const ids: string[] = [];
    for (let i = 0; i < 2; i++) {
      await t.auth.requestLink("ada@example.com", "1.1.1.1");
      const r = await t.auth.redeem(t.tokenFromLink(t.sent.at(-1)!.link));
      if (r.ok) ids.push(r.value.user.id);
    }
    expect(ids[0]).toBe(ids[1]);
  });
  it("stores only hashes of the link token and the session token", async () => {
    const t = setup();
    await t.auth.requestLink("ada@example.com", "1.1.1.1");
    const token = t.tokenFromLink(t.sent[0]!.link);
    const hashed = createHash("sha256").update(token).digest("hex");
    expect(await t.tokens.get(token)).toBeNull();
    expect(await t.tokens.get(hashed)).not.toBeNull();
    const r = await t.auth.redeem(token);
    if (!r.ok) throw new Error("setup");
    expect(await t.sessions.get(r.value.sessionToken)).toBeNull();
  });
  it("rejects unknown, empty and oversized tokens with one plain message", async () => {
    const t = setup();
    for (const bad of ["", "nope", "x".repeat(500)]) {
      const r = await t.auth.redeem(bad);
      expect(!r.ok && r.error.code).toBe("LINK_INVALID");
    }
  });
  it("expires links after 15 minutes", async () => {
    const t = setup();
    await t.auth.requestLink("ada@example.com", "1.1.1.1");
    t.advance(LINK_TTL_MS + 1);
    const r = await t.auth.redeem(t.tokenFromLink(t.sent[0]!.link));
    expect(!r.ok && r.error.code).toBe("LINK_INVALID");
  });
  it("lets only one of two simultaneous redemptions win", async () => {
    const t = setup();
    await t.auth.requestLink("ada@example.com", "1.1.1.1");
    const token = t.tokenFromLink(t.sent[0]!.link);
    const results = await Promise.all([t.auth.redeem(token), t.auth.redeem(token)]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
  });
  it("answers the same for known and unknown addresses", async () => {
    const t = setup();
    await t.auth.requestLink("ada@example.com", "1.1.1.1");
    await t.auth.redeem(t.tokenFromLink(t.sent[0]!.link));
    expect(await t.auth.requestLink("ada@example.com", "1.1.1.1")).toEqual(await t.auth.requestLink("new@example.com", "1.1.1.1"));
  });
  it("refuses a bad address without sending anything", async () => {
    const t = setup();
    expect((await t.auth.requestLink("nope", "1.1.1.1")).ok).toBe(false);
    expect(t.sent).toHaveLength(0);
  });
  it("limits links per address and per IP", async () => {
    const t = setup();
    for (let i = 0; i < RATE_LIMITS.perEmail.limit; i++) expect((await t.auth.requestLink("ada@example.com", `9.9.9.${i}`)).ok).toBe(true);
    const blocked = await t.auth.requestLink("ada@example.com", "8.8.8.8");
    expect(!blocked.ok && blocked.error.code).toBe("RATE_LIMITED");
    const t2 = setup();
    for (let i = 0; i < RATE_LIMITS.perIp.limit; i++) await t2.auth.requestLink(`u${i}@example.com`, "7.7.7.7");
    const r = await t2.auth.requestLink("another@example.com", "7.7.7.7");
    expect(!r.ok && r.error.code).toBe("RATE_LIMITED");
    t2.advance(RATE_LIMITS.perIp.windowMs + 1);
    expect((await t2.auth.requestLink("another@example.com", "7.7.7.7")).ok).toBe(true);
  });
  it("reports a sending failure without claiming success", async () => {
    const t = setup(false);
    const r = await t.auth.requestLink("ada@example.com", "1.1.1.1");
    expect(!r.ok && r.error.code).toBe("EMAIL_FAILED");
  });
  it("is closed, not faked, when no email provider is configured", async () => {
    const t = setup(true, false);
    const r = await t.auth.requestLink("ada@example.com", "1.1.1.1");
    expect(!r.ok && r.error.code).toBe("SIGN_IN_CLOSED");
  });
});

describe("sessions", () => {
  async function signedIn() {
    const t = setup();
    await t.auth.requestLink("ada@example.com", "1.1.1.1");
    const r = await t.auth.redeem(t.tokenFromLink(t.sent[0]!.link));
    if (!r.ok) throw new Error("setup");
    return { t, session: r.value.sessionToken, user: r.value.user };
  }
  it("identifies the user, and nobody for a missing or wrong token", async () => {
    const { t, session, user } = await signedIn();
    expect((await t.auth.userForSession(session))?.id).toBe(user.id);
    expect(await t.auth.userForSession(undefined)).toBeNull();
    expect(await t.auth.userForSession("forged")).toBeNull();
  });
  it("expires after 30 days", async () => {
    const { t, session } = await signedIn();
    t.advance(SESSION_TTL_MS + 1);
    expect(await t.auth.userForSession(session)).toBeNull();
  });
  it("signs out", async () => {
    const { t, session } = await signedIn();
    await t.auth.signOut(session);
    expect(await t.auth.userForSession(session)).toBeNull();
    await expect(t.auth.signOut(undefined)).resolves.toBeUndefined();
  });
});

describe("development mailbox", () => {
  const on = { OGBIFO_DEV_EMAIL: "1" };
  it("needs the flag and a local site address", () => {
    expect(devMailboxAllowed(on, "http://localhost:3000")).toBe(true);
    expect(devMailboxAllowed(on, "http://127.0.0.1:3410")).toBe(true);
    expect(devMailboxAllowed({}, "http://localhost:3000")).toBe(false);
    expect(devMailboxAllowed({ OGBIFO_DEV_EMAIL: "0" }, "http://localhost:3000")).toBe(false);
  });
  it("is refused on any real address, however it is set", () => {
    for (const base of ["https://ogbifo.org", "http://localhost.evil.com", "http://evil.com/localhost", "", "not a url"]) {
      expect(devMailboxAllowed(on, base)).toBe(false);
    }
  });
});
