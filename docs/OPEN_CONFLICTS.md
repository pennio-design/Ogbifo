# Ogbifọ — Open Questions

Per `CLAUDE.md`: when requirements conflict, flag rather than silently choose. Only unresolved items are listed. Decided items live in `PRODUCT_DECISIONS.md`. Numbers are stable so other documents can cite them.

Resolved and removed: #8 (Sovereign retired, D-025).

Status key: **BEFORE-PHASE-N** (resolve before that MVP phase), **MINOR**.

Also open: the revenue model for the consumer product is undefined. Not a Phase 1 blocker.

---

## 4. Verification abuse controls — BEFORE-PHASE-4

D-021 sets who may confirm and splits "Peer confirmed" from "Reviewed". Still to specify: how fluency is declared and what stops a throwaway account from declaring it, rate limits per account and per device, how a wrongly confirmed entry is revoked, what `flagged` and `rejected` require, and who the named reviewers are and how they are appointed and removed.

## 5. Consent and licensing: implementation — BEFORE-PHASE-3

Policy is decided (D-005, D-019, D-020). Still to build and word: `Contribution` fields (`consentVersion`, `licenseGrant`, `rightsDeclaration`, `speakerConsentForAudio`, `retentionPolicy`, `withdrawnAt`); the consent screen copy, reviewed by a lawyer; the withdrawal flow and what it does to entries already confirmed or reviewed; and the rights declaration for lyrics. Voice recordings are personal data under Nigeria's data protection law (NDPA) and, for diaspora users, likely GDPR or UK GDPR as well. Counsel needed on lawful basis and retention before Phase 3.

## 7. Pitch-contour metrics — RESOLVED (D-031, D-036)

Tone and Rhythm are approved. If calibration fails, Live shows contour and markers with no number. `SCORING_SPEC.md` is the design. Ship gates are in #17.

## 11. Brand typeface cannot set Yorùbá — BEFORE-PHASE-1 (interim fix shipped)

