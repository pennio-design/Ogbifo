import { describe, expect, it } from "vitest";
import { colors, contrastRatio } from "../src/tokens";

const AA_TEXT = 4.5;

describe("brand colour contrast (WCAG AA, normal text)", () => {
  it.each([
    ["bone", "clay"],
    ["bone", "card"],
    ["ash", "clay"],
    ["ash", "card"],
    ["ochre", "clay"],
    ["ochre", "card"],
    ["clay", "ochre"],
  ] as const)("%s on %s", (fg, bg) => {
    expect(contrastRatio(colors[fg], colors[bg])).toBeGreaterThanOrEqual(AA_TEXT);
  });
});
