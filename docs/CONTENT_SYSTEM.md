# Ogbifọ — Content System

## Content types

MVP: proverb, greeting, daily speech, praise/song excerpt, market expression, cultural expression, general phrase.

The existing concept references proverbs, market calls and praise songs as source material.

> Copyright: song excerpts need a rights position before ingestion. See `OPEN_CONFLICTS.md` #5.

## Content metadata

Every artifact should attempt to capture: language, dialect, region, category, source, contributor, translation, context, verification state.

## Content selection

The Reading Room may select content using: language + difficulty + region + deck + archive gaps + user progress.

## Preservation rule

Never overwrite the original submitted text when creating a normalized representation.

Store `originalText`, `normalizedText` and `translation` as separate values when normalization is required.

## Orthography

Yorùbá orthography is a priority. The brand guidelines require support for tone marks, dot-belows and correct glyph heights.

Examples that must render correctly: `Ogbifọ̀`, `Àmì`, `Ẹ̀kọ́`, `ọ`, `ẹ`, `ṣ`, `à`, `á`.

The system must be Unicode-safe end to end. Compare text under a defined normalization form (NFC) but store the original bytes as submitted.
