import { describe, expect, it } from "vitest";
import { syllabify } from "../src/syllabify";

const show = (text: string) => syllabify(text).syllables.map((s) => `${s.text}·${s.tone}`).join(" ");

describe("syllabify: the SCORING_SPEC section 3 vectors", () => {
  it.each([
    ["Ẹ káàárọ̀", "Ẹ·M ká·H à·L á·H rọ̀·L"],
    ["ọmọ", "ọ·M mọ·M"],
    ["ìbàdàn", "ì·L bà·L dàn·L"],
    ["ń lọ", "ń·H lọ·M"],
    ["jẹun", "jẹ·M un·M"],
    ["ogbó", "o·M gbó·H"],
    ["kò gbọdọ̀", "kò·L gbọ·M dọ̀·L"],
    ["ojúkòkòrò", "o·M jú·H kò·L kò·L rò·L"],
    ["dára", "dá·H ra·M"],
  ])("%s", (text, expected) => {
    const result = syllabify(text);
    expect(show(text)).toBe(expected);
    expect(result.issues).toEqual([]);
  });
});

describe("syllabify: more behaviour", () => {
  it("gives the same answer for decomposed and precomposed input", () => {
    const nfc = "Ẹni tó bá fẹ́ jẹun tó dára, kò gbọdọ̀ jẹkí ojúkòkòrò mú un.";
    expect(show(nfc.normalize("NFD"))).toBe(show(nfc.normalize("NFC")));
  });
  it("syllabifies a long sentence with stacked marks (a test string, not a real proverb)", () => {
    expect(show("Ẹni tó bá fẹ́ jẹun tó dára,")).toBe("Ẹ·M ni·M tó·H bá·H fẹ́·H jẹ·M un·M tó·H dá·H ra·M");
    expect(show("mú un.")).toBe("mú·H un·M");
  });
  it("syllabifies the hero proverb", () => {
    expect(show("Adìyẹ tí kò kú ṣì maa jẹ àgbàdo.")).toBe("A·M dì·L yẹ·M tí·H kò·L kú·H ṣì·L ma·M a·M jẹ·M à·L gbà·L do·M");
  });
  it("does not yet read a contraction: the apostrophe splits a bare consonant (elision is not modelled)", () => {
    const result = syllabify("Adìyẹ tí 'ò kú ṣì maa j'àgbàdo.");
    expect(result.issues.join(" ")).toContain("j");
  });
  it("treats n before a vowel as an onset and n before a consonant as nasalisation", () => {
    expect(show("ìnú")).toBe("ì·L nú·H");
    expect(show("ìbàdàn")).toBe("ì·L bà·L dàn·L");
  });
  it("keeps adjacent vowels as separate syllables", () => {
    expect(show("jẹun")).toBe("jẹ·M un·M");
  });
  it("keeps the tone marks and dots in each syllable's text", () => {
    for (const s of syllabify("Ẹ káàárọ̀").syllables) expect(s.text).toBe(s.text.normalize("NFC"));
    expect(syllabify("rọ̀").syllables[0]!.text).toBe("rọ̀");
  });
  it("reports what it cannot parse instead of dropping it", () => {
    expect(syllabify("ka7").issues.length).toBeGreaterThan(0);
    expect(syllabify("kt").issues.join(" ")).toMatch(/no vowel/);
  });
  it("returns nothing for empty text", () => {
    expect(syllabify("  ").syllables).toEqual([]);
  });
  it("reads a macron as an explicit Mid tone", () => {
    expect(show("ā")).toBe("ā·M");
  });
});
