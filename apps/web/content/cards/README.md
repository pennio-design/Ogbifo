# Reading Room Cards workspace

For the owner, the Yorùbá teacher and reviewers. Decisions: D-012 (two named reviewers per Card), D-043 (dialect-aware). Sibling workflow for single words: `../lexicon/README.md`.

## Do not commit your sheets

This repository is public. Card text is contributors' work licensed to the Project only. `.gitignore` excludes `content/cards/*.csv` and `*.json`. Keep sheets in a private place.

## Fill in a sheet

1. A spreadsheet with exactly these column headings (any order). `npm run cards -w @ogbifo/web -- template` prints them.

   `id, deck, category, dialect, text, translation, context, source, rights, difficulty, tokens, contributor, reviewer_1, reviewer_1_dialect, reviewer_2, reviewer_2_dialect, reviewed_on, notes`

2. One row per Card.
   - **id**: lower-case letters, digits and hyphens, like `card-yo-greeting-2`. It never changes once Cards are in use.
   - **deck**: `common-tongue-yo` or `proverb-house-yo` (the Decks that exist).
   - **category**: `proverb`, `greeting`, `daily_speech`, `praise_song_excerpt`, `market_expression`, `cultural_expression` or `general_phrase`.
   - **dialect**: from `../lexicon/dialects.json`.
   - **text**: the Yorùbá with tone marks, as it sounds in that dialect. A line break is fine. Leave mid tone unmarked.
   - **translation**, **context** (when and why it is said), **source** (for example "own knowledge").
   - **rights**: required for `praise_song_excerpt`. Who holds the rights, or who gave permission. Do not copy songs or books without permission.
   - **difficulty**: 1, 2 or 3. **tokens**: optional whole number (default 10, a placeholder).
   - **contributor**, then **reviewer_1/2** and their dialects, and **reviewed_on** (`2026-10-31`). Two different people, neither the contributor, each speaking the Card's dialect.
3. Download as **CSV (UTF-8)**.

## Check, export, preview

```
npm run cards -w @ogbifo/web -- check sheet.csv
npm run cards -w @ogbifo/web -- export sheet.csv            # Reviewed Cards -> content/cards/cards.json
npm run cards -w @ogbifo/web -- export sheet.csv --unreviewed   # also unreviewed, for previews only
npm run dev -w @ogbifo/web                                   # the Reading Room shows them
```

`check` lists problems by spreadsheet row. It checks marks and completeness, not whether the Yorùbá or the translation is right; the two reviewers decide that. A Card is **Reviewed** only with two different named reviewers who speak its dialect and a date. In a production build only Reviewed Cards are shown (D-012); `next dev` also shows unreviewed ones, marked as such. Cards from a sheet replace developer seed Cards with the same id. Exports are read from `content/cards/` (or `OGBIFO_CARDS_DIR`).
