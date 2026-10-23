import { syllabify } from "@ogbifo/speech";
import { CARD_CATEGORIES, createCard, isCardCategory, type Card } from "./card";
import { parseCsv } from "./csv";
import { resolveDialect, type DialectRegister } from "./dialect";
import { checkToneMarks } from "./lexicon";
import { checkReview, type Finding } from "./review";
import { countGraphemes, isBlank } from "./text";

/**
 * Reading Room Cards from a spreadsheet (D-012, D-043). The owner, the teacher and
 * reviewers fill a sheet; this module checks it and turns finished rows into Cards.
 * It checks marks, completeness and sign-off. It cannot tell whether the Yorùbá or
 * the translation is right: that is what the two reviewers are for.
 */
export const CARD_SHEET_COLUMNS = [
  "id",
  "deck",
  "category",
  "dialect",
  "text",
  "translation",
  "context",
  "source",
  "rights",
  "difficulty",
  "tokens",
  "contributor",
  "reviewer_1",
  "reviewer_1_dialect",
  "reviewer_2",
  "reviewer_2_dialect",
  "reviewed_on",
  "notes",
] as const;
export type CardSheetColumn = (typeof CARD_SHEET_COLUMNS)[number];

const REQUIRED: readonly CardSheetColumn[] = ["id", "deck", "category", "dialect", "text", "translation", "context", "source", "difficulty", "contributor"];

export const MAX_CARD_GRAPHEMES = 400;
/** Placeholder until the token economy is specified (GAMIFICATION.md): flagged in OPEN_CONFLICTS #24. */
export const DEFAULT_TOKENS = 10;

export interface CardSheetContext {
  readonly register: DialectRegister;
  readonly deckIds: readonly string[];
  readonly languageId: string;
}

export interface CardRowReport {
  readonly row: number;
  readonly id: string;
  readonly errors: Finding[];
  readonly warnings: Finding[];
  readonly card: Card | null;
  /** The rights note, kept with the Card (D-020: song excerpts need a rights declaration). */
  readonly rights: string | null;
}

export interface CardSheetReport {
  readonly fatal: Finding[];
  readonly rows: CardRowReport[];
  readonly cards: Card[];
  readonly rights: Record<string, string>;
  readonly counts: { rows: number; ok: number; withErrors: number; reviewed: number; unreviewed: number };
}

const SAFE_ID = /^[a-z0-9][a-z0-9-]*$/;

