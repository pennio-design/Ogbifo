import type { ElementType, ReactNode } from "react";

export interface LanguageTextProps {
  text: string;
  /** BCP 47 code of the text, so browsers pick the right shaping and screen readers the right voice. */
  lang: string;
  as?: ElementType;
  className?: string;
  children?: ReactNode;
}

/**
 * Renders language text. Display uses NFC so base letters and tone marks sit
 * in one cluster for font shaping; the stored text is never altered.
 * Always set in the language face (Noto Serif): Fraunces and Space Grotesk
 * mis-position stacked tone marks, so brand faces must not set language text.
 */
export function LanguageText({ text, lang, as: Tag = "span", className }: LanguageTextProps) {
  return (
    <Tag lang={lang} className={`font-language ${className ?? ""}`.trim()}>
      {text.normalize("NFC")}
    </Tag>
  );
}
