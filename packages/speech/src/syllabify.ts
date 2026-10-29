/**
 * Yorùbá syllables and citation tones from tone-marked text (SCORING_SPEC.md section 3).
 *
 * Rules: every vowel is a nucleus; a consonant is the onset of the vowel after
 * it (gb and kp are single consonants); n after a vowel and not before a vowel
 * is a nasal vowel and stays in that syllable; a nasal with no vowel beside it
 * is a syllabic nasal; High is acute, Low is grave, Mid is unmarked or macron.
 *
 * These are citation tones. Downstep, tone spreading and elision are not
 * modelled, which is why reviewers confirm every Card's syllables.
 * Pending review by a Yorùbá linguist (OPEN_CONFLICTS #17).
 */
export type Tone = "H" | "M" | "L";

export interface Syllable {
  readonly text: string;
  readonly tone: Tone;
}

export interface SyllabifyResult {
  readonly syllables: readonly Syllable[];
  /** Letters or marks the rules did not understand. Never silently dropped. */
  readonly issues: readonly string[];
}

const DOT_BELOW = "̣";
const GRAVE = "̀";
const ACUTE = "́";
const MACRON = "̄";

interface Token {
  readonly letter: string;
  readonly tone: Tone | null;
  readonly text: string;
  readonly kind: "V" | "C" | "N";
}

const VOWELS = new Set(["a", "e", "i", "o", "u"]);

function toneFrom(marks: string): Tone | null {
  if (marks.includes(GRAVE)) return "L";
  if (marks.includes(ACUTE)) return "H";
  if (marks.includes(MACRON)) return "M";
  return null;
}

function tokenizeWord(word: string, issues: string[]): Token[] {
  // NFD gives base letter + combining marks in a predictable order.
  const chars = Array.from(word.normalize("NFD"));
  const raw: { base: string; marks: string }[] = [];
  for (const char of chars) {
    if (/[̀-ͯ]/.test(char)) {
      const last = raw[raw.length - 1];
      if (last) last.marks += char;
      else issues.push(`mark with no letter: ${char}`);
    } else {
      raw.push({ base: char, marks: "" });
    }
  }

  const tokens: Token[] = [];
  for (let i = 0; i < raw.length; i += 1) {
    const current = raw[i]!;
    const letter = current.base.toLowerCase();
    if (!/\p{L}/u.test(letter)) {
      issues.push(`unexpected character: ${current.base}`);
      continue;
    }
    const tone = toneFrom(current.marks);
    const dot = current.marks.includes(DOT_BELOW) ? DOT_BELOW : "";
    const nextRaw = raw[i + 1];
    // gb and kp are single consonants.
    if (nextRaw && nextRaw.marks === "" && ((letter === "g" && nextRaw.base.toLowerCase() === "b") || (letter === "k" && nextRaw.base.toLowerCase() === "p"))) {
      tokens.push({ letter: letter + nextRaw.base.toLowerCase(), tone: null, text: (current.base + nextRaw.base).normalize("NFC"), kind: "C" });
      i += 1;
      continue;
    }
    const text = (current.base + dot + current.marks.replace(DOT_BELOW, "")).normalize("NFC");
    if (VOWELS.has(letter)) tokens.push({ letter, tone, text, kind: "V" });
    else if (letter === "n" || letter === "m") tokens.push({ letter, tone, text, kind: "N" });
    else tokens.push({ letter, tone, text, kind: "C" });
  }
  return tokens;
}

function syllabifyWord(word: string, issues: string[]): Syllable[] {
  const tokens = tokenizeWord(word, issues);
  const out: { parts: string[]; tone: Tone }[] = [];
  let onset: string[] = [];

  for (let i = 0; i < tokens.length; i += 1) {
    const t = tokens[i]!;
    const next = tokens[i + 1];

    if (t.kind === "V") {
      const parts = [...onset, t.text];
      onset = [];
      // n after a vowel, with no tone mark and not before a vowel, is nasalisation.
      if (next && next.kind === "N" && next.letter === "n" && next.tone === null) {
        const after = tokens[i + 2];
        if (!after || after.kind !== "V") {
          parts.push(next.text);
          i += 1;
        }
      }
      out.push({ parts, tone: t.tone ?? "M" });
    } else if (t.kind === "N") {
      if (next && next.kind === "V") {
        onset.push(t.text);
      } else {
        // Syllabic nasal: its own syllable, carrying its own tone mark.
        out.push({ parts: [...onset, t.text], tone: t.tone ?? "M" });
        onset = [];
      }
    } else {
      onset.push(t.text);
    }
  }

  if (onset.length > 0) {
    const last = out[out.length - 1];
    issues.push(`consonants with no vowel: ${onset.join("")}`);
    if (last) last.parts.push(...onset);
  }
  return out.map((s) => ({ text: s.parts.join("").normalize("NFC"), tone: s.tone }));
}

export function syllabify(text: string): SyllabifyResult {
  const issues: string[] = [];
  const words = text.normalize("NFC").split(/[\s\-‐-―.,;:!?"“”‘’'()]+/u).filter((w) => w !== "");
  const syllables = words.flatMap((word) => syllabifyWord(word, issues));
  return { syllables, issues };
}
