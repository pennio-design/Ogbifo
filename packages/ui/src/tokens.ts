/** Mirror of tokens.css, used by tests and by code that cannot read CSS variables. */
export const colors = {
  clay: "#121413",
  ochre: "#D49B41",
  bone: "#FAF9F6",
  charcoal: "#1A1C1B",
  forest: "#1B2E24",
  ash: "#8A8D8A",
  card: "#161817",
} as const;

export type ColorToken = keyof typeof colors;

/** WCAG 2.x relative luminance. */
export function luminance(hex: string): number {
  const channel = (offset: number) => {
    const v = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}
