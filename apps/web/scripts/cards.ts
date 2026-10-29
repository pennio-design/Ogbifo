/**
 * Check and export a Reading Room Cards sheet (D-012, D-043).
 *
 *   npm run cards -w @ogbifo/web -- check sheet.csv [--dialects path]
 *   npm run cards -w @ogbifo/web -- export sheet.csv [--out path] [--unreviewed] [--dialects path]
 *   npm run cards -w @ogbifo/web -- template
 *
 * Exit code 1 when the sheet has errors. The default output is content/cards/cards.json,
 * which is private (gitignored) and read by the app at start-up.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { cardSheetTemplate, checkCardSheetCsv, exportCards, parseDialectRegister, seedDecks, type CardSheetReport } from "@ogbifo/domain";

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

function load(): CardSheetReport {
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
  return checkCardSheetCsv(csv, { register, deckIds: seedDecks.map((d) => d.id), languageId: "yo" }, new Date().toISOString());
}

function print(report: CardSheetReport) {
  for (const f of report.fatal) console.log(`FILE   ${f.message}`);
  for (const r of report.rows) {
    for (const e of r.errors) console.log(`ERROR  row ${r.row}  ${r.id || "(no id)"}  ${e.message}`);
    for (const w of r.warnings) console.log(`warn   row ${r.row}  ${r.id}  ${w.message}`);
  }
  const c = report.counts;
  console.log(`\n${c.rows} rows: ${c.ok} ok, ${c.withErrors} with errors. Reviewed ${c.reviewed}, not yet reviewed ${c.unreviewed}.`);
}

if (command === "template") {
  process.stdout.write(cardSheetTemplate());
} else if (command === "check") {
  const report = load();
  print(report);
  process.exit(report.fatal.length > 0 || report.counts.withErrors > 0 ? 1 : 0);
} else if (command === "export") {
  const report = load();
  print(report);
  if (report.fatal.length > 0 || report.counts.withErrors > 0) fail("\nNot exported: fix the errors first.");
  const out = resolve(flag("--out") ?? join(__dirname, "..", "content", "cards", "cards.json"));
  const result = exportCards(report, new Date().toISOString(), args.includes("--unreviewed"));
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify(result, null, 2) + "\n");
  console.log(`Wrote ${result.cards.length} Cards to ${out}.`);
} else {
  fail("Commands: check <csv>, export <csv> [--out <json>] [--unreviewed], template.");
}
