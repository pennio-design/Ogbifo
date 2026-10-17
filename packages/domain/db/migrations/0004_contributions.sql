-- Ogbifọ 0004: contributions, consent and peer confirmations (D-005, D-020, D-021). Additive only.
-- Schema only: nothing writes here until counsel has reviewed the consent wording (OPEN_CONFLICTS #5).
-- Consent, licence and rights columns are NOT NULL on purpose. No dataset or export columns (D-002).

CREATE TABLE contributions (
  id                         text PRIMARY KEY,
  client_id                  text NOT NULL UNIQUE,            -- idempotency key
  user_id                    text NOT NULL CHECK (btrim(user_id) <> ''),  -- contributing needs an account (D-022)
  type                       text NOT NULL CHECK (type = 'text'),
  kind                       text NOT NULL CHECK (kind IN ('phrase', 'proverb', 'greeting', 'lyric')),
  language_id                text NOT NULL REFERENCES languages (id),
  dialect                    text,
  content_text               text NOT NULL CHECK (btrim(content_text) <> ''),
  context_tags               text[] NOT NULL DEFAULT '{}',
  consent_version            text NOT NULL CHECK (btrim(consent_version) <> ''),
  consent_accepted_at        timestamptz NOT NULL,
  licence_grant              jsonb NOT NULL
    CHECK (licence_grant = '{"scope":"archive_display_and_verification","exclusive":false,"platform":"ogbifo_only","revocable":true}'::jsonb),
  rights_declaration         text NOT NULL CHECK (rights_declaration IN ('own_work', 'rights_holder_permission', 'open_licence')),
  rights_note                text,
  speaker_consent_for_audio  boolean,
  retention_policy           text NOT NULL CHECK (retention_policy = 'until_withdrawn'),
  created_at                 timestamptz NOT NULL,
  withdrawn_at               timestamptz,
  verification_status        text NOT NULL DEFAULT 'pending_review'
    CHECK (verification_status IN ('pending_review', 'peer_verified', 'flagged', 'rejected')),
  peer_threshold             integer NOT NULL DEFAULT 5 CHECK (peer_threshold >= 1),
  verified_at                timestamptz,
  CONSTRAINT contributions_rights_note_needed
    CHECK (rights_note IS NOT NULL OR (rights_declaration = 'own_work' AND kind <> 'lyric')),
  CONSTRAINT contributions_verified_has_time
    CHECK ((verification_status = 'peer_verified') = (verified_at IS NOT NULL))
);

CREATE INDEX contributions_visible_idx ON contributions (language_id, created_at DESC) WHERE withdrawn_at IS NULL;

-- One row per user per contribution, so a repeat confirmation cannot count twice.
CREATE TABLE peer_confirmations (
  id               text PRIMARY KEY,
  contribution_id  text NOT NULL REFERENCES contributions (id),
  user_id          text NOT NULL CHECK (btrim(user_id) <> ''),
  created_at       timestamptz NOT NULL,
  UNIQUE (contribution_id, user_id)
);
