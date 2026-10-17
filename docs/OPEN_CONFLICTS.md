# Ogbifọ — Open Questions

Per `CLAUDE.md`: when requirements conflict, flag rather than silently choose. Only unresolved items are listed. Decided items live in `PRODUCT_DECISIONS.md`. Numbers are stable so other documents can cite them.

Status key: **BEFORE-PHASE-N** (resolve before that MVP phase), **MINOR**.

Also open: the revenue model for the consumer product is undefined. Not a Phase 1 blocker.

---

## 4. Verification can be gamed — BEFORE-PHASE-4

Peer verification supports community trust and archive quality. It is not dataset certification (D-004). That lowers the stakes, but the weakness remains: `peer_verified` at 5 confirmations has no sybil resistance, so five throwaway accounts can mark anything verified and degrade trust in the Archive.

Still unspecified: who may confirm (any user, or speakers of that language), how a confirmer's competence is established, and what `flagged` and `rejected` require. Minimum before Phase 4: rate limits, one-account-per-person signals, and a moderation path to revoke `peer_verified`.

## 5. Consent, licensing and copyright — BEFORE-PHASE-3

Not a dataset concern, but still required: users contribute recordings, media, lyrics and cultural material (D-003, D-005). `DATA_MODEL.md` has no consent, license, rights or retention fields.

- Lyrics and songs are copyrighted. "Praise/song excerpt" is a listed content type, and external media URLs are accepted.
- Voice recordings are personal data. Nigeria's data protection law (NDPA) applies.
- Cultural material may carry community or family ownership that the contributor does not hold alone.
- The grant must be scoped to what Ogbifọ actually does: display in the Archive, community verification, the contributor's own practice. Any use beyond that (training, licensing, sale) needs new, separate consent. It must not be bundled into the original terms.

Minimum fields before any contribution is stored: `consentVersion`, `licenseGrant` (scoped as above), `rightsDeclaration`, `speakerConsentForAudio`, `retentionPolicy`, and a withdrawal path.

## 7. Define the pitch-contour metrics — BEFORE-PHASE-2

D-014 settles the approach: compare the learner's pitch contour and timing to a native reference, syllable by syllable. Still undefined, and each needs a deterministic spec and tests before UI:

- Syllable segmentation of tone-marked text (derivable from orthography: Yorùbá syllables are V, CV or syllabic nasal) and alignment of audio to it.
- Pitch extraction method (F0 algorithm), voiced/unvoiced handling, and noisy phone-mic input.
- Speaker normalization: tone is relative, so compare in semitones against the speaker's own range, not absolute Hz. Men, women and children must score fairly against the same reference.
- Tone model: three level tones (high, mid, low) plus the contour effects of context. Whether to score the three levels, or the contour shape against the reference.
- What replaces Clarity, Rhythm and Boldness. Proposed: Tone (contour match), Rhythm (timing match), and an overall that is not a bare average. Needs your approval.
- Thresholds and the wording shown to the learner. The score is guidance and never says a reading is "correct" or "authentic".
- Reference audio: who records it, in which dialect, under what licence and fee (see D-012).

## 8. "Sovereign" has two meanings — MINOR

Brand: sovereign courts (the *client* of the interpreter). Product: top progression rank and "first Sovereign" of a language. The user is cast as the king in one place and the interpreter in another. Pick one stance; the Ogbifọ is the interpreter, so rank titles are arguably better drawn from the interpreter's role (Keeper, Interpreter) than from the court.

## 11. Brand typeface cannot set Yorùbá — BEFORE-PHASE-1 (interim fix shipped)

The guidelines assign language artifacts to Fraunces and claim Space Grotesk never clips diacritics. Measured in Sprint 1: both mis-position a tone mark stacked on a dot-below letter (`ẹ́`, `ọ̀`, as in the Reading Room's own proverb), in NFC and NFD. Fraunces also lacks `ǹ`. Interim: language text is set in Noto Serif (`LanguageText` component); Fraunces stays for the wordmark and English headlines.

Decide: (a) keep Noto Serif for language text, (b) choose another serif that passes the stacked-mark test, (c) commission Fraunces anchor fixes. Whichever is chosen must pass `Ẹni tó bá fẹ́ jẹun, kò gbọdọ̀ jẹkí` rendered in Chromium, Safari and Firefox. Only Chromium has been checked.

## 12. Tier versus difficulty — MINOR

A Card shows "TIER 2" in the UX spec, but the data model has `Deck.tier` and `Card.difficulty` as separate fields. Sprint 1 shows `Card.difficulty` on the Card and `Deck.tier` on the Deck. Confirm they are meant to differ.
