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

dataset selling or licensing, free-text machine translation, leaderboards, marketplace, enterprise plans, advanced messaging, creator monetization, complex social graph, public unrestricted AI assistant, automatic cultural authority scoring.

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

Sprint 3 scope depends on `SCORING_SPEC.md` (draft, section 13). Do not start it before that spec is approved.
