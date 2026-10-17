import { describe, expect, it } from "vitest";
import { parseCsv, toCsv } from "../src/csv";
import { parseDialectRegister, resolveDialect, type DialectRegister } from "../src/dialect";
import { checkLexiconCsv, checkToneMarks, exportLexicon, LEXICON_COLUMNS, lexiconTemplate, stripToneMarks } from "../src/lexicon";

// Test fixtures exercise the checker's mechanics. They are not lexicon content.
const register: DialectRegister = {
  dialects: [
    { id: "standard", name: "Standard Yorùbá" },
    { id: "test-a", name: "Test Dialect A", region: "nowhere" },
    { id: "test-b", name: "Test Dialect B" },
  ],
};
const header = LEXICON_COLUMNS.join(",");
const line = (o: Partial<Record<(typeof LEXICON_COLUMNS)[number], string>>) =>
  toCsv([LEXICON_COLUMNS.map((c) => o[c] ?? "")]).trimEnd();
const base = { form: "ọkọ̀", gloss: "vehicle", dialect: "standard", source: "own knowledge", contributor: "Ada" };
const signed = { ...base, reviewer_1: "Bayo", reviewer_1_dialect: "standard", reviewer_2: "Chi", reviewer_2_dialect: "Standard Yorùbá", reviewed_on: "2026-10-31" };
const check = (...lines: string[]) => checkLexiconCsv([header, ...lines].join("\n"), register);
const codes = (r: ReturnType<typeof check>, i = 0) => r.rows[i]!.errors.map((e) => e.code);

describe("csv", () => {
  it("handles quotes, commas, line breaks, CRLF and the Excel byte-order mark", () => {
    const text = '﻿a,"b,1","say ""hi""",\r\n"line\nbreak",x,,y\r\n';
    expect(parseCsv(text)).toEqual([["a", "b,1", 'say "hi"', ""], ["line\nbreak", "x", "", "y"]]);
  });
  it("round-trips tone-marked text without changing a code point", () => {
    const nfd = "ọkọ̀".normalize("NFD");
    expect(parseCsv(toCsv([[nfd]]))[0]?.[0]).toBe(nfd);
  });
  it("ignores blank lines and an unterminated last line", () => {
    expect(parseCsv("a,b\n\n1,2")).toEqual([["a", "b"], ["1", "2"]]);
  });
});

describe("tone marks", () => {
  it("accepts well formed forms, composed or decomposed", () => {
    for (const form of ["ọkọ̀", "ọkọ́", "ọ̀kọ̀", "ọkọ", "ilé", "ń lọ", "ṣe", "ọ̀rọ̀"]) {
      for (const f of [form.normalize("NFC"), form.normalize("NFD")]) expect(checkToneMarks(f).errors, f).toEqual([]);
    }
  });
  it.each([
    ["t̀a", "TONE_ON_CONSONANT"],
    ["à́", "STACKED_TONE"],
    ["ḍa", "BAD_DOT_BELOW"],
    ["cat", "NOT_YORUBA_LETTER"],
    ["a1", "UNEXPECTED_CHARACTER"],
    ["", "NO_LETTERS"],
    ["̀a", "MARK_WITHOUT_LETTER"],
  ])("rejects %j as %s", (form, code) => {
    expect(checkToneMarks(form).errors.map((e) => e.code)).toContain(code);
  });
  it("warns, not errors, on a macron", () => {
    const r = checkToneMarks("ọkọ̄");
    expect(r.errors).toEqual([]);
    expect(r.warnings.map((w) => w.code)).toContain("MACRON_MID");
  });
  it("strips tone marks but keeps dot-below letters", () => {
    expect(stripToneMarks("ọ̀kọ́")).toBe("ọkọ");
    expect(stripToneMarks("ṣé")).toBe("ṣe");
  });
});

describe("dialect register", () => {
  it("resolves ids and names, ignoring case and spacing", () => {
    expect(resolveDialect(register, " STANDARD ")).toBe("standard");
    expect(resolveDialect(register, "Standard Yorùbá")).toBe("standard");
    expect(resolveDialect(register, "elsewhere")).toBeNull();
    expect(resolveDialect(register, "")).toBeNull();
  });
  it("rejects a malformed or duplicated register", () => {
    expect(parseDialectRegister({}).ok).toBe(false);
    expect(parseDialectRegister({ dialects: [{ id: "a" }] }).ok).toBe(false);
    expect(parseDialectRegister({ dialects: [{ id: "a", name: "A" }, { id: "a", name: "B" }] }).ok).toBe(false);
    expect(parseDialectRegister({ dialects: [{ id: "a", name: "A" }] }).ok).toBe(true);
  });
});

