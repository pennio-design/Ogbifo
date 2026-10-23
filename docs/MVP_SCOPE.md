# Ogbifọ — MVP Scope

> Product direction is settled: `PRODUCT_DECISIONS.md`. Launch bar: D-026 (private beta, two Decks of about 30 Cards). Consent and licensing (`OPEN_CONFLICTS.md` #5) gate Phase 3.

## Phase 1 — Foundation

**Must have:** application shell, navigation, authentication, language model, deck model, card model, Reading Room, responsive design, Ogbifọ brand system.

**Exit:** a user can enter Ogbifọ and complete a Reading Room session.

## Phase 2 — Language interaction

**Must have:** reviewed translations on Cards, Studio and Live modes, audio recording, on-device pitch analysis and Resonance Score (D-014, D-019, D-024), reference audio playback, shareable waveform.

**Exit:** a user can read a card aloud and receive an interpretable result.

## Phase 3 — Archive

**Must have:** contribution form, language/dialect metadata, IndexedDB outbox, background sync, contribution feed, verification state.

**Exit:** a user can contribute offline and see the contribution sync later.

## Phase 4 — Community

**Must have:** peer confirmation, verification threshold, community feed, contributor identity, moderation primitives.

**Exit:** a contribution can progress from `pending_review` → `peer_verified`.

## Phase 5 — Discovery

**Must have:** Deck browser, Language Map, archive counts, language gaps, Pioneer indicators.

**Exit:** users can discover languages and identify where the archive needs contributions.

## Not MVP

dataset selling or licensing, free-text machine translation, a leaderboard before the contributor tier is live (D-042), marketplace, enterprise plans, advanced messaging, creator monetization, complex social graph, public unrestricted AI assistant, automatic cultural authority scoring.

## Execution strategy

Build in vertical slices, not one prompt.

| Sprint | Scope |
|---|---|
| 1 | App shell + design system + Royal Seal + navigation + database + Language/Deck/Card models |
| 2 | Reading Room + Card + progress + translation + session persistence |
| 3 | Microphone + recording + transcript + Resonance Score + waveform artifact |
| 4 | Community + contribution + IndexedDB outbox + sync + verification |
| 5 | Language Map + Deck discovery + archive gaps + Pioneer system |
| 6 | Testing + accessibility + offline testing + mobile QA + performance + security |

### Sprint 2 as built

Reading Room: Deck picker, Card player (Yorùbá first, reviewer-approved translation always visible beneath, context note, reviewer credit), Studio and Live modes, progress indicator, keyboard navigation, Deck unlock rule, reviewer gate, progress for the visit (`sessionStorage`), reading-session domain model and SQL tables.

Not in Sprint 2: recording, reference audio, scoring, accounts (Sprint 3 and later). Live therefore cannot finish a Card yet, so Proverb House cannot be unlocked in the running product until recording exists. The unlock rule is tested in the domain and was checked in the browser by injecting a completed Live attempt.

Sprint 3 scope is `SCORING_SPEC.md` section 13 (metrics approved). Nothing blocks it: D-036 settles the fallback and the Live completion rule.

### Sprint 3 part 1 as built: the scoring core

`packages/speech`: syllabifier, pitch tracker, resampler, MFCC, DTW alignment, Tone, Rhythm, Resonance Score, reference annotation builder and `analyzeAttempt`, with 82 tests on synthetic speech. See `SCORING_SPEC.md` section 14 for results and the changes testing forced.

### Sprint 3 part 2 as built: recording, results and the reviewer tool

Microphone capture and permission flow, Live and Studio recording, on-device analysis in a Web Worker, contour and marker results with the "tones and timing, not words" statement, `showResonanceNumber` switch, finishing a Card on an analysable Live attempt, reference playback with slow mode, reference provenance and annotation on Cards, migration 0003, Audacity label import, and the in-app annotation tool. See `SCORING_SPEC.md` section 15, including what is not verified.

Not built: reference audio offline caching (D-017), server storage for references and for attempts, accounts, the second reference voice, and anything that needs real speech: calibration, the linguist review and real reference voices (`OPEN_CONFLICTS.md` #17).

### Sprint 4 part 1 as built: local-first contributions

`packages/domain`: consent and licence fields (`consent.ts`, DRAFT wording), `Contribution` with validation and withdrawal, the outbox state machine with backoff and manual retry, `ContributionService`, peer confirmation rules and labels, migration 0004. Web: Community page with contribution form, draft consent screen, IndexedDB store, offline banner, local list with verification and sync states, withdraw. Browser check: `npm run e2e:community -w @ogbifo/web`.

Contributing needs an account, so anonymous readers see a plain explanation and a sign-in link instead of the form. Nothing syncs: the transport is forced off while the consent wording is a draft (D-038). Not built: accounts, server API, background sync worker, confirm UI, community feed, moderation, audio/video/link contributions. See `OPEN_CONFLICTS.md` #20.

### Sprint 4 part 2 as built: email-link sign-in

`packages/domain`: `AuthService` (request link, redeem once, sessions, sign-out, rate limits, no account enumeration), ports for users, tokens, sessions, rate limiting, email and crypto, in-memory adapters, migration 0005. Web: `/sign-in`, `/auth/verify` (button press to finish), `/api/auth/{request,redeem,signout,me}`, header account menu, Community reads the real session. Browser check: `npm run e2e:community -w @ogbifo/web` (app started with `OGBIFO_DEV_EMAIL=1` and `OGBIFO_BASE_URL`).

Storage follow-up (D-040): Postgres repositories for users, links, sessions and rate limits (migration 0006), a migration runner with checksums, `npm run migrate`, `DATABASE_URL` wiring; sessions survive a server restart on a real Postgres 16.

Not built: a real email provider, account deletion, choosing a display name, merging anonymous progress. See `OPEN_CONFLICTS.md` #21.

### Lexicon workflow as built

A spreadsheet-first way to fill the tone lexicon (D-042, D-043): `packages/domain` has a CSV reader, a dialect register, a tone-mark checker (a mark only on a vowel or n/m, one mark per letter, dot-below only on ẹ ọ ṣ, no letters outside the Yorùbá alphabet), and row validation (required cells, example needs a translation, duplicates, two different reviewers who speak the entry's dialect and are not the contributor, review date). Entries become Reviewed only when that holds; the rest stay drafts. `npm run lexicon -w @ogbifo/web -- check|export|template` checks a sheet and exports Reviewed entries (drafts only with `--drafts`). Sheets stay private: `.gitignore` keeps them out of this public repository. Instructions for the owner and the teacher: `apps/web/content/lexicon/README.md`.

Not built: the Reading Room Cards import (Cards are still code), any lexicon storage in the database, qualification test, the games, contributor tier. The checker tests marks and completeness, not whether the Yorùbá is right.

### Cards sheet as built

Same pattern as the lexicon, for Reading Room Cards (D-012, D-043): `packages/domain/src/card-sheet.ts` checks a CSV (id, Deck, category, dialect, Yorùbá text, translation, context, source, difficulty, contributor, reviewers) and `npm run cards -w @ogbifo/web -- check|export|template` exports Reviewed Cards (unreviewed only with `--unreviewed`) to `content/cards/cards.json`, which the app reads at start-up. Shared sign-off rule in `review.ts`. Song and praise-poem excerpts need a rights note (D-020). Sheets and exports are gitignored. Instructions: `apps/web/content/cards/README.md`.

Not built: Decks from a sheet (Decks are still defined in code), reference voices and annotations from a sheet, database storage of Cards. Tokens default to a placeholder (`OPEN_CONFLICTS.md` #24).
