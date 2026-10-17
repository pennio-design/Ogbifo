# Ogbifọ — Adding a Language

Ogbifọ launches with Yorùbá (`PRODUCT_DECISIONS.md` D-010). A language is added only when every item below is true. Adding one is a new decision in `PRODUCT_DECISIONS.md`.

## Gate

1. Yorùbá retention has met the threshold set in `OPEN_CONFLICTS.md` #15.
2. Two or more named native-speaker reviewers for the language (D-012).
3. Reference voices recorded, reviewed and licensed for the language (D-014).
4. A named orthography standard, and tone-marked Card text checked against it (D-015).
5. A validated tone or prosody model for scoring (`OPEN_CONFLICTS.md` #7). No score ships for a language without one.
6. Fonts verified: every letter and stacked mark of the language renders in the language face (`BRAND_SYSTEM.md`).
7. Dialect position decided (D-016).
8. Consent and licence wording reviewed for contributors in that language (D-020).

## Known facts per language

| Language | Tonal | Letters beyond Latin-1 | Font gap found in Sprint 1 | Notes |
|---|---|---|---|---|
| Igbo | Yes | ị ọ ụ ṅ, tone marks | `ṅ` missing from Fraunces (Noto supplies it) | Shares dot-below letters with Yorùbá, so the pitch pipeline and tone-mark entry transfer most easily. Stacked-mark rendering untested. |
| Hausa | Yes | ɓ ɗ ƙ ƴ, ʼ | None of Fraunces, Space Grotesk, Plus Jakarta Sans has `ɓ ɗ ƙ ƴ` (Noto supplies them) | Tone is rarely written; Boko orthography. Decide whether Cards show tone. |
| Pidgin (Naijá) | No (stress and intonation) | None | None | No single orthography standard. Pitch-contour scoring does not apply as designed. Needs a different metric or no score. |

## Already language-agnostic

`languageId` on Language, Dialect, Deck and Card; the content service and repositories; the SQL schema; grapheme-safe text helpers; `LanguageText` (sets `lang`, NFC for display).

## Not yet language-agnostic

Seed content; the pitch and tone model; tone-mark input helper; font subsets (the coverage check in `apps/web/scripts/subset-fonts.sh` lists Yorùbá letters only and must be extended per language).
