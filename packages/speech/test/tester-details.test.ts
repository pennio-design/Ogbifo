import { describe, expect, it } from "vitest";
import { analyzeAttempt } from "../src/analyze";
import { buildReferenceAnnotation } from "../src/annotation";
import { synthSpeech } from "../src/speech-synth";
import { PITCH_ALGORITHM_VERSION } from "../src/pitch";
import { syllabify } from "../src/syllabify";
import { testerDetails } from "../src/tester-details";

describe("tester details", () => {
  const parts = syllabify("Ẹ káàárọ̀").syllables;
  const ref = synthSpeech(parts, { seed: 1 });
  const annotation = buildReferenceAnnotation({ samples: ref.samples, syllables: parts.map((p, i) => ({ text: p.text, tone: p.tone, ...ref.spans[i]! })) });
  it("lists every syllable, the global numbers and each pitch step, as plain text", () => {
    if (!annotation.ok) throw new Error("setup");
    const result = analyzeAttempt(synthSpeech(parts, { seed: 4, registerSemitones: 6 }).samples, annotation.value);
    if (result.status !== "scored") throw new Error("refused");
    const text = testerDetails(result);
    expect(text).toContain(PITCH_ALGORITHM_VERSION);
    expect(text).toContain("alignment cost");
    for (const p of parts) expect(text).toContain(p.text);
    expect(text.match(/ to /g)?.length).toBe(parts.length - 1);
    expect(text).toMatch(/reference [+-]/);
    expect(text).not.toMatch(/NaN|undefined/);
  });
});
