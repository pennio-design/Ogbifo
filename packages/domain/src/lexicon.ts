import { syllabify, type Tone } from "@ogbifo/speech";
import { parseCsv } from "./csv";
import { resolveDialect, type DialectRegister } from "./dialect";
import { countGraphemes, isBlank } from "./text";

/**
 * Tone lexicon workflow (TONE_LEXICON_PROPOSAL.md, D-042, D-043). People fill in a
 * spreadsheet; this module checks it. A tone is recorded the way it sounds in a
 * named dialect. Nothing here decides what is right: it checks that marks are
 * well formed, that the file is complete, and that two different people who speak
 * the dialect have signed an entry before it counts as Reviewed.
 */
export const LEXICON_COLUMNS = [
  "form",
  "gloss",
  "dialect",
  "example",
  "example_translation",
  "source",
  "contributor",
  "reviewer_1",
  "reviewer_1_dialect",
  "reviewer_2",
  "reviewer_2_dialect",
  "reviewed_on",
  "notes",
] as const;
export type LexiconColumn = (typeof LEXICON_COLUMNS)[number];

const REQUIRED_COLUMNS: readonly LexiconColumn[] = ["form", "gloss", "dialect", "source", "contributor"];

export interface Finding {
  readonly code: string;
  readonly message: string;
}

const GRAVE = "̀";
const ACUTE = "́";
const MACRON = "̄";
const DOT_BELOW = "̣";
const TONE_MARKS = new Set([GRAVE, ACUTE, MACRON]);
const CAN_CARRY_TONE = new Set(["a", "e", "i", "o", "u", "n", "m"]);
const CAN_TAKE_DOT = new Set(["e", "o", "s"]);
// Not in the Yorùbá alphabet.
const NOT_YORUBA = new Set(["c", "q", "v", "x", "z"]);