function checkRow(cells: Record<CardSheetColumn, string>, ctx: CardSheetContext, errors: Finding[], warnings: Finding[], now: string): { card: Card | null; rights: string | null } {
  const need = (value: string, code: string, message: string) => {
    if (isBlank(value)) errors.push({ code, message });
  };
  need(cells.id, "ID_MISSING", "Give the Card an id, like card-yo-greeting-2. It never changes once Cards are in use.");
  if (!isBlank(cells.id) && !SAFE_ID.test(cells.id.trim())) {
    errors.push({ code: "ID_INVALID", message: "Use lower-case letters, digits and hyphens only in the id." });
  }
  if (isBlank(cells.deck)) errors.push({ code: "DECK_MISSING", message: "Name the Deck." });
  else if (!ctx.deckIds.includes(cells.deck.trim())) {
    errors.push({ code: "DECK_UNKNOWN", message: `Deck “${cells.deck.trim()}” does not exist. Known Decks: ${ctx.deckIds.join(", ")}.` });
  }
  const category = cells.category.trim();
  if (isBlank(category)) errors.push({ code: "CATEGORY_MISSING", message: "Choose a category." });
  else if (!isCardCategory(category)) errors.push({ code: "CATEGORY_UNKNOWN", message: `Category must be one of: ${CARD_CATEGORIES.join(", ")}.` });

  need(cells.translation, "TRANSLATION_MISSING", "Add the English translation.");
  need(cells.context, "CONTEXT_MISSING", "Add a short context note: when and why this is said.");
  need(cells.source, "SOURCE_MISSING", 'Say where it comes from, for example "own knowledge" or the book or speaker.');
  need(cells.contributor, "CONTRIBUTOR_MISSING", "Say who contributed it.");

  need(cells.text, "TEXT_MISSING", "The Yorùbá text is empty.");
  if (!isBlank(cells.text)) {
    if (countGraphemes(cells.text) > MAX_CARD_GRAPHEMES) {
      errors.push({ code: "TEXT_TOO_LONG", message: `A Card is a phrase or a proverb: ${MAX_CARD_GRAPHEMES} characters at most.` });
    }
    const marks = checkToneMarks(cells.text, { punctuation: true });
    errors.push(...marks.errors);
    warnings.push(...marks.warnings);
  }

  const difficulty = Number(cells.difficulty);
  if (isBlank(cells.difficulty)) errors.push({ code: "DIFFICULTY_MISSING", message: "Difficulty is 1, 2 or 3." });
  else if (![1, 2, 3].includes(difficulty)) errors.push({ code: "DIFFICULTY_INVALID", message: "Difficulty must be 1, 2 or 3." });

  let tokens = DEFAULT_TOKENS;
  if (!isBlank(cells.tokens)) {
    tokens = Number(cells.tokens);
    if (!Number.isInteger(tokens) || tokens < 0) {
      errors.push({ code: "TOKENS_INVALID", message: "tokens must be a whole number, zero or more." });
      tokens = DEFAULT_TOKENS;
    }
  }

  const dialect = resolveDialect(ctx.register, cells.dialect);
  if (isBlank(cells.dialect)) errors.push({ code: "DIALECT_MISSING", message: "Name the dialect of the Yorùbá text." });
  else if (dialect === null) errors.push({ code: "DIALECT_UNKNOWN", message: `“${cells.dialect.trim()}” is not in the dialect register. Ask a reviewer to add it.` });

  // D-020: song and praise-poetry excerpts are the copyright risk; they need a rights declaration.
  const rights = isBlank(cells.rights) ? null : cells.rights.trim();
  if (category === "praise_song_excerpt" && rights === null) {
    errors.push({ code: "RIGHTS_MISSING", message: "A song or praise-poem excerpt needs a rights note: who holds the rights, or who gave permission." });
  }
  if (category === "praise_song_excerpt") warnings.push({ code: "COPYRIGHT_CARE", message: "Songs and praise poems may be copyrighted. Do not copy from recordings or books without permission." });

  const review = checkReview({
    contributor: cells.contributor,
    dialect,
    register: ctx.register,
    slots: [
      { name: cells.reviewer_1, dialects: cells.reviewer_1_dialect },
      { name: cells.reviewer_2, dialects: cells.reviewer_2_dialect },
    ],
    reviewedOn: cells.reviewed_on,
    errors,
    warnings,
  });
  if (errors.length > 0 || dialect === null) return { card: null, rights };

  const syl = syllabify(cells.text);
  for (const issue of syl.issues) warnings.push({ code: "SYLLABLE_ISSUE", message: `The syllable rules could not read part of this: ${issue}.` });

  const created = createCard({
    id: cells.id.trim(),
    deckId: cells.deck.trim(),
    languageId: ctx.languageId,
    dialectId: dialect,
    category: category as Card["category"],
    sourceText: cells.text,
    translation: cells.translation.trim(),
    context: cells.context.trim(),
    source: cells.source.trim(),
    tokenValue: tokens,
    difficulty: difficulty as Card["difficulty"],
    createdAt: now,
    reviewStatus: review.signed ? "reviewed" : "unreviewed",
    reviewers: review.reviewers.map((r) => r.name),
    ...(review.signed && review.reviewedOn !== null ? { reviewedAt: review.reviewedOn } : {}),
  });
  if (!created.ok) {
    errors.push({ code: created.error.code, message: created.error.message });
    return { card: null, rights };
  }
  return { card: created.value, rights };
}