The guidelines assign language artifacts to Fraunces and claim Space Grotesk never clips diacritics. Measured in Sprint 1: both mis-position a tone mark stacked on a dot-below letter (`ẹ́`, `ọ̀`, as in the Reading Room's own proverb), in NFC and NFD. Fraunces also lacks `ǹ`. Interim: language text is set in Noto Serif (`LanguageText` component); Fraunces stays for the wordmark and English headlines.

Decide: (a) keep Noto Serif for language text, (b) choose another serif that passes the stacked-mark test, (c) commission Fraunces anchor fixes. Whichever is chosen must pass `Ẹni tó bá fẹ́ jẹun, kò gbọdọ̀ jẹkí` rendered in Chromium, Safari and Firefox. Only Chromium has been checked.

## 12. Tier versus difficulty — MINOR

A Card shows "TIER 2" in the UX spec, but the data model has `Deck.tier` and `Card.difficulty` as separate fields. Sprint 1 shows `Card.difficulty` on the Card and `Deck.tier` on the Deck. Confirm they are meant to differ.

## 13. Analytics vendor and consent design — BEFORE-PHASE-1 launch

D-028 fixes the guardrails. Open: which vendor (data location, DPA, replay masking support); banner copy and default state; how consent is stored and withdrawn; GDPR/UK GDPR for diaspora users and NDPA for Nigeria; and an automated test that proves no event payload contains audio, pitch data or typed language text.

## 14. Define "finished" for Common Tongue — BEFORE-PHASE-2

D-029 gates Proverb House on finishing Common Tongue. Proposed: every Card in Common Tongue has at least one completed Live attempt. Alternatives: every Card seen, or a minimum average score. Partly settled by D-036: an attempt is finished when its recording is clear enough to analyse. Sprint 2 implements the Card-level rule in `progress.ts` (one place to change). Decide, and decide what an anonymous reader sees when they reach the end (an account prompt to keep progress and unlock the next Deck). Note: the gate adds a place to stall inside a 30 to 50 person beta, so read week-2 and week-4 return alongside the Deck-completion funnel, not instead of it.

## 15. Expansion gate thresholds — AFTER LAUNCH

`LANGUAGE_EXPANSION.md` defines the gate for adding a language. Still to set: the Yorùbá retention threshold that opens the gate (week-2 and week-4 return from D-026), the number of reviewers and voices per additional language, and whether Igbo, Hausa and Pidgin keep the planned order once real demand is known.

## 16. Open items found in Sprint 2 — MINOR

- A missing Deck URL shows the not-found page but returns HTTP 200, because the app-level loading state starts streaming before the page can return 404. Harmless for users; matters for search indexing and monitoring if Deck URLs are ever linked publicly.
- Anonymous progress lasts for one visit (D-022). Decide what happens to it when the learner creates an account mid-visit: merge into the new account, or discard.
- Cards inside a Deck are ordered easiest first, then by id. This was not specified; confirm.
- The Decks catalogue page cannot show whether a Deck is unlocked, because progress lives in the browser. The Reading Room picker does.

## 17. Ship gates for the beta — BEFORE BETA

Building does not wait for these. Shipping to beta users does.

1. **Linguist review** of the syllable and tone rules (`SCORING_SPEC.md` section 3) by volunteer Yorùbá linguists from the open call (D-032). Reviewers will also use the annotation tool, so they should try it on a real recording first.
2. **Calibration** against the pass bars in `SCORING_SPEC.md` section 10, with at least 20 volunteer speakers. Their recordings are voice data: written consent, a stated purpose (calibration only), a storage location, and a deletion date, reviewed by counsel. Any reward paid to them is separate from, and never a condition of, the consent.
3. **Reference voices** with provenance records (D-034): two voices, licensed.
4. **Reviewers** for every beta Card (D-012): two per Card.
5. **Counsel review** of consent, licensing and provenance wording (#5).
6. **Number switch:** `showResonanceNumber` stays off until calibration passes (D-036).

## 18. Findings from the scoring core — BEFORE BETA

From Sprint 3 part 1 (`SCORING_SPEC.md` section 14). Tested on synthetic speech only.

- **The score does not check words.** Same tones and timing with different words can score high. The results screen must say it measures tones and timing. Decide whether that is acceptable for the product promise, or whether a words check is needed later.
- **Wrong-words detection is not possible with alignment cost** (it overlaps with legitimate voice differences). Not a goal of the current design.
- **Very different voices align at higher cost.** Plan two reference voices, one lower and one higher, and score against the better alignment. Not built.
- **Phone speed is unmeasured.** 201 ms for 9 s of audio on a developer machine; target is under 2 s on a Moto G-class phone. Test on a real device early in part 2.
- **Range normalisation** (clamp 0.6 to 1.67) is approved and kept (D-037). Calibration decides whether the clamp needs retuning.
- **A perfect-rhythm monotone reading scores about 40**, at the edge of the calibration bar.

## 19. Findings from recording and the reviewer tool — BEFORE BETA

From Sprint 3 part 2 (`SCORING_SPEC.md` section 15). Browser-tested with synthetic voices and a fake microphone, in Chromium only.

- **Safari and Firefox are untested.** Recording uses an audio worklet and a Web Worker. Safari on iPhone matters most for diaspora learners. Test there before beta.
- **Microphone settings are a guess.** Echo cancellation and noise suppression are off to protect pitch; real phones may need different settings. Compare on devices during calibration.
- **Reference audio is not cached for offline use** (D-017). A learner without a connection cannot hear or be scored against a reference.
- **References are files placed by hand.** The tool's output goes into `content/references/` and `public/references/`. Fine for a beta of 60 Cards; not a process for a platform. Needs storage and accounts later.
- **The reviewer tool is protected by a deployment switch, not a login.** Until accounts exist, switch it on only on a private deployment.
- **The tool trusts the reviewer's boundaries.** It proposes an even split of the speech and shows a pitch-found percentage, but it does not check that the boundaries are plausible. A poor annotation would quietly mis-score every learner on that Card. Consider a second reviewer confirming each annotation (D-012 already needs two reviewers per Card).
- **No real reference voice has been tested.** The only reference is a synthetic tone sequence.

## 20. Findings from the contribution flow — BEFORE-PHASE-3 launch

From Sprint 4 part 1 (D-038). Browser-tested in Chromium only.

- **Contributing needs an account** (D-038), and sign-in by email link now exists (D-039, #21). Contributions are stored per browser in IndexedDB, filtered by `userId`; a signed-in user on a second device sees nothing until sync exists. Signing out leaves that browser's contributions on the device; on a shared device they are visible again to the same account on sign-in. Decide whether sign-out should clear them (it would lose unsynced work).
- **The consent wording is a draft.** Sync is off in code until counsel reviews it (`CONSENT_IS_DRAFT`). `docs/COUNSEL_BRIEFING.md` lists the questions.
- **Rights note rule is a guess.** A note is required for lyrics and for anything not the contributor's own work. Counsel may want more (or a stronger warranty). Communal knowledge such as proverbs and oriki may not belong to one person; the "I wrote or said it myself" option may be wrong for them.
- **Contribution kinds are inferred.** Phrase, proverb and greeting come from the Community page copy; lyric from D-020. The PRD names types text, audio, video and external URL, which are not built.
- **Audio contributions are blocked** on `speakerConsentForAudio` handling: who the speaker is, whether the uploader is the speaker, local storage of large blobs.
- **Label conflict.** D-021 and VERIFICATION_SYSTEM say "Peer confirmed"; UX_SPEC says "Peer verified". The product uses "Peer confirmed" (D-021, newer).
- **Withdrawal after confirmation** is implemented as hide-and-queue. What the server keeps of confirmations, and whether withdrawal can be refused for reviewed material, is for counsel (briefing Q9).
- **No server.** The outbox, backoff and idempotency are tested against a fake transport only. The SQL schema (migration 0004) exists but nothing writes to it. Self-confirmation is enforced in the domain function, not in SQL.
- **Dialect is free text.** The Language Map has no dialect list yet (D-013), so Pioneer and gap counts cannot use it.

## 21. Findings from email-link sign-in — BEFORE-PHASE-3 launch

From Sprint 4 part 2 (D-039). Browser-tested in Chromium only, against the development mailbox.

- **No email provider.** Sign-in is closed outside the local development mailbox. Choose a sender (data location, deliverability to Nigerian and diaspora addresses, DPA) and name it in the privacy notice. Nobody can sign in on a real deployment until then.
- **Storage is durable only with `DATABASE_URL`.** Postgres adapters now exist for accounts, links, sessions and rate limits (D-040). Without a database, development uses memory and production keeps sign-in closed. Still open: where the database and the app are hosted, backups, and connection limits on a serverless host (the pool is 5 connections per process).
- **Email is personal data.** Counsel: lawful basis, retention (keep an account with no activity for how long?), deletion on request, privacy notice. Added to `COUNSEL_BRIEFING.md`.
- **Rate limiting trusts `X-Forwarded-For`.** It is only as good as the proxy in front. Behind a platform that sets it reliably this is fine; otherwise per-IP limits can be dodged. Per-address limits still hold.
- **Account deletion and email change are not built.**
- **Display name** is "Reader" for everyone until a name can be chosen. Two Readers are indistinguishable in the community; choosing a name needs rules (uniqueness, impersonation, offensive names).
- **Anonymous progress is not merged** into the account on sign-in (#16): it still lives in sessionStorage for the visit.
- **Link in the email is a bearer secret.** Anyone with access to the inbox can sign in. Normal for email links; no second factor is planned.
- **The `pg` driver adapter is checked by hand, not by a test in CI.** The repositories are tested against embedded Postgres (PGlite) with the same contract as the in-memory ones, and sign-in plus the browser checks were run once against a real Postgres 16, including a server restart. CI has no Postgres service yet.
- **Contributions have no server tables in use.** The tables exist (0004); no repository or API writes to them, by design while the consent wording is a draft (D-038).
- **Prefetch.** The Next.js router prefetches nav links in two waves on load. Harmless, but the pages never go "network idle", which matters for test design.
- **Cookie `Secure`** is set only when `OGBIFO_BASE_URL` is https. Production must set it.

## 22. Idea: live follow-along captions — NOT DECIDED

Raised by the owner: as the learner speaks, show the Yorùbá and the English together, and mark which syllables landed. Two very different things hide in that:

- **Follow-along on a known Card (bounded).** The Card's reviewed Yorùbá text and reviewed English translation are already on screen. As the learner speaks, highlight progress through the syllables and colour each one for its pitch step. The alignment and per-syllable markers already exist (SCORING_SPEC); what is missing is running them on partial audio as it arrives. Fits the core loop (step 5, subtitles and feedback), D-014 and "translation always visible". Open questions: delay on a Moto G-class phone (analysis of 9 s took 201 ms on a developer machine, but it runs once, not continuously), what to show when the learner skips or repeats words, and the results screen staying the record.
- **Open captions of any Yorùbá speech (unbounded).** Recognise free speech, write it with correct tone marks, and translate it live. That is free-text machine translation (MVP_SCOPE "Not MVP"), depends on speech recognition and tone restoration that are research-grade for Yorùbá, and a confident wrong caption damages the product's promise of preserving tone marks. The earlier tone-restoration benchmark that was removed from this repository (D-006) was about exactly this difficulty. Not planned.

Recommendation: do not build either before the beta gates (#17). After a real-speech test, decide whether the bounded follow-along is the signature interaction. It reuses most of what exists; the unbounded one does not belong in this product yet.
