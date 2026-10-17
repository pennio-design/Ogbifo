# Tone lexicon workspace

For the owner, the Yorùbá teacher and reviewers. Background: `docs/TONE_LEXICON_PROPOSAL.md`, decisions D-042 and D-043.

**A tone is recorded the way it sounds, in a named dialect.** Two dialects may differ on the same word; both can be right.

## Do not commit your sheets

This repository is public. A lexicon file here would publish contributors' work outside the licence they gave (the Project only). Keep your sheets in a private place. `.gitignore` already excludes `content/lexicon/*.csv` and `*.json` (except `dialects.json`).

## Fill in a sheet

1. Make a spreadsheet (Google Sheets or Excel) with exactly these column headings, in any order. `npm run lexicon -w @ogbifo/web -- template` prints them.

   `form, gloss, dialect, example, example_translation, source, contributor, reviewer_1, reviewer_1_dialect, reviewer_2, reviewer_2_dialect, reviewed_on, notes`

2. One row per word or short phrase.
   - **form**: the word with its tone marks and dot-below letters, written as it sounds in that dialect. Leave mid tone unmarked.
   - **gloss**: its English meaning. Words that differ only by tone need different glosses.
   - **dialect**: from `dialects.json` (id or name). Ask a reviewer to add a dialect first.
   - **source**: "own knowledge", or the book, speaker or site. Do not copy from books, dictionaries or websites you do not have the right to use.
   - **contributor**: who is adding it.
   - **reviewer_1 / reviewer_2**: two different people, neither the contributor, each speaking the entry's dialect (name them in `reviewer_N_dialect`; use `;` to list several). **reviewed_on**: the date, like `2026-10-31`.
3. Download as **CSV (UTF-8)**: Google Sheets "File, Download, Comma-separated values"; Excel "CSV UTF-8".

## Check it

```
npm run lexicon -w @ogbifo/web -- check path/to/sheet.csv
npm run lexicon -w @ogbifo/web -- export path/to/sheet.csv --out path/to/reviewed.json
npm run lexicon -w @ogbifo/web -- export path/to/sheet.csv --out path/to/all.json --drafts
```

`check` lists problems by spreadsheet row. It checks the marks and the file, not whether the Yorùbá is right. People decide that. An entry is **Reviewed** only when two different people who speak its dialect are named with a date. `export` writes Reviewed entries only unless you add `--drafts`. Nothing is ever called gold, certified or authoritative.
