-- Ogbifọ 0002: reviewer sign-off on Cards (D-012), reference audio (D-014),
-- Deck unlock rule (D-029) and reading sessions. Additive only.

ALTER TABLE cards
  ADD COLUMN review_status       text NOT NULL DEFAULT 'unreviewed'
                                 CHECK (review_status IN ('unreviewed', 'reviewed')),
  ADD COLUMN reviewers           text[] NOT NULL DEFAULT '{}',
  ADD COLUMN reviewed_at         timestamptz,
  ADD COLUMN reference_audio_url text,
  ADD CONSTRAINT cards_reviewed_needs_signoff
    CHECK (review_status <> 'reviewed' OR (cardinality(reviewers) >= 2 AND reviewed_at IS NOT NULL));

ALTER TABLE decks
  ADD COLUMN unlocked_by_deck_id text REFERENCES decks (id),
  ADD CONSTRAINT decks_not_self_unlocking CHECK (unlocked_by_deck_id IS DISTINCT FROM id);

-- user_id has no foreign key yet: accounts (D-022) are not built.
-- score has no range check until OPEN_CONFLICTS #7 defines the scale.
CREATE TABLE reading_sessions (
  id               text PRIMARY KEY,
  user_id          text,
  card_id          text NOT NULL REFERENCES cards (id),
  mode             text NOT NULL CHECK (mode IN ('studio', 'live')),
  target_language  text NOT NULL DEFAULT 'en',
  started_at       timestamptz NOT NULL,
  completed_at     timestamptz,
  score            numeric,
  CONSTRAINT reading_sessions_ordered CHECK (completed_at IS NULL OR completed_at >= started_at)
);

CREATE INDEX reading_sessions_card_id_idx ON reading_sessions (card_id);
CREATE INDEX reading_sessions_user_id_idx ON reading_sessions (user_id) WHERE user_id IS NOT NULL;
