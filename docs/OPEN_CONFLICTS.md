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

1. **Linguist review** of the syllable and tone rules (`SCORING_SPEC.md` section 3) by volunteer Yorùbá linguists from the open call (D-032).
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
- **Range normalisation is my addition** to the approved metrics (clamp 0.6 to 1.67). It improved fairness on synthetic data and is one switch to turn off. Confirm it, or ask me to remove it before calibration.
- **A perfect-rhythm monotone reading scores about 40**, at the edge of the calibration bar.

