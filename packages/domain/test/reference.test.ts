import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PGlite } from "@electric-sql/pglite";
import { buildReferenceAnnotation, KAAARO, synthUtterance } from "@ogbifo/speech";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createCard, type Card } from "../src/card";
import { validateProvenance, type ReferenceProvenance } from "../src/provenance";

const t = synthUtterance(KAAARO, { seed: 1 });
const built = buildReferenceAnnotation({
  samples: t.samples,
  syllables: t.spans.map((s, i) => ({ text: `s${i}`, tone: KAAARO[i]!.tone, ...s })),
});
if (!built.ok) throw new Error("fixture");
const annotation = built.value;

const provenance: ReferenceProvenance = {
  source: "Recorded in a studio for Ogbifọ",
  licence: "recorded_for_ogbifo",
  rightsHolder: "A. Speaker",
  speakerConsent: true,
  recordedOn: "2026-11-01",
};

const base: Card = {
  id: "c1", deckId: "d1", languageId: "yo", category: "greeting", sourceText: "Ẹ káàárọ̀", translation: "Good morning",
  context: "", source: "s", tokenValue: 10, difficulty: 1, createdAt: "2026-10-17T00:00:00.000Z",
  reviewStatus: "unreviewed", reviewers: [],
};
const withAudio: Card = { ...base, referenceAudioUrl: "/ref/c1.wav", referenceAnnotation: annotation, referenceProvenance: provenance };
const reviewed = (c: Card): Card => ({ ...c, reviewStatus: "reviewed", reviewers: ["A One", "B Two"], reviewedAt: "2026-10-18T00:00:00.000Z" });

describe("provenance (D-034)", () => {
  const ok = (p: Partial<ReferenceProvenance>, reviewedCard = false) => validateProvenance({ ...provenance, ...p }, { reviewed: reviewedCard });
  it("accepts a recording made for Ogbifọ with consent", () => expect(ok({}).ok).toBe(true));
  it("rejects one without the speaker's consent", () => expect(ok({ speakerConsent: false }).ok).toBe(false));
  it("accepts written permission from a rights holder", () => expect(ok({ licence: "written_permission", speakerConsent: false }).ok).toBe(true));
  it("requires attribution for CC BY, and not for CC0", () => {
    expect(ok({ licence: "cc_by" }).ok).toBe(false);
    expect(ok({ licence: "cc_by", attribution: "Voice: B. Speaker, CC BY 4.0" }).ok).toBe(true);
    expect(ok({ licence: "cc0" }).ok).toBe(true);
  });
  it("never lets a synthetic test recording onto a reviewed Card", () => {
    expect(ok({ licence: "synthetic_test" }, false).ok).toBe(true);
    expect(ok({ licence: "synthetic_test" }, true).ok).toBe(false);
  });
  it.each([["source", { source: " " }], ["rights holder", { rightsHolder: "" }], ["date", { recordedOn: "later" }], ["licence", { licence: "found_online" as never }]])(
    "rejects a missing or invalid %s", (_n, patch) => expect(ok(patch).ok).toBe(false));
});

describe("Cards with reference audio", () => {
  const code = (c: Card) => { const r = createCard(c); return r.ok ? "ok" : (r.error.field ?? r.error.code); };
  it("accepts audio with annotation and provenance", () => expect(createCard(withAudio).ok).toBe(true));
  it("accepts a Card with no reference at all", () => expect(createCard(base).ok).toBe(true));
  it("rejects audio without an annotation, and an annotation without audio", () => {
    expect(code({ ...base, referenceAudioUrl: "/x.wav", referenceProvenance: provenance })).toBe("referenceAnnotation");
    expect(code({ ...base, referenceAnnotation: annotation, referenceProvenance: provenance })).toBe("referenceAudioUrl");
  });
  it("rejects audio without provenance, and provenance without audio", () => {
    expect(code({ ...base, referenceAudioUrl: "/x.wav", referenceAnnotation: annotation })).toBe("referenceProvenance");
    expect(code({ ...base, referenceProvenance: provenance })).toBe("referenceAudioUrl");
  });
  it("rejects a reviewed Card whose reference is synthetic", () => {
    const synthetic = { ...withAudio, referenceProvenance: { ...provenance, licence: "synthetic_test" as const } };
    expect(createCard(synthetic).ok).toBe(true);
    expect(code(reviewed(synthetic))).toBe("referenceProvenance");
  });
});

describe("migration 0003", () => {
  const dir = join(__dirname, "..", "db", "migrations");
  const files = ["0001_init.sql", "0002_review_unlock_sessions.sql", "0003_reference_audio.sql"];
  let db: PGlite;
  beforeAll(async () => {
    db = new PGlite();
    for (const f of files) await db.exec(readFileSync(join(dir, f), "utf8"));
    await db.exec(`INSERT INTO languages (id, name, code, native_name, writing_system, status) VALUES ('yo','Yorùbá','yo','Yorùbá','Latin','active');
                   INSERT INTO decks (id, name, language_id, tier, region) VALUES ('d1','D','yo',1,'r');`);
  }, 60_000);
  beforeEach(async () => {
    await db.exec("DELETE FROM cards");
  });
  const insert = (extra: string, values: string) =>
    `INSERT INTO cards (id, deck_id, language_id, category, source_text, translation, source, difficulty ${extra})
     VALUES ('c', 'd1', 'yo', 'greeting', 'a', 'b', 's', 1 ${values})`;

  it("accepts audio with annotation and provenance, and a Card with none", async () => {
    await db.exec(insert("", ""));
    await db.exec("UPDATE cards SET reference_audio_url='/a.wav', reference_annotation='{}', reference_provenance='{\"licence\":\"cc0\"}'");
  });
  it("rejects audio without annotation or provenance, and either without audio", async () => {
    await expect(db.exec(insert(", reference_audio_url", ", '/a.wav'"))).rejects.toThrow();
    await expect(db.exec(insert(", reference_annotation", ", '{}'"))).rejects.toThrow();
    await expect(db.exec(insert(", reference_provenance", ", '{}'"))).rejects.toThrow();
  });
  it("never lets a reviewed Card carry a synthetic reference", async () => {
    await db.exec(insert(", reference_audio_url, reference_annotation, reference_provenance", ", '/a.wav', '{}', '{\"licence\":\"synthetic_test\"}'"));
    await expect(db.exec("UPDATE cards SET review_status='reviewed', reviewers=ARRAY['A','B'], reviewed_at=now()")).rejects.toThrow();
  });
});
