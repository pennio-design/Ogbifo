import type {
  LoginToken,
  LoginTokenRepository,
  RateLimiter,
  Session,
  SessionRepository,
  User,
  UserRepository,
} from "./auth";
import type { SqlClient } from "./sql";

const iso = (value: unknown): string => (value instanceof Date ? value.toISOString() : new Date(String(value)).toISOString());

interface UserRow { id: string; email: string; display_name: string; created_at: unknown }
const toUser = (r: UserRow): User => ({ id: r.id, email: r.email, displayName: r.display_name, createdAt: iso(r.created_at) });

export class PostgresUserRepository implements UserRepository {
  constructor(private readonly db: SqlClient) {}

  async findByEmail(email: string) {
    const { rows } = await this.db.query<UserRow>("SELECT * FROM users WHERE email = $1", [email]);
    return rows[0] ? toUser(rows[0]) : null;
  }

  async findById(id: string) {
    const { rows } = await this.db.query<UserRow>("SELECT * FROM users WHERE id = $1", [id]);
    return rows[0] ? toUser(rows[0]) : null;
  }

  /** Concurrent first sign-ins for one address end with one account: the loser reads the winner's row. */
  async create(user: User) {
    await this.db.query(
      "INSERT INTO users (id, email, display_name, created_at) VALUES ($1, $2, $3, $4) ON CONFLICT (email) DO NOTHING",
      [user.id, user.email, user.displayName, user.createdAt],
    );
    return (await this.findByEmail(user.email)) ?? user;
  }
}

interface TokenRow { token_hash: string; email: string; created_at: unknown; expires_at: unknown; used_at: unknown }

export class PostgresLoginTokenRepository implements LoginTokenRepository {
  constructor(private readonly db: SqlClient) {}

  async put(token: LoginToken) {
    await this.db.query(
      "INSERT INTO login_tokens (token_hash, email, created_at, expires_at, used_at) VALUES ($1, $2, $3, $4, $5)",
      [token.tokenHash, token.email, token.createdAt, token.expiresAt, token.usedAt],
    );
  }

  async get(tokenHash: string): Promise<LoginToken | null> {
    const { rows } = await this.db.query<TokenRow>("SELECT * FROM login_tokens WHERE token_hash = $1", [tokenHash]);
    const r = rows[0];
    return r
      ? { tokenHash: r.token_hash, email: r.email, createdAt: iso(r.created_at), expiresAt: iso(r.expires_at), usedAt: r.used_at === null ? null : iso(r.used_at) }
      : null;
  }

  /** One statement, so two simultaneous redemptions cannot both succeed. */
  async markUsed(tokenHash: string, at: string) {
    const { rows } = await this.db.query(
      "UPDATE login_tokens SET used_at = $2 WHERE token_hash = $1 AND used_at IS NULL RETURNING token_hash",
      [tokenHash, at],
    );
    return rows.length === 1;
  }
}

interface SessionRow { token_hash: string; user_id: string; created_at: unknown; expires_at: unknown }

export class PostgresSessionRepository implements SessionRepository {
  constructor(private readonly db: SqlClient) {}

  async put(session: Session) {
    await this.db.query(
      "INSERT INTO sessions (token_hash, user_id, created_at, expires_at) VALUES ($1, $2, $3, $4)",
      [session.tokenHash, session.userId, session.createdAt, session.expiresAt],
    );
  }

  async get(tokenHash: string): Promise<Session | null> {
    const { rows } = await this.db.query<SessionRow>("SELECT * FROM sessions WHERE token_hash = $1", [tokenHash]);
    const r = rows[0];
    return r ? { tokenHash: r.token_hash, userId: r.user_id, createdAt: iso(r.created_at), expiresAt: iso(r.expires_at) } : null;
  }

  async delete(tokenHash: string) {
    await this.db.query("DELETE FROM sessions WHERE token_hash = $1", [tokenHash]);
  }
}

/** Counts hits in a sliding window. Old hits for the key are deleted as it goes, so the table stays small. */
export class PostgresRateLimiter implements RateLimiter {
  constructor(private readonly db: SqlClient) {}

  async allow(key: string, limit: number, windowMs: number, now: Date) {
    const since = new Date(now.getTime() - windowMs).toISOString();
    await this.db.query("DELETE FROM rate_limit_hits WHERE key = $1 AND at <= $2", [key, since]);
    await this.db.query("INSERT INTO rate_limit_hits (key, at) VALUES ($1, $2)", [key, now.toISOString()]);
    const { rows } = await this.db.query<{ n: string | number }>("SELECT count(*) AS n FROM rate_limit_hits WHERE key = $1", [key]);
    return Number(rows[0]?.n ?? 0) <= limit;
  }
}
