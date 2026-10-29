-- Ogbifọ 0006: rate limit hits for sign-in links (D-039). Additive only.
-- Short-lived rows: the limiter deletes hits older than its window as it goes.

CREATE TABLE rate_limit_hits (
  id   bigserial PRIMARY KEY,
  key  text NOT NULL CHECK (btrim(key) <> ''),
  at   timestamptz NOT NULL
);
CREATE INDEX rate_limit_hits_key_at_idx ON rate_limit_hits (key, at);
