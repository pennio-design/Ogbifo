import { describe, expect, it } from "vitest";
import { CONSENT_VERSION } from "../src/consent";
import { ContributionService, type SubmitInput } from "../src/contribution-service";
import { fail, ok } from "../src/result";
import {
  BACKOFF_MS, disabledTransport, enqueue, guardTransport, InMemoryArchiveStore, isDue, manualRetry,
  MAX_RETRIES, recordFailure, type SyncTransport,
} from "../src/outbox";

const input: SubmitInput = {
  userId: "u1", kind: "greeting", languageId: "yo", contentText: "Ẹ ǹlẹ́", consent: { version: CONSENT_VERSION, acceptedAt: "t" },
  rightsDeclaration: "own_work",
};
let clock = new Date("2026-10-18T10:00:00.000Z");
const setup = () => {
  let n = 0;
  const store = new InMemoryArchiveStore();
  clock = new Date("2026-10-18T10:00:00.000Z");
  return { store, service: new ContributionService({ store, now: () => clock, newId: () => `id-${++n}` }) };
};
const transport = (results: boolean[]): SyncTransport & { sent: string[] } => {
  const sent: string[] = [];
  return { sent, isAvailable: () => true, send: async (e) => { sent.push(e.id); return results.shift() ?? true ? ok(undefined) : fail("NETWORK", "down"); } };
};

describe("outbox state machine", () => {
  it("follows the backoff schedule then fails after the cap", () => {
    let e = enqueue("a", "contribute", "t");
    const now = new Date("2026-10-18T10:00:00.000Z");
    for (let i = 0; i < MAX_RETRIES; i++) {
      e = recordFailure(e, now);
      expect(e.status).toBe("retrying");
      expect(Date.parse(e.nextAttemptAt!) - now.getTime()).toBe(BACKOFF_MS[i]);
    }
    e = recordFailure(e, now);
    expect(e.status).toBe("failed");
    expect(manualRetry(e)).toMatchObject({ status: "queued", retryCount: 0 });
  });
  it("is due only when queued, or retrying and past its time", () => {
    const e = recordFailure(enqueue("a", "contribute", "t"), clock);
    expect(isDue(e, clock)).toBe(false);
    expect(isDue(e, new Date(clock.getTime() + 5_000))).toBe(true);
    expect(isDue({ ...e, status: "synced" }, clock)).toBe(false);
  });
  it("manual retry leaves other states alone", () => {
    const e = enqueue("a", "contribute", "t");
    expect(manualRetry(e)).toBe(e);
  });
});

describe("contribution service (local first)", () => {
  it("saves locally, queues, and shows the contribution at once", async () => {
    const { service } = setup();
    const r = await service.submit(input);
    expect(r.ok && r.value.sync).toBe("queued");
    const list = await service.list("u1");
    expect(list).toHaveLength(1);
    expect(list[0]!.contribution.contentText).toBe("Ẹ ǹlẹ́");
    expect(list[0]!.contribution.verification.status).toBe("pending_review");
  });
  it("writes nothing when validation fails", async () => {
    const { service, store } = setup();
    const r = await service.submit({ ...input, consent: null });
    expect(r.ok).toBe(false);
    expect(await store.listContributions()).toHaveLength(0);
    expect(await store.listOutbox()).toHaveLength(0);
  });
  it("sends nothing while no transport is available, and the draft guard keeps it that way", async () => {
    const { service } = setup();
    await service.submit(input);
    const live = transport([true]);
    expect(guardTransport(live)).toBe(disabledTransport);
    const r = await service.sync(guardTransport(live));
    expect(r.ok && r.value.attempted).toBe(0);
    expect(live.sent).toEqual([]);
    expect((await service.list("u1"))[0]!.sync).toBe("queued");
  });
  it("syncs once, then does not resend (idempotent)", async () => {
    const { service } = setup();
    await service.submit(input);
    const t = transport([true]);
    expect(await service.sync(t)).toMatchObject({ ok: true, value: { attempted: 1, synced: 1 } });
    expect((await service.list("u1"))[0]!.sync).toBe("synced");
    await service.sync(t);
    expect(t.sent).toEqual(["id-1:contribute"]);
  });
  it("retries after a failure only once the delay has passed", async () => {
    const { service } = setup();
    await service.submit(input);
    const t = transport([false, true]);
    await service.sync(t);
    expect((await service.list("u1"))[0]!.sync).toBe("retrying");
    expect(await service.sync(t)).toMatchObject({ value: { attempted: 0 } });
    clock = new Date(clock.getTime() + 5_000);
    await service.sync(t);
    expect((await service.list("u1"))[0]!.sync).toBe("synced");
  });
  it("treats a throwing transport as a failure, not a crash", async () => {
    const { service } = setup();
    await service.submit(input);
    const t: SyncTransport = { isAvailable: () => true, send: async () => { throw new Error("offline"); } };
    expect(await service.sync(t)).toMatchObject({ ok: true, value: { failed: 1 } });
  });
  it("withdrawal hides the entry at once and queues the withdrawal", async () => {
    const { service, store } = setup();
    await service.submit(input);
    expect((await service.withdraw("id-1")).ok).toBe(true);
    expect(await service.list("u1")).toHaveLength(0);
    expect((await store.listOutbox()).map((e) => e.id).sort()).toEqual(["id-1:contribute", "id-1:withdraw"]);
    expect((await service.withdraw("id-1")).ok).toBe(true);
    expect((await service.withdraw("nope")).ok).toBe(false);
  });
  it("lists only the signed-in user's contributions", async () => {
    const { service } = setup();
    await service.submit(input);
    await service.submit({ ...input, userId: "u2" });
    expect(await service.list("u1")).toHaveLength(1);
    expect(await service.list("u2")).toHaveLength(1);
    expect(await service.list("nobody")).toHaveLength(0);
  });
  it("lists newest first", async () => {
    const { service } = setup();
    await service.submit(input);
    clock = new Date(clock.getTime() + 1000);
    await service.submit({ ...input, contentText: "Ẹ káàárọ̀" });
    expect((await service.list("u1")).map((v) => v.contribution.contentText)).toEqual(["Ẹ káàárọ̀", "Ẹ ǹlẹ́"]);
  });
});
