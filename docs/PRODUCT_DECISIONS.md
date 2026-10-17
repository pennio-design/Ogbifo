# Ogbifọ — Product Decisions

Decisions that override or constrain other documents. Newest definition wins (see `CLAUDE.md`).

## D-001 Product category

Ogbifọ is a consumer language and cultural archive/interpreter product. It is not a data-engine business.

## D-002 No dataset-selling business model in the MVP

The Ogbifọ MVP has no dataset-selling, data-licensing or training-data revenue model. Do not build export, licensing, buyer-facing or "dataset" features, and do not design schemas, UI copy or consent flows around that purpose.

## D-003 Purpose of the Reading Room and contributions

The Reading Room exists for language learning, interpretation, preservation and cultural participation. Contributions are primarily for the Ogbifọ Archive and Community, not commercial dataset production.

## D-004 Meaning of verification

Peer verification supports community trust and archive quality. It is not dataset certification. `peer_verified` must never be presented, exported or described as gold, certified or authoritative linguistic truth.

## D-005 Consent and licensing still apply

Users may contribute recordings, media, lyrics and cultural material, so consent, license and rights capture are required before any contribution is stored (`OPEN_CONFLICTS.md` #5). The grant covers Archive display, community verification and the contributor's own use. Any other use needs new, explicit consent and a new decision in this file.

## D-006 The benchmark project

`bench/`, `audit/`, `docs/reference/ogbifo-architecture.md` and the pitch deck belong to a separate project. They do not drive Ogbifọ's roadmap. They stay in this repository until the owner moves or drops them. App work does not modify them.

## D-007 Royal Seal

One loop. The canonical seal is `brand/royal-seal.svg`: a 16-spoke radial waveform (`currentColor`), a single Ochre loop, and a central Ochre fulcrum. Do not redraw it or add a loop. The earlier "two intersecting loops" wording is retired, and an eye-shaped candidate was rejected because it reads as an eye, against the brand's rejection of surveillance aesthetics.

## D-008 Canonical sources

`docs/` is the single source of truth. The brand guidelines palette and typography (Clay / Ochre / Bone; Fraunces / Space Grotesk / Plus Jakarta Sans) are canonical. `DATA_MODEL.md` is the canonical data model. No earlier prototype, deck or pipeline document is a source.

## D-009 No leaderboards

No leaderboards or competitive ranking in the MVP.

## D-010 Yorùbá at launch, multi-language by design

Ogbifọ launches with Yorùbá only. The MVP's content, Decks, Archive, scoring, copy and fonts cover Yorùbá. Hausa, Igbo, Pidgin and other languages are out of the MVP, and nothing is seeded or designed for them. The architecture stays multi-language: `languageId` on every entity, so adding a language does not rewrite the schema.

Public framing is "Yorùbá first", never "African languages", while one language ships.

A language is added only through the gate in `LANGUAGE_EXPANSION.md`, and adding one needs a new decision here. Planned order, by cost: Igbo, Hausa, then Pidgin.

D-011 to D-030 were decided for Yorùbá and apply to Yorùbá without qualification. Each later language re-confirms the ones that depend on language (D-012, D-014, D-015, D-016, D-024).

## D-011 Launch user

The first user is the diaspora heritage learner: a Yorùbá-descent adult, usually abroad, who understands some speech but cannot read or write it. English is the support language. Design, copy and pricing serve this user first. Native speakers are contributors and reviewers, not the primary audience. Not for launch: resident students on constrained data, researchers, children.

## D-012 Content authority

No Card reaches a user until at least two named native-speaker reviewers have approved it. Cards display who reviewed them. Community contributions live in a separate, clearly labelled Archive and never enter a Deck without the same review. Developer seed content is for building only and must not ship.

Consequence: `Card` needs review fields (reviewers, review date, review status) before Sprint 2 ships Cards to users. Not yet in `DATA_MODEL.md`.

## D-013 Language Map

The Language Map is a map of Yorùbá dialects and regions, showing Archive coverage and gaps by dialect. Pioneer status rewards contributing to under-documented dialects. The page is named "Language Map" (terminology unchanged) but its content is Yorùbá-internal.

## D-014 Speech scoring

The Resonance Score compares the learner's pitch contour and timing against a native reference recording of the same Card, syllable by syllable, because tone carries meaning in Yorùbá. No ASR transcript is used for scoring. Every Card therefore needs reviewer-recorded reference audio. Clarity, Rhythm and Boldness as originally specified are replaced; the new metrics are defined in `OPEN_CONFLICTS.md` #7. The score stays labelled as guidance.

## D-015 Orthography

Every Deck Card is fully tone-marked and dot-below marked, and a reviewer checks the marking. Contributors get assisted tone-mark entry: a key palette plus lexicon-based suggestions. Archive entries may arrive unmarked but are flagged "needs marking" and cannot be confirmed by peers until marked. The reference standard for marking is still to be named (the 1966 Yorùbá orthography is the usual one).

## D-016 Dialect policy

Decks and reference recordings use standard Yorùbá. Dialect speech is collected, tagged and verified in the Archive. Dialect Decks (for example Ìjẹ̀bú or Ẹ̀kìtì) come later, once reviewers exist for that dialect. `dialectId` stays optional on Card.

## D-017 Platform

An installable web app (PWA) first, responsive, using the browser microphone. Offline: contribution drafts (per `OFFLINE_FIRST.md`) and any Deck the user has downloaded, including its reference audio. Native iOS and Android apps are revisited only if retention justifies them.

## D-018 Business model

None in the first release: free until the product shows retention. No paywalls. Locked Decks are progression only, not payment. Tokens are progress points with no cash value. Pricing is revisited with retention data.

## D-019 Learner audio

Pitch analysis runs on-device. A learner's recordings are not uploaded by default; only the numeric scores and contour are saved. The audio is discarded unless the learner explicitly keeps or shares it. Consequence: the scoring algorithm must run client-side (WASM or Web Audio), offline, and old attempts cannot be re-scored when it improves.

## D-020 Archive visibility and licence

Verified Archive entries are public to read. The contributor keeps ownership and grants Ogbifọ a non-exclusive licence to display, preserve and let the community verify the entry, on Ogbifọ only. The contributor can withdraw the licence, and a withdrawn entry disappears from view. Nothing is licensed to third parties (see D-002). Copyrighted works such as lyrics are not accepted without a rights declaration.

## D-021 Two verification tiers

Any signed-in user who declares fluency may confirm a contribution, and five confirmations make it "Peer confirmed". Only the named reviewer group (D-012) can mark an item "Reviewed", and only "Reviewed" items may enter a Deck. The two labels are never conflated in copy or data. One vote per account, with rate limits.

## D-022 Accounts

Anyone can read anonymously, including the Reading Room and a free sample Deck. An account (Google, Apple or an email link, no passwords) is required to keep progress, download Decks, contribute or confirm. Phone-number sign-in is not part of the first release.

## D-023 Translation

The MVP has no free-text machine translation. Every Card carries a reviewer-approved English translation plus a note on meaning and context. The PRD's Translation page (language swap, copy, counts, confidence) is deferred. Revisit only with a measured quality bar on Yorùbá.

## D-024 Reading Room modes

**Studio** is unscored practice: hear the reference at normal or slow speed, record, compare contours, no score, no progress. **Live** is one scored attempt per Card and counts toward progress.

## D-025 Progression

Ranks are Listener, Reader, Interpreter, Keeper, and Ogbifọ as the highest. "Sovereign" is retired as a rank and as a product term. Ranks are earned by consistent practice and by Reviewed contributions, never by popularity. Thresholds are set later from retention data. Tokens are plain progress points (D-018). No leaderboards (D-009).

## D-026 Launch bar

A private beta with 30 to 50 diaspora learners: two Decks (Proverb House and Common Tongue) of about 30 Cards each, all reviewer-approved (D-012) with reference audio from two voices. The success measure is the share of learners who return in week 2 and week 4.

## D-027 Translation placement

The reviewer-approved English translation is always visible beneath the Yorùbá text, as in the UX sketch. The Yorùbá is always first in reading order and visually dominant. There is no hide or reveal control in the MVP.

## D-028 Analytics

Full product analytics, behind a consent banner. Analytics are off until the user consents, and consent can be withdrawn at any time. Hard guardrails, regardless of vendor: no audio and no pitch data are ever sent; session replay masks the recording interface, the contribution form and any typed language text; no Yorùbá text a user types leaves the product through analytics; the vendor is named in the privacy notice. The vendor and the banner design are open (`OPEN_CONFLICTS.md` #13).

## D-029 Deck unlocks

Proverb House is locked until the learner has finished Common Tongue. Common Tongue is open, and is the free sample Deck for anonymous readers (D-022). The lock is progression only (D-018). "Finished" is defined in `OPEN_CONFLICTS.md` #14.

## D-030 Interface language

The interface is English. Yorùbá appears as Card content, the Ogbifọ name, and rank names with English glosses. Build string handling so a Yorùbá interface could be added later, but ship English only. Any Yorùbá UI string is reviewed content (D-012).
