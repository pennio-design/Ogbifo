/**
 * End-to-end check of the recording flow in a real browser with a fake
 * microphone that plays synthetic readings. Needs the app running with the
 * synthetic test reference (OGBIFO_ALLOW_UNREVIEWED=1 and OGBIFO_SYNTHETIC_REFERENCE=1, which no
 * normal run uses) and a Chromium binary.
 *
 *   BASE_URL=http://localhost:3000 CHROMIUM_PATH=/path/to/chromium npm run e2e -w @ogbifo/web
 *   EXPECT_NUMBER=1 when the app was built with NEXT_PUBLIC_SHOW_RESONANCE_NUMBER=1.
 */
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium, type Browser, type Page } from "playwright-core";
import { encodeWav, KAAARO, SR, synthUtterance } from "@ogbifo/speech";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const EXPECT_NUMBER = process.env.EXPECT_NUMBER === "1";
const EXECUTABLE = process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium";
const OUT = process.env.OUT_DIR;

let failures = 0;
const check = (ok: boolean, name: string, detail = "") => {
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${!ok && detail ? ` (${detail})` : ""}`);
};

const dir = mkdtempSync(join(tmpdir(), "ogbifo-e2e-"));
function wav(name: string, samples: Float32Array): string {
  const path = join(dir, name);
  writeFileSync(path, encodeWav(samples, SR));
  return path;
}
const pad = (s: Float32Array, lead: number, trail: number) => {
  const out = new Float32Array(Math.round(lead * SR) + s.length + Math.round(trail * SR));
  out.set(s, Math.round(lead * SR));
  return out;
};
// A different voice, a little slower, reading the same tones: should follow the reference.
const good = wav("good.wav", pad(synthUtterance(KAAARO, { seed: 5, registerSemitones: 5, formantScale: 1.1, tempo: 1.1, leadMs: 0, trailMs: 0 }).samples, 0.5, 2.5));
const flat = wav("flat.wav", pad(synthUtterance(KAAARO, { seed: 6, monotone: true, leadMs: 0, trailMs: 0 }).samples, 0.5, 2.5));
const quiet = wav("quiet.wav", new Float32Array(SR * 5));

async function launch(audioFile: string, grant: boolean): Promise<{ browser: Browser; page: Page }> {
  const browser = await chromium.launch({
    executablePath: EXECUTABLE,
    args: grant
      ? ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream", `--use-file-for-fake-audio-capture=${audioFile}`]
      : ["--use-fake-device-for-media-stream", `--use-file-for-fake-audio-capture=${audioFile}`],
  });
  const context = await browser.newContext({ viewport: { width: 390, height: 900 }, permissions: grant ? ["microphone"] : [] });
  return { browser, page: await context.newPage() };
}

async function record(page: Page, ms = 3600) {
  await page.getByRole("button", { name: "Record", exact: true }).click();
  await page.getByRole("button", { name: "Stop" }).waitFor({ timeout: 10_000 });
  await page.waitForTimeout(ms);
  await page.getByRole("button", { name: "Stop" }).click();
}

async function main() {
  // 1. A good reading, Studio then Live.
  {
    const { browser, page } = await launch(good, true);
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(`${BASE}/reading-room/common-tongue-yo`, { waitUntil: "load" });
    await page.getByRole("button", { name: "Hear the reference" }).waitFor();
    check(await page.getByRole("button", { name: "Hear the reference" }).isVisible(), "reference player is shown");
    check(await page.getByRole("button", { name: "Record", exact: true }).isEnabled(), "Record is enabled when a reference exists");
    check(/Synthetic test voice/.test(await page.locator("section[aria-label='Say it aloud']").innerText()), "provenance line names the synthetic reference");

    await record(page);
    await page.getByTestId("attempt-result").waitFor({ timeout: 20_000 });
    let text = await page.getByTestId("attempt-result").innerText();
    check(/4 of 4 pitch steps were close to the reference/.test(text), "Studio: a matching reading is described as close on every step", text.slice(0, 200));
    check(/not the words/.test(text), "result states that words are not checked");
    check((await page.getByTestId("resonance-number").count()) === 0, "Studio never shows a number");
    check(/not scored or saved/.test(text), "Studio says it is not scored or saved");
    check((await page.locator("[data-testid=attempt-result] svg[role=img]").count()) === 1, "contour chart is drawn");
    check((await page.locator("[data-testid=attempt-result] ol li").count()) === 5, "one marker per syllable");
    const stored = await page.evaluate(() => sessionStorage.getItem("ogbifo.progress.v1") ?? "");
    check(!/live/.test(stored) || !/completedAt/.test(stored), "Studio saved no progress", stored);
    if (OUT) {
      await page.addStyleTag({ content: "nav[aria-label=Primary]{display:none}" });
      await page.locator("[data-testid=attempt-result]").screenshot({ path: join(OUT, "chart-match.png") });
    }

    await page.getByRole("button", { name: "Live", exact: true }).click();
    await page.getByRole("button", { name: "Try again" }).click();
    await page.getByRole("button", { name: "Stop" }).waitFor({ timeout: 10_000 });
    await page.waitForTimeout(3600);
    await page.getByRole("button", { name: "Stop" }).click();
    await page.getByTestId("attempt-result").waitFor({ timeout: 20_000 });
    text = await page.getByTestId("attempt-result").innerText();
    check(/Your Live reading/.test(text) && /now finished in Live/.test(text), "Live: the Card is finished");
    check((await page.getByTestId("resonance-number").count()) === (EXPECT_NUMBER ? 1 : 0), EXPECT_NUMBER ? "Live shows the number when switched on" : "Live hides the number until calibration passes (D-036)");
    check(await page.getByText("Finished in Live", { exact: true }).isVisible(), "Card is marked Finished in Live");
    const headerScore = (await page.getByTestId("header-score").innerText()).trim();
    check(EXPECT_NUMBER ? /^\d+$/.test(headerScore) : /—|No score yet/.test(headerScore), EXPECT_NUMBER ? "the header score shows the Deck average when the number is on" : "the header score stays empty while the number is hidden", headerScore);
    const progress = JSON.parse(await page.evaluate(() => sessionStorage.getItem("ogbifo.progress.v1") ?? "{}"));
    const live = (progress.sessions ?? []).filter((s: { mode: string; completedAt?: string }) => s.mode === "live" && s.completedAt);
    check(live.length === 1 && live[0].cardId === "card-yo-greeting-1" && typeof live[0].score === "number", "a completed Live session was saved with its score", JSON.stringify(live));
    check(!JSON.stringify(progress).includes("samples") && JSON.stringify(progress).length < 2000, "no audio is stored with progress");
    const again = await page.getByRole("button", { name: /^(Record|Try again)$/ }).count();
    check(again === 0 && /finished this Card in Live/.test(await page.locator("section[aria-label='Say it aloud']").innerText()), "Live allows one scored attempt per Card, and says why", `buttons: ${again}`);
    if (OUT) await page.screenshot({ path: join(OUT, "live-result.png"), fullPage: true });

    await page.goto(`${BASE}/reading-room`, { waitUntil: "load" });
    await page.getByText(/1 of 1 Cards finished/).waitFor();
    text = await page.locator("main").innerText();
    check(!/Locked\./.test(text) && /1 of 1 Cards finished/.test(text), "finishing Common Tongue in Live unlocks Proverb House");
    check(errors.length === 0, "no uncaught page errors", errors.join(" | "));
    await browser.close();
  }

  // 2. A monotone reading is shown as different from the reference.
  {
    const { browser, page } = await launch(flat, true);
    await page.goto(`${BASE}/reading-room/common-tongue-yo`, { waitUntil: "load" });
    await record(page);
    await page.getByTestId("attempt-result").waitFor({ timeout: 20_000 });
    const text = await page.getByTestId("attempt-result").innerText();
    check(!/4 of 4/.test(text) && /of 4 pitch steps/.test(text), "a monotone reading is not described as matching", text.slice(0, 160));
    check(/a (higher|lower) pitch step than the reference/.test(text), "differing syllables are named in words");
    if (OUT) {
      await page.addStyleTag({ content: "nav[aria-label=Primary]{display:none}" });
      await page.locator("[data-testid=attempt-result]").screenshot({ path: join(OUT, "chart-monotone.png") });
    }
    await browser.close();
  }

  // 3. Silence is refused and does not finish the Card, even in Live.
  {
    const { browser, page } = await launch(quiet, true);
    await page.goto(`${BASE}/reading-room/common-tongue-yo`, { waitUntil: "load" });
    await page.getByRole("button", { name: "Live", exact: true }).click();
    await record(page, 1500);
    const panelAlert = page.locator("section[aria-label='Say it aloud'] [role=alert]");
    await panelAlert.waitFor({ timeout: 20_000 });
    const text = await panelAlert.innerText();
    check(/barely hear|too short|couldn't hear/i.test(text) && !/error/i.test(text), "silence is refused in plain words", text);
    check((await page.getByText("Finished in Live", { exact: true }).count()) === 0, "a refused attempt does not finish the Card");
    check(await page.getByRole("button", { name: "Try again" }).isEnabled(), "the learner can try again after a refusal");
    await browser.close();
  }

  // 4. Microphone permission denied.
  {
    const { browser, page } = await launch(good, false);
    await page.goto(`${BASE}/reading-room/common-tongue-yo`, { waitUntil: "load" });
    await page.getByRole("button", { name: "Record", exact: true }).click();
    const panelAlert = page.locator("section[aria-label='Say it aloud'] [role=alert]");
    await panelAlert.waitFor({ timeout: 10_000 });
    const text = await panelAlert.innerText();
    check(/Microphone access is off|couldn't find a microphone/.test(text), "a refused microphone gets a plain explanation", text);
    await browser.close();
  }

  // 5. The microphone is not requested until Record is pressed.
  {
    const { browser, page } = await launch(good, true);
    let asked = false;
    await page.addInitScript(() => {
      const original = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
      navigator.mediaDevices.getUserMedia = (...args) => {
        (window as unknown as { __asked: boolean }).__asked = true;
        return original(...args);
      };
    });
    await page.goto(`${BASE}/reading-room/common-tongue-yo`, { waitUntil: "load" });
    await page.waitForTimeout(500);
    asked = await page.evaluate(() => Boolean((window as unknown as { __asked?: boolean }).__asked));
    check(!asked, "the microphone is not requested on page load");
    await browser.close();
  }

  console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
  process.exit(failures === 0 ? 0 : 1);
}

void main();