describe("lexicon spreadsheet", () => {
  it("accepts a complete, unreviewed row as a draft and keeps the text as typed", () => {
    const nfd = base.form.normalize("NFD");
    const r = check(line({ ...base, form: nfd }));
    expect(r.counts).toMatchObject({ rows: 1, ok: 1, draft: 1, reviewed: 0 });
    expect(r.entries[0]).toMatchObject({ form: nfd, normalizedForm: nfd.normalize("NFC"), plain: "ọkọ", dialect: "standard", status: "draft" });
    expect(r.entries[0]!.tones).toEqual(["M", "L"]);
  });
  it("tells homographs that differ only by tone apart", () => {
    const r = check(
      line({ ...base, form: "ọkọ", gloss: "husband" }),
      line({ ...base, form: "ọkọ̀", gloss: "vehicle" }),
      line({ ...base, form: "ọkọ́", gloss: "hoe" }),
    );
    expect(r.counts.ok).toBe(3);
    expect(r.entries.map((e) => e.tones.join(""))).toEqual(["MM", "ML", "MH"]);
    expect(new Set(r.entries.map((e) => e.plain))).toEqual(new Set(["ọkọ"]));
  });
  it("marks an entry Reviewed only with two different, dialect-matching reviewers and a date", () => {
    const r = check(line(signed));
    expect(r.entries[0]).toMatchObject({ status: "reviewed", reviewedOn: "2026-10-31" });
    expect(r.entries[0]!.reviewers.map((x) => x.name)).toEqual(["Bayo", "Chi"]);
  });
  it("keeps an entry with one reviewer as a draft and says so", () => {
    const r = check(line({ ...base, reviewer_1: "Bayo", reviewer_1_dialect: "standard" }));
    expect(r.entries[0]!.status).toBe("draft");
    expect(r.rows[0]!.warnings.map((w) => w.code)).toContain("NEEDS_SECOND_REVIEWER");
  });
  it("refuses the same person twice, and the contributor as a reviewer", () => {
    expect(codes(check(line({ ...signed, reviewer_2: " bayo ", reviewer_2_dialect: "standard" })))).toContain("SAME_REVIEWER_TWICE");
    expect(codes(check(line({ ...signed, reviewer_1: "ADA" })))).toContain("REVIEWER_IS_CONTRIBUTOR");
  });
  it("refuses a reviewer who does not speak the entry's dialect (D-043)", () => {
    expect(codes(check(line({ ...signed, dialect: "test-a" })))).toContain("REVIEWER_DIALECT_MISMATCH");
    const ok = check(line({ ...signed, dialect: "test-a", reviewer_1_dialect: "test-a; standard", reviewer_2_dialect: "test-a/test-b" }));
    expect(ok.entries[0]!.status).toBe("reviewed");
  });
  it("needs the review date, and a real one", () => {
    expect(codes(check(line({ ...signed, reviewed_on: "" })))).toContain("REVIEWED_ON_MISSING");
    expect(codes(check(line({ ...signed, reviewed_on: "31/10/2026" })))).toContain("REVIEWED_ON_INVALID");
  });
  it("reports missing required cells, an unknown dialect and bad marks, row by row", () => {
    const r = check(line({ ...base, gloss: "" }), line({ ...base, dialect: "mars" }), line({ ...base, form: "t̀a" }), line({ ...base, source: "" }));
    expect(codes(r, 0)).toContain("GLOSS_MISSING");
    expect(codes(r, 1)).toContain("DIALECT_UNKNOWN");
    expect(codes(r, 2)).toContain("TONE_ON_CONSONANT");
    expect(codes(r, 3)).toContain("SOURCE_MISSING");
    expect(r.counts).toMatchObject({ rows: 4, ok: 0, withErrors: 4 });
    expect(r.rows.map((x) => x.row)).toEqual([2, 3, 4, 5]);
  });
  it("needs a translation for an example, and checks the example's marks", () => {
    expect(codes(check(line({ ...base, example: "Mo ní ọkọ̀" })))).toContain("EXAMPLE_NEEDS_TRANSLATION");
    expect(codes(check(line({ ...base, example: "Mo t̀í", example_translation: "x" })))).toContain("EXAMPLE_TONE_ON_CONSONANT");
  });
  it("flags a duplicate only when form, dialect and gloss all match", () => {
    const r = check(line(base), line(base), line({ ...base, gloss: "car" }), line({ ...base, dialect: "test-a" }));
    expect(codes(r, 1)).toContain("DUPLICATE");
    expect(r.rows[2]!.errors).toEqual([]);
    expect(r.rows[3]!.errors).toEqual([]);
  });
  it("says what is wrong with the file itself", () => {
    expect(checkLexiconCsv("", register).fatal[0]!.code).toBe("EMPTY_FILE");
    expect(checkLexiconCsv("form,gloss\nx,y", register).fatal[0]!.code).toBe("COLUMNS_MISSING");
    const unknown = checkLexiconCsv(`${header},extra\n`, register);
    expect(unknown.fatal.map((f) => f.code)).toContain("COLUMNS_UNKNOWN");
  });
  it("skips blank rows and accepts columns in any order", () => {
    const csv = ["source,form,contributor,dialect,gloss", "own knowledge,ọkọ,Ada,standard,husband", ",,,,"].join("\n");
    const r = checkLexiconCsv(csv, register);
    expect(r.counts).toMatchObject({ rows: 1, ok: 1 });
  });
  it("exports Reviewed entries only unless drafts are asked for, never as gold", () => {
    const r = check(line(signed), line({ ...base, form: "ọkọ", gloss: "husband" }));
    const reviewedOnly = exportLexicon(r, "2026-11-01T00:00:00.000Z");
    expect(reviewedOnly.entries.map((e) => e.gloss)).toEqual(["vehicle"]);
    expect(exportLexicon(r, "t", true).entries).toHaveLength(2);
    expect(JSON.stringify(reviewedOnly)).not.toMatch(/gold|certified|authoritative/i);
  });
  it("template is just the header", () => {
    expect(lexiconTemplate()).toBe(header + "\n");
  });
});
