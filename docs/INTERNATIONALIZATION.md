# Ogbifọ — Internationalization

**Status: stub.** Requirements already stated elsewhere, collected here:

- Unicode is first-class data. Never assume ASCII (`PRD.md` §5).
- Never truncate based on byte length (`PRD.md` §5). Truncate by grapheme cluster.
- Store `originalText` exactly as submitted; compare under NFC; keep `normalizedText` separate (`CONTENT_SYSTEM.md`).
- Tone marks, dot-belows and correct glyph heights must render in every brand typeface (`BRAND_SYSTEM.md`).
- Translation must not silently remove diacritics (`PRD.md` §3.4).

To define: UI language(s), locale fallbacks, right-to-left handling for Hausa Ajami (if in scope), input methods for tone-marked text, search normalization (diacritic-insensitive matching without altering stored text), and character/word counting by grapheme.