/** Checks the marks on one written form. Errors stop an entry; warnings do not. */
export function checkToneMarks(form: string): { errors: Finding[]; warnings: Finding[] } {
  const errors: Finding[] = [];
  const warnings: Finding[] = [];
  const groups: { base: string; marks: string[] }[] = [];
  for (const char of Array.from(form.normalize("NFD"))) {
    if (/\p{M}/u.test(char)) {
      const last = groups[groups.length - 1];
      if (last) last.marks.push(char);
      else errors.push({ code: "MARK_WITHOUT_LETTER", message: "A tone mark has no letter before it." });
    } else groups.push({ base: char, marks: [] });
  }

  let letters = 0;
  for (const { base, marks } of groups) {
    const lower = base.toLowerCase();
    if (/[\s'’-]/u.test(base)) continue;
    if (!/\p{L}/u.test(base)) {
      errors.push({ code: "UNEXPECTED_CHARACTER", message: `Unexpected character “${base}”.` });
      continue;
    }
    letters += 1;
    if (NOT_YORUBA.has(lower) || !/^[a-z]$/.test(lower)) {
      errors.push({ code: "NOT_YORUBA_LETTER", message: `“${base}” is not a Yorùbá letter.` });
      continue;
    }
    const tones = marks.filter((m) => TONE_MARKS.has(m));
    const dot = marks.includes(DOT_BELOW);
    const others = marks.filter((m) => !TONE_MARKS.has(m) && m !== DOT_BELOW);
    const shown = (base + marks.join("")).normalize("NFC");
    if (tones.length > 1) errors.push({ code: "STACKED_TONE", message: `Two tone marks on one letter: “${shown}”.` });
    if (tones.length > 0 && !CAN_CARRY_TONE.has(lower)) {
      errors.push({ code: "TONE_ON_CONSONANT", message: `A tone mark on “${base}”. Only vowels and the nasals n and m carry tone.` });
    }
    if (dot && !CAN_TAKE_DOT.has(lower)) {
      errors.push({ code: "BAD_DOT_BELOW", message: `A dot below “${base}”. Only ẹ, ọ and ṣ take one.` });
    }
    if (others.length > 0) errors.push({ code: "UNEXPECTED_MARK", message: `An unexpected mark on “${shown}”.` });
    if (tones.includes(MACRON)) {
      warnings.push({ code: "MACRON_MID", message: `“${shown}” marks mid tone with a macron. Mid tone is normally left unmarked.` });
    }
  }
  if (letters === 0) errors.push({ code: "NO_LETTERS", message: "There are no letters." });
  return { errors, warnings };
}

/** The form with its tone marks removed and its dot-below letters kept. */
export function stripToneMarks(form: string): string {
  return Array.from(form.normalize("NFD"))
    .filter((c) => !TONE_MARKS.has(c))
    .join("")
    .normalize("NFC");
}

export type LexiconStatus = "draft" | "reviewed";

export interface Reviewer {
  readonly name: string;
  readonly dialects: readonly string[];
}

export interface LexiconEntry {
  /** Exactly as typed. */
  readonly form: string;
  /** NFC, for comparing and for matching typed answers. */
  readonly normalizedForm: string;
  /** The form without tone marks, so a learner can be shown what to mark. */
  readonly plain: string;
  readonly gloss: string;
  readonly dialect: string;
  readonly example: string | null;
  readonly exampleTranslation: string | null;
  readonly source: string;
  readonly contributor: string;
  readonly reviewers: readonly Reviewer[];
  readonly reviewedOn: string | null;
  readonly status: LexiconStatus;
  /** Citation tones from the syllabifier, e.g. ["M", "L"]. Used for classifier thresholds later. */
  readonly tones: readonly Tone[];
}

export interface RowReport {
  /** Spreadsheet row number (header is row 1). */
  readonly row: number;
  readonly form: string;
  readonly errors: Finding[];
  readonly warnings: Finding[];
  readonly entry: LexiconEntry | null;
}

export interface LexiconReport {
  readonly fatal: Finding[];
  readonly rows: RowReport[];
  readonly entries: LexiconEntry[];
  readonly counts: { rows: number; ok: number; withErrors: number; reviewed: number; draft: number };
}

const person = (name: string) => name.normalize("NFC").trim().replace(/\s+/g, " ").toLowerCase();

function validateRow(
  cells: Record<LexiconColumn, string>,
  register: DialectRegister,
  errors: Finding[],
  warnings: Finding[],
): LexiconEntry | null {
  const need = (value: string, code: string, message: string) => {
    if (isBlank(value)) errors.push({ code, message });
  };
  need(cells.form, "FORM_MISSING", "The form is empty.");
  need(cells.gloss, "GLOSS_MISSING", "Add an English gloss, so a word that differs only by tone is clear.");
  need(cells.source, "SOURCE_MISSING", 'Say where it comes from, for example "own knowledge" or the book.');
  need(cells.contributor, "CONTRIBUTOR_MISSING", "Say who contributed it.");

  if (tooLong(cells.form)) errors.push({ code: "FORM_TOO_LONG", message: `A form is a word or short phrase: ${MAX_FORM_GRAPHEMES} characters at most.` });
  if (!isBlank(cells.form)) {
    const marks = checkToneMarks(cells.form);
    errors.push(...marks.errors);
    warnings.push(...marks.warnings);
  }
  if (!isBlank(cells.example)) {
    if (isBlank(cells.example_translation)) errors.push({ code: "EXAMPLE_NEEDS_TRANSLATION", message: "An example needs its English translation." });
    const marks = checkToneMarks(cells.example);
    for (const e of marks.errors) errors.push({ code: `EXAMPLE_${e.code}`, message: `In the example: ${e.message}` });
  } else if (!isBlank(cells.example_translation)) {
    warnings.push({ code: "TRANSLATION_WITHOUT_EXAMPLE", message: "There is an example translation but no example." });
  }

  const dialect = resolveDialect(register, cells.dialect);
  if (isBlank(cells.dialect)) errors.push({ code: "DIALECT_MISSING", message: "Name the dialect this is spoken in." });
  else if (dialect === null) errors.push({ code: "DIALECT_UNKNOWN", message: `“${cells.dialect.trim()}” is not in the dialect register. Ask a reviewer to add it.` });

  // Review: two different people, neither the contributor, each speaking the entry's dialect.
  const reviewers: Reviewer[] = [];
  const slots = [
    { name: cells.reviewer_1, dialects: cells.reviewer_1_dialect, n: 1 },
    { name: cells.reviewer_2, dialects: cells.reviewer_2_dialect, n: 2 },
  ];
  for (const slot of slots) {
    if (isBlank(slot.name)) {
      if (!isBlank(slot.dialects)) errors.push({ code: "REVIEWER_NAME_MISSING", message: `reviewer_${slot.n}_dialect is filled but reviewer_${slot.n} is empty.` });
      continue;
    }
    const spoken = slot.dialects
      .split(/[;/]/)
      .map((d) => resolveDialect(register, d))
      .filter((d): d is string => d !== null);
    if (isBlank(slot.dialects) || spoken.length === 0) {
      errors.push({ code: "REVIEWER_DIALECT_MISSING", message: `Say which dialect reviewer ${slot.n} (${slot.name.trim()}) speaks, using the register.` });
      continue;
    }
    if (dialect !== null && !spoken.includes(dialect)) {
      errors.push({ code: "REVIEWER_DIALECT_MISMATCH", message: `${slot.name.trim()} does not speak this entry's dialect, so cannot review it.` });
      continue;
    }
    if (person(slot.name) === person(cells.contributor)) {
      errors.push({ code: "REVIEWER_IS_CONTRIBUTOR", message: `${slot.name.trim()} contributed this and cannot also review it.` });
      continue;
    }
    reviewers.push({ name: slot.name.trim(), dialects: spoken });
  }
  if (reviewers.length === 2 && person(reviewers[0]!.name) === person(reviewers[1]!.name)) {
    errors.push({ code: "SAME_REVIEWER_TWICE", message: "The same person is listed as both reviewers. A Card needs two different people." });
    reviewers.pop();
  }
  let reviewedOn: string | null = null;
  if (!isBlank(cells.reviewed_on)) {
    reviewedOn = cells.reviewed_on.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(reviewedOn) || Number.isNaN(Date.parse(reviewedOn))) {
      errors.push({ code: "REVIEWED_ON_INVALID", message: "reviewed_on must be a date like 2026-10-31." });
      reviewedOn = null;
    }
  }
  const signed = reviewers.length === 2;
  if (signed && reviewedOn === null && !errors.some((e) => e.code === "REVIEWED_ON_INVALID")) {
    errors.push({ code: "REVIEWED_ON_MISSING", message: "Two reviewers are listed. Add the date they reviewed it." });
  }
  if (reviewers.length === 1) warnings.push({ code: "NEEDS_SECOND_REVIEWER", message: "Only one reviewer so far. A second is needed before this is Reviewed." });
  if (reviewers.length === 0 && !isBlank(cells.reviewed_on)) {
    warnings.push({ code: "DATE_WITHOUT_REVIEWERS", message: "reviewed_on is set but there are no reviewers." });
  }

  if (errors.length > 0 || dialect === null) return null;

  const syl = syllabify(cells.form);
  for (const issue of syl.issues) warnings.push({ code: "SYLLABLE_ISSUE", message: `The syllable rules could not read part of this: ${issue}.` });
  return {
    form: cells.form,
    normalizedForm: cells.form.normalize("NFC"),
    plain: stripToneMarks(cells.form),
    gloss: cells.gloss.trim(),
    dialect,
    example: isBlank(cells.example) ? null : cells.example,
    exampleTranslation: isBlank(cells.example_translation) ? null : cells.example_translation.trim(),
    source: cells.source.trim(),
    contributor: cells.contributor.trim(),
    reviewers,
    reviewedOn,
    status: signed && reviewedOn !== null ? "reviewed" : "draft",
    tones: syl.syllables.map((s) => s.tone),
  };
}

/** Check a lexicon spreadsheet exported as CSV. Never throws on bad content. */
export function checkLexiconCsv(csv: string, register: DialectRegister): LexiconReport {
  const fatal: Finding[] = [];
  const table = parseCsv(csv);
  const empty = { rows: 0, ok: 0, withErrors: 0, reviewed: 0, draft: 0 };
  const header = table[0]?.map((h) => h.trim().toLowerCase());
  if (!header) {
    return { fatal: [{ code: "EMPTY_FILE", message: "The file is empty." }], rows: [], entries: [], counts: empty };
  }
  const missing = REQUIRED_COLUMNS.filter((c) => !header.includes(c));
  if (missing.length > 0) {
    fatal.push({ code: "COLUMNS_MISSING", message: `Missing columns: ${missing.join(", ")}.` });
  }
  const unknown = header.filter((h) => h !== "" && !(LEXICON_COLUMNS as readonly string[]).includes(h));
  if (unknown.length > 0) fatal.push({ code: "COLUMNS_UNKNOWN", message: `Columns not recognised (check the spelling): ${unknown.join(", ")}.` });
  if (missing.length > 0) return { fatal, rows: [], entries: [], counts: empty };

  const rows: RowReport[] = [];
  const entries: LexiconEntry[] = [];
  const seen = new Map<string, number>();

  table.slice(1).forEach((cellsRaw, i) => {
    const row = i + 2;
    if (cellsRaw.every((c) => isBlank(c))) return;
    const cells = Object.fromEntries(LEXICON_COLUMNS.map((c) => [c, cellsRaw[header.indexOf(c)] ?? ""])) as Record<LexiconColumn, string>;
    const errors: Finding[] = [];
    const warnings: Finding[] = [];
    const entry = validateRow(cells, register, errors, warnings);
    if (entry) {
      const k = [entry.normalizedForm.toLowerCase(), entry.dialect, entry.gloss.toLowerCase()].join("|");
      const first = seen.get(k);
      if (first !== undefined) {
        errors.push({ code: "DUPLICATE", message: `Same form, dialect and gloss as row ${first}.` });
      } else {
        seen.set(k, row);
      }
    }
    const valid = errors.length === 0 ? entry : null;
    if (valid) entries.push(valid);
    rows.push({ row, form: cells.form, errors, warnings, entry: valid });
  });

  const withErrors = rows.filter((r) => r.errors.length > 0).length;
  return {
    fatal,
    rows,
    entries,
    counts: {
      rows: rows.length,
      ok: rows.length - withErrors,
      withErrors,
      reviewed: entries.filter((e) => e.status === "reviewed").length,
      draft: entries.filter((e) => e.status === "draft").length,
    },
  };
}

export interface LexiconExport {
  readonly schemaVersion: 1;
  readonly generatedAt: string;
  /** Only Reviewed entries unless drafts were asked for. */
  readonly includesDrafts: boolean;
  readonly entries: readonly LexiconEntry[];
}

/** Reviewed entries only, by default. Never labelled gold or certified. */
export function exportLexicon(report: LexiconReport, generatedAt: string, includeDrafts = false): LexiconExport {
  return {
    schemaVersion: 1,
    generatedAt,
    includesDrafts: includeDrafts,
    entries: report.entries.filter((e) => includeDrafts || e.status === "reviewed"),
  };
}

export const lexiconTemplate = (): string => LEXICON_COLUMNS.join(",") + "\n";

/** Longest form we accept, counted in user-perceived characters. */
export const MAX_FORM_GRAPHEMES = 80;
export const tooLong = (form: string) => countGraphemes(form) > MAX_FORM_GRAPHEMES;
