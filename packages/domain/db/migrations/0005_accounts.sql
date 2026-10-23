-- Ogbifọ 0005: accounts by email link (D-022). Additive only. No passwords.
-- Link and session tokens are stored as hashes; the raw token exists only in the email and the cookie.

CREATE TABLE users (
  id            text PRIMARY KEY,
  email         text NOT NULL UNIQUE CHECK (email = lower(btrim(email)) AND position('@' IN email) > 1),
  display_name  text NOT NULL CHECK (btrim(display_name) <> ''),
  created_at    timestamptz NOT NULL
);

CREATE TABLE login_tokens (
  token_hash  text PRIMARY KEY,
  email       text NOT NULL,
  created_at  timestamptz NOT NULL,
  expires_at  timestamptz NOT NULL,
  used_at     timestamptz,
  CHECK (expires_at > created_at)
);
CREATE INDEX login_tokens_email_idx ON login_tokens (email, created_at DESC);

CREATE TABLE sessions (
  token_hash  text PRIMARY KEY,
  user_id     text NOT NULL REFERENCES users (id),
  created_at  timestamptz NOT NULL,
  expires_at  timestamptz NOT NULL,
  CHECK (expires_at > created_at)
);
CREATE INDEX sessions_user_idx ON sessions (user_id);

ALTER TABLE contributions
  ADD CONSTRAINT contributions_user_fk FOREIGN KEY (user_id) REFERENCES users (id);
ALTER TABLE peer_confirmations
  ADD CONSTRAINT peer_confirmations_user_fk FOREIGN KEY (user_id) REFERENCES users (id);