/** Check a Cards spreadsheet exported as CSV. Never throws on bad content. */
export function checkCardSheetCsv(csv: string, ctx: CardSheetContext, now: string): CardSheetReport {
  const empty = { rows: 0, ok: 0, withErrors: 0, reviewed: 0, unreviewed: 0 };
  const table = parseCsv(csv);
  const header = table[0]?.map((h) => h.trim().toLowerCase());
  if (!header) return { fatal: [{ code: "EMPTY_FILE", message: "The file is empty." }], rows: [], cards: [], rights: {}, counts: empty };
  const fatal: Finding[] = [];
  const missing = REQUIRED.filter((c) => !header.includes(c));
  if (missing.length > 0) fatal.push({ code: "COLUMNS_MISSING", message: `Missing columns: ${missing.join(", ")}.` });
  const unknown = header.filter((h) => h !== "" && !(CARD_SHEET_COLUMNS as readonly string[]).includes(h));
  if (unknown.length > 0) fatal.push({ code: "COLUMNS_UNKNOWN", message: `Columns not recognised (check the spelling): ${unknown.join(", ")}.` });
  if (missing.length > 0) return { fatal, rows: [], cards: [], rights: {}, counts: empty };

  const rows: CardRowReport[] = [];
  const cards: Card[] = [];
  const rights: Record<string, string> = {};
  const seenId = new Map<string, number>();
  const seenText = new Map<string, number>();

  table.slice(1).forEach((raw, i) => {
    const row = i + 2;
    if (raw.every((c) => isBlank(c))) return;
    const cells = Object.fromEntries(CARD_SHEET_COLUMNS.map((c) => [c, raw[header.indexOf(c)] ?? ""])) as Record<CardSheetColumn, string>;
    const errors: Finding[] = [];
    const warnings: Finding[] = [];
    const result = checkRow(cells, ctx, errors, warnings, now);

    const id = cells.id.trim();
    if (id !== "") {
      const first = seenId.get(id);
      if (first !== undefined) errors.push({ code: "DUPLICATE_ID", message: `The id is already used in row ${first}.` });
      else seenId.set(id, row);
    }
    if (!isBlank(cells.text)) {
      const key = `${cells.deck.trim()}|${cells.text.normalize("NFC").trim().toLowerCase()}`;
      const first = seenText.get(key);
      if (first !== undefined) errors.push({ code: "DUPLICATE_TEXT", message: `Same text in the same Deck as row ${first}.` });
      else seenText.set(key, row);
    }

    const card = errors.length === 0 ? result.card : null;
    if (card) {
      cards.push(card);
      if (result.rights !== null) rights[card.id] = result.rights;
    }
    rows.push({ row, id, errors, warnings, card, rights: result.rights });
  });

  const withErrors = rows.filter((r) => r.errors.length > 0).length;
  return {
    fatal,
    rows,
    cards,
    rights,
    counts: {
      rows: rows.length,
      ok: rows.length - withErrors,
      withErrors,
      reviewed: cards.filter((c) => c.reviewStatus === "reviewed").length,
      unreviewed: cards.filter((c) => c.reviewStatus === "unreviewed").length,
    },
  };
}

export interface CardFile {
  readonly schemaVersion: 1;
  readonly generatedAt: string;
  readonly includesUnreviewed: boolean;
  readonly cards: readonly Card[];
  /** Rights notes by Card id (D-020). */
  readonly rights: Readonly<Record<string, string>>;
}

/** Reviewed Cards only, unless unreviewed ones are asked for (they show only where policy allows, D-012). */
export function exportCards(report: CardSheetReport, generatedAt: string, includeUnreviewed = false): CardFile {
  const cards = report.cards.filter((c) => includeUnreviewed || c.reviewStatus === "reviewed");
  return {
    schemaVersion: 1,
    generatedAt,
    includesUnreviewed: includeUnreviewed,
    cards,
    rights: Object.fromEntries(Object.entries(report.rights).filter(([id]) => cards.some((c) => c.id === id))),
  };
}

/**
 * Read an exported Card file defensively. A Card that fails validation is skipped
 * with a reason, never half-applied.
 */
export function parseCardFile(data: unknown): { cards: Card[]; rejected: { id: string; reason: string }[] } {
  const out = { cards: [] as Card[], rejected: [] as { id: string; reason: string }[] };
  if (typeof data !== "object" || data === null || !("cards" in data) || !Array.isArray(data.cards)) {
    out.rejected.push({ id: "(file)", reason: "Not a Card file." });
    return out;
  }
  for (const item of data.cards as unknown[]) {
    const id = typeof item === "object" && item !== null && "id" in item ? String((item as { id: unknown }).id) : "(unknown)";
    const created = createCard(item as Card);
    if (created.ok) out.cards.push(created.value);
    else out.rejected.push({ id, reason: created.error.message });
  }
  return out;
}

export const cardSheetTemplate = (): string => CARD_SHEET_COLUMNS.join(",") + "\n";
