/**
 * Check and export a tone lexicon sheet (TONE_LEXICON_PROPOSAL.md).
 *
 *   npm run lexicon -w @ogbifo/web -- check sheet.csv [--dialects path]
 *   npm run lexicon -w @ogbifo/web -- export sheet.csv --out reviewed.json [--drafts] [--dialects path]
 *   npm run lexicon -w @ogbifo/web -- template
 *
 * Exit code 1 when the file has errors, so it can gate a sign-off.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { checkLexiconCsv, exportLexicon, lexiconTemplate, parseDialectRegister, type LexiconReport } from "@ogbifo/domain";

const args = process.argv.slice(2);
const flag = (name: string) => {
  const i = args.indexOf(name);
  return i === -1 ? undefined : args[i + 1];
};
const [command, file] = args;

function fail(message: string): never {
  console.error(message);
  process.exit(2);
}

function load(): { report: LexiconReport } {
  if (!file || file.startsWith("--")) fail("Give the path to the CSV file.");
  const dialectsPath = resolve(flag("--dialects") ?? join(__dirname, "..", "content", "lexicon", "dialects.json"));
  let register;
  try {
    const parsed = parseDialectRegister(JSON.parse(readFileSync(dialectsPath, "utf8")));
    if (!parsed.ok) fail(`${dialectsPath}: ${parsed.error.message}`);
    register = parsed.value;
  } catch (error) {
    fail(`Could not read the dialect register ${dialectsPath}: ${error instanceof Error ? error.message : String(error)}`);
  }
  let csv: string;
  try {
    csv = readFileSync(resolve(file), "utf8");
  } catch {
    fail(`Could not read ${file}.`);
  }
  return { report: checkLexiconCsv(csv, register) };
}

function print(report: LexiconReport) {
  for (const f of report.fatal) console.log(`FILE   ${f.message}`);
  for (const r of report.rows) {
    for (const e of r.errors) console.log(`ERROR  row ${r.row}  ${r.form || "(empty)"}  ${e.message}`);
    for (const w of r.warnings) console.log(`warn   row ${r.row}  ${r.form}  ${w.message}`);
  }
  const c = report.counts;
  console.log(`\n${c.rows} rows: ${c.ok} ok, ${c.withErrors} with errors. Reviewed ${c.reviewed}, draft ${c.draft}.`);
}

if (command === "template") {
  process.stdout.write(lexiconTemplate());
} else if (command === "check") {
  const { report } = load();
  print(report);
  process.exit(report.fatal.length > 0 || report.counts.withErrors > 0 ? 1 : 0);
} else if (command === "export") {
  const { report } = load();
  print(report);
  if (report.fatal.length > 0 || report.counts.withErrors > 0) fail("\nNot exported: fix the errors first.");
  const out = flag("--out");
  if (!out) fail("Give --out path/to/file.json.");
  const result = exportLexicon(report, new Date().toISOString(), args.includes("--drafts"));
  writeFileSync(resolve(out), JSON.stringify(result, null, 2) + "\n");
  console.log(`Wrote ${result.entries.length} entries to ${out}.`);
} else {
  fail("Commands: check <csv>, export <csv> --out <json> [--drafts], template.");
}
