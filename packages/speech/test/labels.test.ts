import { describe, expect, it } from "vitest";
import { compareWithCardText, labelsToSyllables, parseAudacityLabels } from "../src/labels";

const file = "0.300000\t0.520000\tẸ\n0.520000\t0.720000\tká\n0.720000\t0.900000\tà\n0.900000\t1.100000\tá\n1.100000\t1.360000\trọ̀\n";

describe("Audacity label import", () => {
  it("parses an exported label track into milliseconds, in order", () => {
    const r = parseAudacityLabels(file);
    expect(r.ok && r.value.map((l) => [l.startMs, l.endMs, l.text])).toEqual([
      [300, 520, "Ẹ"], [520, 720, "ká"], [720, 900, "à"], [900, 1100, "á"], [1100, 1360, "rọ̀"],
    ]);
  });
  it("sorts labels, skips blank lines and frequency-range lines, and accepts CRLF and a byte-order mark", () => {
    const messy = "﻿1.0\t1.2\tb\r\n\r\n\\\t100.0\t900.0\r\n0.5\t1.0\ta\r\n";
    const r = parseAudacityLabels(messy);
    expect(r.ok && r.value.map((l) => l.text)).toEqual(["a", "b"]);
  });
  it("accepts a decimal comma", () => {
    const r = parseAudacityLabels("0,5\t1,0\ta");
    expect(r.ok && r.value[0]).toMatchObject({ startMs: 500, endMs: 1000 });
  });
  it.each([
    ["too few columns", "0.5\t1.0"],
    ["times that are not numbers", "x\ty\tka"],
    ["a label that ends before it starts", "1.0\t0.5\tka"],
    ["a negative start", "-1\t0.5\tka"],
    ["an empty label", "0.1\t0.5\t "],
    ["an empty file", "\n\n"],
  ])("rejects %s with a specific message", (_n, input) => {
    const r = parseAudacityLabels(input);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.message.length).toBeGreaterThan(10);
  });
});

describe("labels to syllables", () => {
  it("derives each tone from the tone marks", () => {
    const labels = parseAudacityLabels(file);
    if (!labels.ok) throw new Error("fixture");
    const r = labelsToSyllables(labels.value);
    expect(r.ok && r.value.map((s) => `${s.text}·${s.tone}`)).toEqual(["Ẹ·M", "ká·H", "à·L", "á·H", "rọ̀·L"]);
  });
  it("rejects a label that is more than one syllable, naming it", () => {
    const r = labelsToSyllables([{ startMs: 0, endMs: 100, text: "kàá" }]);
    expect(!r.ok && r.error.message).toMatch(/Label 1.*exactly one syllable/);
  });
  it("normalises decomposed label text to NFC", () => {
    const r = labelsToSyllables([{ startMs: 0, endMs: 100, text: "rọ̀" }]);
    expect(r.ok && r.value[0]!.text).toBe("rọ̀");
  });
});

describe("comparing with the Card text", () => {
  it("matches when the reviewer's syllables equal the proposal", () => {
    expect(compareWithCardText("Ẹ káàárọ̀", [{ text: "Ẹ" }, { text: "ká" }, { text: "à" }, { text: "á" }, { text: "rọ̀" }]).matches).toBe(true);
  });
  it("reports a difference without failing, so the reviewer can decide", () => {
    const r = compareWithCardText("Ẹ káàárọ̀", [{ text: "Ẹ" }, { text: "káà" }, { text: "árọ̀" }]);
    expect(r.matches).toBe(false);
    expect(r.expected).toHaveLength(5);
    expect(r.got).toHaveLength(3);
  });
});
