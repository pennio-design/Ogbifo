/**
 * End-to-end check of local-first contributions (Sprint 4 part 1).
 *
 *   BASE_URL=http://localhost:3000 GATED_URL=http://localhost:3001 CHROMIUM_PATH=... npm run e2e:community -w @ogbifo/web
 * BASE_URL: app built with NEXT_PUBLIC_DEV_ACCOUNT=1 (a stand-in signed-in user).
 * GATED_URL: app built without it, where contributing must be closed to anonymous readers.
 */
import { chromium } from "playwright-core";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const EXECUTABLE = process.env.CHROMIUM_PATH ?? "/opt/pw-browsers/chromium";

let failures = 0;
const check = (ok: boolean, name: string, detail = "") => {
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${!ok && detail ? ` (${detail})` : ""}`);
};

async function main() {
  const browser = await chromium.launch({ executablePath: EXECUTABLE });
  const context = await browser.newContext({ viewport: { width: 390, height: 900 } });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const posts: string[] = [];
  page.on("request", (r) => {
    if (r.method() !== "GET" && r.url().startsWith(BASE)) posts.push(`${r.method()} ${r.url()}`);
  });

  if (process.env.GATED_URL) {
    const anon = await context.newPage();
    await anon.goto(`${process.env.GATED_URL}/community`, { waitUntil: "networkidle" });
    const text = await anon.locator("main").innerText();
    check(/needs an account/.test(text), "anonymous readers are told contributing needs an account");
    check((await anon.locator("main textarea").count()) === 0, "anonymous readers get no contribution form");
    await anon.close();
  }

  await page.goto(`${BASE}/community`, { waitUntil: "networkidle" });
  const main = page.locator("main");
  const mine = main.locator("section[aria-labelledby=mine]");
  check(await main.getByText("Nothing added yet").isVisible(), "empty state shown before anything is added");
  check(await main.getByText(/Draft · draft-0.1/).isVisible(), "consent screen is labelled as a draft");
  check(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), "no horizontal overflow at 390px");

  const submit = main.getByRole("button", { name: "Add to the archive" });
  await submit.click();
  check(await main.getByRole("alert").filter({ hasText: "Write what you want to add" }).isVisible(), "empty text is refused with plain copy");

  const text = "Ẹni tó bá fẹ́ jẹun, kò gbọdọ̀ jẹkí";
  await main.getByLabel("In Yorùbá").fill(text);
  await submit.click();
  check(await main.getByRole("alert").filter({ hasText: "Agree to the licence" }).isVisible(), "no consent, no save");

  await main.getByLabel("I have read this and I agree.").check();
  await submit.click();
  check(await main.getByRole("alert").filter({ hasText: "Say whose this is" }).isVisible(), "no rights declaration, no save");

  await main.getByLabel("I wrote or said it myself.").check();
  await main.getByLabel("What are you adding?").selectOption("lyric");
  await submit.click();
  check(await main.getByRole("alert").filter({ hasText: "who holds the rights" }).isVisible(), "lyrics need a rights note");
  await main.getByLabel("What are you adding?").selectOption("proverb");

  // Offline: saving must not need the network.
  await context.setOffline(true);
  await page.evaluate(() => window.dispatchEvent(new Event("offline")));
  check(await main.getByText(/Offline\. Your archive contributions are saved/).isVisible(), "offline banner shown");
  await submit.click();
  await main.getByText("Added. It is saved on this device").waitFor();
  const item = mine.locator("li").first();
  check((await item.innerText()).includes(text), "contribution renders at once, text intact");
  check((await item.innerText()).includes("Pending community review"), "starts as Pending community review");
  check(/safe on this device|Saved on this device/.test(await item.innerText()), "sync state is stated plainly");
  check(!/reviewed/i.test((await item.innerText()).replace(/community review/i, "")), "never says Reviewed");
  check(await item.getByRole("button", { name: "Withdraw" }).isVisible(), "withdraw is offered");
  await context.setOffline(false);

  // Stored exactly as typed, in the browser's database.
  const stored = await page.evaluate(
    () =>
      new Promise<unknown[]>((resolve, reject) => {
        const open = indexedDB.open("ogbifo-archive");
        open.onsuccess = () => {
          const r = open.result.transaction("contributions").objectStore("contributions").getAll();
          r.onsuccess = () => resolve(r.result);
          r.onerror = () => reject(r.error);
        };
        open.onerror = () => reject(open.error);
      }),
  );
  const row = stored[0] as { contentText: string; consentVersion: string; withdrawnAt: unknown } | undefined;
  check(stored.length === 1 && row?.contentText === text, "IndexedDB holds the text byte-for-byte");
  check(row?.consentVersion === "draft-0.1", "consent version stored with the contribution");

  // Survives a reload.
  await page.reload({ waitUntil: "networkidle" });
  check((await mine.locator("li").first().innerText()).includes(text), "contribution survives a reload");

  // Nothing leaves the device while the wording is a draft.
  check(posts.length === 0, "no network write while consent wording is a draft", posts.join("; "));

  // Withdraw.
  await mine.locator("li").first().getByRole("button", { name: "Withdraw" }).click();
  check(await main.getByText("Withdraw this? It will disappear from view.").isVisible(), "withdraw asks first");
  await main.getByRole("button", { name: "Keep it" }).click();
  check((await mine.locator("li").count()) === 1, "keeping it leaves the entry");
  await mine.locator("li").first().getByRole("button", { name: "Withdraw" }).click();
  await main.getByRole("button", { name: "Withdraw", exact: true }).first().click();
  await main.getByText("Nothing added yet").waitFor();
  check(true, "withdrawn entry disappears from view");
  const after = await page.evaluate(
    () =>
      new Promise<{ withdrawnAt: unknown }[]>((resolve) => {
        const open = indexedDB.open("ogbifo-archive");
        open.onsuccess = () => {
          const r = open.result.transaction("contributions").objectStore("contributions").getAll();
          r.onsuccess = () => resolve(r.result);
        };
      }),
  );
  check(after[0]?.withdrawnAt != null, "withdrawal is recorded, not deleted, so it can sync later");

  check(errors.length === 0, "no page errors", errors.join("; "));
  await browser.close();
  console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
  process.exit(failures === 0 ? 0 : 1);
}

void main();
