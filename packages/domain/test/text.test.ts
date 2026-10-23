import { describe, expect, it } from "vitest";
import { countGraphemes, graphemes, isBlank, sameText, truncateGraphemes } from "../src/text";

// Decomposed on purpose: o + dot below + grave, e + dot below + acute.
const DECOMPOSED_OGBIFO = "Ogbifọ̀";
const PRECOMPOSED_OGBIFO = "Ogbifọ̀";

describe("grapheme-safe text", () => {
  it("counts a base letter and its marks as one character", () => {
    expect(countGraphemes(DECOMPOSED_OGBIFO)).toBe(6);
    expect(DECOMPOSED_OGBIFO.length).toBeGreaterThan(6);
  });

  it("never splits a tone mark from its letter when truncating", () => {
    const cut = truncateGraphemes(DECOMPOSED_OGBIFO, 6);
    expect(cut).toBe(DECOMPOSED_OGBIFO);
    const shorter = truncateGraphemes("Ẹ káàárọ̀ o", 5);
    for (const part of graphemes(shorter.slice(0, -1))) expect(part.normalize("NFC")).not.toMatch(/^[̀-ͯ]/);
    expect(countGraphemes(shorter)).toBe(5);
  });

  it("truncates to zero characters without throwing", () => {
    expect(truncateGraphemes("Nnọọ", 0)).toBe("");
  });

  it("compares decomposed and precomposed forms as equal without changing either", () => {
    expect(sameText(DECOMPOSED_OGBIFO, PRECOMPOSED_OGBIFO)).toBe(true);
    expect(DECOMPOSED_OGBIFO).not.toBe(PRECOMPOSED_OGBIFO);
  });

  it("treats whitespace-only text as blank", () => {
    expect(isBlank(" \n\t")).toBe(true);
    expect(isBlank("ọ")).toBe(false);
  });
});
