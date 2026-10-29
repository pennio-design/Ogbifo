-- Ogbifọ 0001: Content domain (languages, dialects, decks, cards).
-- Additive only. Language text is stored exactly as submitted: no
-- normalization, trimming or case folding at the database layer.

CREATE TABLE languages (
  id                 text PRIMARY KEY,
  name               text NOT NULL CHECK (btrim(name) <> ''),
  code               text NOT NULL UNIQUE CHECK (btrim(code) <> ''),
  native_name        text NOT NULL,
  regions            text[] NOT NULL DEFAULT '{}',
  writing_system     text NOT NULL,
  status             text NOT NULL CHECK (status IN ('active', 'planned')),
  archive_count      integer NOT NULL DEFAULT 0 CHECK (archive_count >= 0),
  archive_gap_score  numeric(4, 3) NOT NULL DEFAULT 0 CHECK (archive_gap_score BETWEEN 0 AND 1)
);

CREATE TABLE dialects (
  id           text PRIMARY KEY,
  language_id  text NOT NULL REFERENCES languages (id),
  name         text NOT NULL CHECK (btrim(name) <> ''),
  region       text NOT NULL,
  description  text NOT NULL DEFAULT ''
);

CREATE TABLE decks (
  id                text PRIMARY KEY,
  name              text NOT NULL CHECK (btrim(name) <> ''),
  language_id       text NOT NULL REFERENCES languages (id),
  description       text NOT NULL DEFAULT '',
  tier              smallint NOT NULL CHECK (tier BETWEEN 1 AND 3),
  region            text NOT NULL,
  token_multiplier  numeric(4, 2) NOT NULL DEFAULT 1 CHECK (token_multiplier >= 1),
  is_locked         boolean NOT NULL DEFAULT false
);

CREATE TABLE cards (
  id           text PRIMARY KEY,
  deck_id      text NOT NULL REFERENCES decks (id),
  language_id  text NOT NULL REFERENCES languages (id),
  dialect_id   text REFERENCES dialects (id),
  category     text NOT NULL CHECK (category IN (
                 'proverb', 'greeting', 'daily_speech', 'praise_song_excerpt',
                 'market_expression', 'cultural_expression', 'general_phrase')),
  source_text  text NOT NULL CHECK (btrim(source_text) <> ''),
  translation  text NOT NULL CHECK (btrim(translation) <> ''),
  context      text NOT NULL DEFAULT '',
  source       text NOT NULL,
  token_value  integer NOT NULL DEFAULT 0 CHECK (token_value >= 0),
  difficulty   smallint NOT NULL CHECK (difficulty BETWEEN 1 AND 3),
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX decks_language_id_idx ON decks (language_id);
CREATE INDEX cards_deck_id_idx ON cards (deck_id);
CREATE INDEX cards_language_id_idx ON cards (language_id);
