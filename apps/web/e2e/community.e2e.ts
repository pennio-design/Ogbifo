/**
 * End-to-end check of email-link sign-in and local-first contributions (Sprint 4).
 *
 *   OGBIFO_BASE_URL=http://localhost:3000 OGBIFO_DEV_EMAIL=1 npx next start   (the app under test)
 *   BASE_URL=http://localhost:3000 CHROMIUM_PATH=... npm run e2e:community -w @ogbifo/web
 * The dev mailbox shows the sign-in link on the page instead of sending email. A production start also
 * needs DATABASE_URL (with migrations applied); without a database sign-in stays closed by design.
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

  // --- sign in by email link ---
  const anon = await context.newPage();
  await anon.goto(`${BASE}/community`, { waitUntil: "load" });
  await anon.getByText(/needs an account/).waitFor();
  const anonText = await anon.locator("main").innerText();
  check(/needs an account/.test(anonText), "anonymous readers are told contributing needs an account");
  check((await anon.locator("main textarea").count()) === 0, "anonymous readers get no contribution form");
  check((await anon.request.get(`${BASE}/api/auth/me`)).status() === 401, "/api/auth/me is 401 when signed out");
  const crossSite = await anon.request.post(`${BASE}/api/auth/request`, { data: { email: "x@example.com" }, headers: { Origin: "https://evil.example" } });
  check(crossSite.status() === 403, "a cross-site sign-in request is refused");

  await anon.goto(`${BASE}/sign-in`, { waitUntil: "load" });
  await anon.getByLabel("Email address").fill("not-an-email");
  await anon.getByRole("button", { name: "Send me a link" }).click();
  await anon.getByRole("alert").filter({ hasText: "name@example.com" }).waitFor();
  check(true, "a malformed address is refused with plain copy");
  await anon.getByLabel("Email address").fill("  Ada@Example.com ");
  await anon.getByRole("button", { name: "Send me a link" }).click();
  await anon.getByText("Check your email").waitFor();
  check(!(await anon.locator("main").innerText()).includes("ada@example.com"), "the page does not echo whether the address has an account");
  const link = await anon.getByRole("link", { name: "open the sign-in link" }).getAttribute("href");
  check(!!link && link.includes("/auth/verify?token="), "the dev mailbox holds a sign-in link");

  // A scanner that only opens the link must not use it up.
  const scan = await anon.request.get(link!);
  check(scan.ok() && (await anon.request.get(`${BASE}/api/auth/me`)).status() === 401, "opening the link alone does not sign anyone in");
  await anon.goto(link!, { waitUntil: "load" });
  await anon.getByRole("button", { name: "Sign in", exact: true }).click();
  await anon.waitForURL(`${BASE}/community`);
  const cookies = await context.cookies();
  const session = cookies.find((c) => c.name === "ogbifo_session");
  check(!!session && session.httpOnly && session.sameSite === "Lax", "session cookie is HttpOnly and SameSite=Lax");
  check(!/^[0-9a-f-]{36}$/.test(session?.value ?? ""), "session value is an opaque token");
  const me = await anon.request.get(`${BASE}/api/auth/me`);
  check(me.status() === 200 && (await me.json()).user.email === "ada@example.com", "signed in as the normalised address");
  await anon.getByLabel("In Yorùbá").waitFor();
  check(true, "the contribution form opens once signed in");

  // The link is single use.
  const second = await context.newPage();
  await context.clearCookies();
  await second.goto(link!, { waitUntil: "load" });
  await second.getByRole("button", { name: "Sign in", exact: true }).click();
  await second.waitForURL(/\/sign-in\?problem=link/);
  check(await second.getByRole("alert").filter({ hasText: "expired or was already used" }).isVisible(), "a used link says so and offers a new one");
  await second.close();
  await anon.close();

  // Sign in again for the rest of the run.
  const again = await context.newPage();
  await again.goto(`${BASE}/sign-in`, { waitUntil: "load" });
  await again.getByLabel("Email address").fill("ada@example.com");
  await again.getByRole("button", { name: "Send me a link" }).click();
  const link2 = await again.getByRole("link", { name: "open the sign-in link" }).getAttribute("href");
  await again.goto(link2!, { waitUntil: "load" });
  await again.getByRole("button", { name: "Sign in", exact: true }).click();
  await again.waitForURL(`${BASE}/community`);
  await again.close();

  await page.goto(`${BASE}/community`, { waitUntil: "load" });
  const main = page.locator("main");
  const mine = main.locator("section[aria-labelledby=mine]");
  await main.getByText("Nothing added yet").waitFor();
  check(true, "empty state shown before anything is added");
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
  const kinds = await main.getByLabel("What are you adding?").locator("option").allInnerTexts();
  check(!kinds.includes("Lyric") && kinds.includes("Proverb"), "songs and lyrics are not offered", kinds.join(", "));
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
  await page.reload({ waitUntil: "load" });
  await mine.locator("li").first().waitFor();
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

  // Sign out.
  await page.reload({ waitUntil: "load" });
  await page.getByRole("button", { name: "Sign out" }).click();
  await page.waitForURL(`${BASE}/`);
  check((await page.request.get(`${BASE}/api/auth/me`)).status() === 401, "signing out ends the session");
  await page.goto(`${BASE}/community`, { waitUntil: "load" });
  await page.getByText(/needs an account/).waitFor();
  check(/needs an account/.test(await page.locator("main").innerText()), "after sign-out the form is closed again");

  check(errors.length === 0, "no page errors", errors.join("; "));
  await browser.close();
  console.log(failures === 0 ? "\nAll checks passed." : `\n${failures} check(s) failed.`);
  process.exit(failures === 0 ? 0 : 1);
}

void main();
