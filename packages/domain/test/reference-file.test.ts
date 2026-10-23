import { buildReferenceAnnotation, KAAARO, synthUtterance } from "@ogbifo/speech";
import { describe, expect, it } from "vitest";
import { seedCards } from "../src/seed";
import { attachReference, audioExtension, parseReferenceFile, referenceAudioUrl, referenceJsonName } from "../src/reference-file";

const t = synthUtterance(KAAARO, { seed: 1 });
const built = buildReferenceAnnotation({ samples: t.samples, syllables: t.spans.map((s, i) => ({ text: `s${i}`, tone: KAAARO[i]!.tone, ...s })) });
if (!built.ok) throw new Error("fixture");
const file = () => ({
  cardId: "card-yo-greeting-1",
  audioUrl: "/references/card-yo-greeting-1.wav",
  annotation: JSON.parse(JSON.stringify(built.value)),
  provenance: { source: "Studio session", licence: "recorded_for_ogbifo", rightsHolder: "A. Speaker", speakerConsent: true, recordedOn: "2026-11-01" },
});

describe("reference file", () => {
  it("round-trips through JSON, as the tool writes it and the app reads it", () => {
    const r = parseReferenceFile(JSON.parse(JSON.stringify(file())));
    expect(r.ok && r.value.annotation.syllables).toHaveLength(5);
  });
  it.each([
    ["not an object", "x"],
    ["no card", { ...file(), cardId: "" }],
    ["an audio location without a leading slash", { ...file(), audioUrl: "references/a.wav" }],
    ["no provenance", { ...file(), provenance: undefined }],
    ["a recording without the speaker's consent", { ...file(), provenance: { ...file().provenance, speakerConsent: false } }],
    ["an unknown licence", { ...file(), provenance: { ...file().provenance, licence: "found_online" } }],
  ])("rejects %s", (_n, input) => expect(parseReferenceFile(input).ok).toBe(false));
  it.each([
    ["fewer than two syllables", (f: ReturnType<typeof file>) => { f.annotation.syllables = f.annotation.syllables.slice(0, 1); }],
    ["a bad tone", (f: ReturnType<typeof file>) => { f.annotation.syllables[0].tone = "X"; }],
    ["overlapping syllables", (f: ReturnType<typeof file>) => { f.annotation.syllables[1].startMs = 0; }],
    ["a malformed contour", (f: ReturnType<typeof file>) => { f.annotation.contourHz[0] = "high"; }],
    ["features of the wrong width", (f: ReturnType<typeof file>) => { f.annotation.mfcc[0] = [1, 2, 3]; }],
    ["no algorithm version", (f: ReturnType<typeof file>) => { f.annotation.algorithmVersion = ""; }],
  ])("rejects an annotation with %s", (_n, mutate) => {
    const f = file();
    mutate(f);
    expect(parseReferenceFile(f).ok).toBe(false);
  });
  it("names files predictably and recognises audio extensions", () => {
    expect(referenceJsonName("c1")).toBe("c1.json");
    expect(referenceAudioUrl("c1", "wav")).toBe("/references/c1.wav");
    expect(audioExtension("Take 3.WAV")).toBe("wav");
    expect(audioExtension("voice.m4a")).toBe("m4a");
    expect(audioExtension("notes.txt")).toBeNull();
    expect(audioExtension("noextension")).toBeNull();
  });
});

describe("attaching a reference file to a Card", () => {
  const card = seedCards.find((c) => c.id === "card-yo-greeting-1")!;
  const parsed = () => {
    const r = parseReferenceFile(JSON.parse(JSON.stringify(file())));
    if (!r.ok) throw new Error("fixture");
    return r.value;
  };
  it("adds the audio, annotation and provenance to the Card", () => {
    const r = attachReference(card, parsed());
    expect(r.ok && r.value.referenceAudioUrl).toBe("/references/card-yo-greeting-1.wav");
    expect(r.ok && r.value.referenceProvenance?.licence).toBe("recorded_for_ogbifo");
    expect(r.ok && r.value.sourceText).toBe(card.sourceText);
  });
  it("refuses a file made for a different Card", () => {
    expect(attachReference(seedCards.find((c) => c.id === "card-yo-proverb-1")!, parsed()).ok).toBe(false);
  });
  it("refuses to put a synthetic reference on a reviewed Card, changing nothing", () => {
    const reviewed = { ...card, reviewStatus: "reviewed" as const, reviewers: ["A One", "B Two"], reviewedAt: "2026-10-18T00:00:00.000Z" };
    const f = parsed();
    const synthetic = { ...f, provenance: { ...f.provenance, licence: "synthetic_test" as const } };
    expect(attachReference(reviewed, synthetic).ok).toBe(false);
    expect(reviewed.referenceAudioUrl).toBeUndefined();
  });
});
