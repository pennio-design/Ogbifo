import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RoyalSeal, SEAL_LOOP_PATH, SEAL_SPOKES } from "../src/royal-seal";

const canonical = readFileSync(join(__dirname, "../../../docs/brand/royal-seal.svg"), "utf8");
const num = (s: string) => Number(s);

describe("RoyalSeal", () => {
  it("matches the canonical SVG: 16 spokes, one loop, one fulcrum", () => {
    const lines = [...canonical.matchAll(/<line x1="([\d.]+)" y1="([\d.]+)" x2="([\d.]+)" y2="([\d.]+)"/g)].map(
      (m) => m.slice(1).map(num),
    );
    expect(lines).toHaveLength(16);
    expect(SEAL_SPOKES.map((s) => [...s])).toEqual(lines);
    expect(canonical.match(/<path/g)).toHaveLength(1);
    expect(canonical).toContain(`d="${SEAL_LOOP_PATH}"`);
    expect(canonical).toMatch(/<circle cx="50" cy="50" r="5"/);
  });

  it("renders the same geometry", () => {
    const html = renderToStaticMarkup(<RoyalSeal />);
    expect(html.match(/<line /g)).toHaveLength(16);
    expect(html.match(/<path /g)).toHaveLength(1);
    expect(html).toContain('stroke="currentColor"');
  });

  it("is hidden from assistive tech unless given a title", () => {
    expect(renderToStaticMarkup(<RoyalSeal />)).toContain('aria-hidden="true"');
    const named = renderToStaticMarkup(<RoyalSeal title="Ogbifọ Royal Seal" />);
    expect(named).toContain('role="img"');
    expect(named).toContain('aria-label="Ogbifọ Royal Seal"');
    expect(named).not.toContain("aria-hidden");
  });
});
