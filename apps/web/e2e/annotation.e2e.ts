/**
 * End-to-end check of the reviewer annotation tool (D-033).
 *
 *   BASE_URL=http://localhost:3000 DISABLED_URL=http://localhost:3001 CHROMIUM_PATH=... npm run e2e:annotate -w @ogbifo/web
 * BASE_URL: app with OGBIFO_ENABLE_REVIEWER_TOOLS=1. DISABLED_URL: app without it.
 */
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright-core";
import { parseReferenceFile } from "@ogbifo/domain";
import { encodeWav, KAAARO, SR, synthUtterance } from "@ogbifo/speech";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const DISABLED = process.env.DISABLED_URL;
const EXECUTABLE = process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium";
const OUT = process.env.OUT_DIR;

let failures = 0;
const check = (ok: boolean, name: string, detail = "") => {
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${!ok && detail ? ` (${detail})` : ""}`);
};

const dir = mkdtempSync(join(tmpdir(), "ogbifo-annotate-"));
const voice = synthUtterance(KAAARO, { seed: 7, leadMs: 600, trailMs: 900 });
const wavPath = join(dir, "reference.wav");
writeFileSync(wavPath, encodeWav(voice.samples, SR));
const names = ["Ẹ", "ká", "à", "á", "rọ̀"];
const labelsPath = join(dir, "labels.txt");
writeFileSync(labelsPath, voice.spans.map((s, i) => `${(s.startMs / 1000).toFixed(6)}\t${(s.endMs / 1000).toFixed(6)}\t${names[i]}`).join("\n") + "\n");
const badLabelsPath = join(dir, "bad-labels.txt");
writeFileSync(badLabelsPath, "0.6\t1.0\tkàá\n1.0\t1.4\trọ̀\n");

async function main() {
  const browser = await chromium.launch({ executablePath: EXECUTABLE });
  const context = await browser.newContext({ viewport: { width: 1100, height: 1200 }, acceptDownloads: true, deviceScaleFactor: 2 });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));

  if (DISABLED) {
    const off = await browser.newPage();
    await off.goto(`${DISABLED}/reviewer/annotate`, { waitUntil: "load" });
    const text = await off.locator("main").innerText();
    check(/isn.t in the Archive/.test(text) && !/Annotate a reference recording/.test(text), "the tool is not served unless switched on");
    await off.close();
  }

  await page.goto(`${BASE}/reviewer/annotate`, { waitUntil: "load" });
  check(await page.getByRole("heading", { name: "Annotate a reference recording" }).isVisible(), "the tool opens when switched on");
  await page.selectOption("#card", "card-yo-greeting-1");
  check(/Ẹ·M\s+ká·H\s+à·L\s+á·H\s+rọ̀·L/.test(await page.locator("section").first().innerText()), "the proposal shows the five syllables with their tones");

  await page.setInputFiles("#audio", wavPath);
  await page.locator("table tbody tr").first().waitFor({ timeout: 20_000 });
  check((await page.locator("table tbody tr").count()) === 5, "five syllable rows are proposed");
  const starts = await page.locator("input[aria-label$='start in milliseconds']").evaluateAll((els) => els.map((e) => Number((e as HTMLInputElement).value)));
  const ends = await page.locator("input[aria-label$='end in milliseconds']").evaluateAll((els) => els.map((e) => Number((e as HTMLInputElement).value)));
  check(Math.abs(starts[0]! - voice.spans[0]!.startMs) < 40 && Math.abs(ends[4]! - voice.spans[4]!.endMs) < 50, "the proposal starts and ends near the speech", `${starts[0]} ${ends[4]}`);
  check(starts.every((s, i) => i === 0 || s >= ends[i - 1]! - 1), "proposed syllables do not overlap");
  await page.waitForTimeout(800);
  if (OUT) await page.locator("[aria-label^='Waveform']").screenshot({ path: join(OUT, "waveform.png"), scale: "device" });
  check((await page.locator("[aria-label^='Waveform']").evaluate((el) => el.children.length)) > 0, "the waveform is drawn");

  // Keyboard-accessible editing: change a boundary in the table.
  await page.locator("input[aria-label='Syllable 2 start in milliseconds']").fill("700");
  check((await page.locator("input[aria-label='Syllable 2 start in milliseconds']").inputValue()) === "700", "a boundary can be edited in the table");

  // A bad label file is explained; a good one is imported.
  await page.setInputFiles("input[type=file][accept='.txt,text/plain']", badLabelsPath);
  check(/exactly one syllable/.test(await page.getByRole("status").innerText()), "a label that is two syllables is explained");
  await page.setInputFiles("input[type=file][accept='.txt,text/plain']", labelsPath);
  await page.waitForFunction(() => document.body.innerText.includes("Imported 5 labels."));
  const importedStarts = await page.locator("input[aria-label$='start in milliseconds']").evaluateAll((els) => els.map((e) => Number((e as HTMLInputElement).value)));
  check(importedStarts.every((s, i) => Math.abs(s - voice.spans[i]!.startMs) <= 1), "Audacity labels set every boundary exactly", importedStarts.join(","));
  const tones = await page.locator("select[aria-label$='tone']").evaluateAll((els) => els.map((e) => (e as HTMLSelectElement).value));
  check(tones.join("") === "MHLHL", "tones come from the tone marks in the labels", tones.join(""));
  check(!/differ from the proposed/.test(await page.getByRole("status").innerText()), "matching labels raise no warning");

  // Provenance is required.
  await page.getByRole("button", { name: "Check and prepare files" }).click();
  check(/Say where the recording came from|Name the rights holder|written consent/.test(await page.locator("main [role=alert]").innerText()), "saving without provenance is refused with a specific reason");
  check((await page.getByTestId("save-result").count()) === 0, "nothing is prepared without provenance");

  await page.fill("#source", "Studio session, 1 November 2026");
  await page.fill("#holder", "A. Speaker");
  await page.fill("#date", "2026-11-01");
  await page.getByLabel("The speaker has agreed in writing").check();
  await page.getByRole("button", { name: "Check and prepare files" }).click();
  await page.getByTestId("save-result").waitFor({ timeout: 20_000 });
  const summary = await page.getByTestId("save-result").innerText();
  check(/5 syllables/.test(summary) && /Pitch found in \d+ percent/.test(summary), "a summary of the annotation is shown", summary.slice(0, 200));
  if (OUT) await page.screenshot({ path: join(OUT, "annotation-tool.png"), fullPage: true });

  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("link", { name: /Download card-yo-greeting-1\.json/ }).click()]);
  const path = await download.path();
  const parsed = parseReferenceFile(JSON.parse(readFileSync(path, "utf8")));
  check(parsed.ok, "the downloaded file passes the app's own validation", parsed.ok ? "" : parsed.error.message);
  if (parsed.ok) {
    check(parsed.value.cardId === "card-yo-greeting-1" && parsed.value.audioUrl === "/references/card-yo-greeting-1.wav", "it names the Card and the audio location");
    check(parsed.value.annotation.syllables.map((s) => s.text).join("") === "Ẹkáàárọ̀" && parsed.value.annotation.syllables.map((s) => s.tone).join("") === "MHLHL", "it records the reviewer's syllables and tones");
    check(parsed.value.provenance.licence === "recorded_for_ogbifo" && parsed.value.provenance.speakerConsent, "it records the provenance and consent");
    check(parsed.value.annotation.algorithmVersion === "ogb-pitch-2", "it records the algorithm version");
  }
  const [audio] = await Promise.all([page.waitForEvent("download"), page.getByRole("link", { name: /Download card-yo-greeting-1\.wav/ }).click()]);
  check((audio.suggestedFilename()) === "card-yo-greeting-1.wav", "the audio is renamed after the Card");
  check(errors.length === 0, "no uncaught page errors", errors.join(" | "));

  await browser.close();
  console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
  process.exit(failures === 0 ? 0 : 1);
}

void main();
