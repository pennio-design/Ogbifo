import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LanguageText } from "../src/language-text";

describe("LanguageText", () => {
  it("sets lang and displays NFC without touching the input", () => {
    const decomposed = "Ogbifọ̀";
    const html = renderToStaticMarkup(<LanguageText text={decomposed} lang="yo" />);
    expect(html).toContain('lang="yo"');
    expect(html).toContain("Ogbifọ̀");
    expect(html).not.toContain("ọ");
    expect(decomposed).toBe("Ogbifọ̀");
  });

  it("keeps line breaks for the caller to style", () => {
    expect(renderToStaticMarkup(<LanguageText text={"a\nb"} lang="yo" as="p" />)).toBe('<p lang="yo" class="font-language">a\nb</p>');
  });
});
