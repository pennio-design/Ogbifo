import { describe, expect, it } from "vitest";
import { analyzeAttempt, REFUSAL_MESSAGES, type AttemptScored } from "../src/analyze";
import { buildReferenceAnnotation } from "../src/annotation";
import { buildOverlay } from "../src/overlay";
import { initialRecorder, recorderAnnouncement, RECORDER_ERROR_MESSAGES, recorderReducer as reduce, type RecorderState } from "../src/recorder-state";
import { MARKER_LABELS, NOT_WORDS_NOTE, paceSentence, scoreSentence, stepSummary } from "../src/summary";
import { KAAARO, synthUtterance } from "../src/synth";

const BANNED = /\b(correct|incorrect|wrong|perfect|authentic|native-like|accent|error)\b/i;

describe("recorder state machine", () => {
  const scored = { status: "refused", reason: "too_quiet", message: REFUSAL_MESSAGES.too_quiet } as const;
  it("walks the happy path", () => {
    let s: RecorderState = initialRecorder;
    s = reduce(s, { type: "press" });
    expect(s.status).toBe("requesting_permission");
    s = reduce(s, { type: "granted" });
    expect(s.status).toBe("recording");
    s = reduce(s, { type: "stop" });
    expect(s.status).toBe("processing");
    s = reduce(s, { type: "analysed", result: scored });
    expect(s).toMatchObject({ status: "complete", result: scored });
  });
  it("reports a denied microphone with a kind, and allows trying again", () => {
    let s = reduce(reduce(initialRecorder, { type: "press" }), { type: "denied", kind: "permission_denied" });
    expect(s).toMatchObject({ status: "error", errorKind: "permission_denied" });
    s = reduce(s, { type: "press" });
    expect(s.status).toBe("requesting_permission");
  });
  it("ignores actions that make no sense in the current state", () => {
    expect(reduce(initialRecorder, { type: "stop" })).toBe(initialRecorder);
    expect(reduce(initialRecorder, { type: "granted" })).toBe(initialRecorder);
    const recording: RecorderState = { status: "recording" };
    expect(reduce(recording, { type: "press" })).toBe(recording);
    expect(reduce(recording, { type: "analysed", result: scored })).toBe(recording);
  });
  it("allows cancelling a recording but not mid-analysis", () => {
    expect(reduce({ status: "recording" }, { type: "reset" })).toBe(initialRecorder);
    const processing: RecorderState = { status: "processing" };
    expect(reduce(processing, { type: "reset" })).toBe(processing);
  });
  it("fails during recording or analysis", () => {
    expect(reduce({ status: "recording" }, { type: "failed", kind: "capture_failed" }).status).toBe("error");
    expect(reduce({ status: "processing" }, { type: "failed", kind: "analysis_failed" }).status).toBe("error");
    expect(reduce(initialRecorder, { type: "failed", kind: "capture_failed" })).toBe(initialRecorder);
  });
  it("has plain copy for every error and announces each state", () => {
    for (const message of Object.values(RECORDER_ERROR_MESSAGES)) {
      expect(message).not.toMatch(BANNED);
      expect(message.length).toBeGreaterThan(20);
    }
    expect(recorderAnnouncement(initialRecorder)).toBe("");
    expect(recorderAnnouncement({ status: "recording" })).toMatch(/recording/i);
    expect(recorderAnnouncement({ status: "error", errorKind: "no_microphone" })).toBe(RECORDER_ERROR_MESSAGES.no_microphone);
    expect(recorderAnnouncement({ status: "complete", result: scored })).toBe(REFUSAL_MESSAGES.too_quiet);
  });
});

describe("overlay geometry", () => {
  const ref = synthUtterance(KAAARO, { seed: 1 });
  const annotationResult = buildReferenceAnnotation({
    samples: ref.samples,
    syllables: ref.spans.map((s, i) => ({ text: `s${i}`, tone: KAAARO[i]!.tone, ...s })),
  });
  if (!annotationResult.ok) throw new Error("fixture");
  const annotation = annotationResult.value;
  const analyse = (options: Parameters<typeof synthUtterance>[1]) => {
    const r = analyzeAttempt(synthUtterance(KAAARO, options).samples, annotation);
    if (r.status !== "scored") throw new Error("refused");
    return r as AttemptScored;
  };

  it("puts both contours on 0 to 1 with no NaN, in order, one syllable block per syllable", () => {
    const o = buildOverlay(analyse({ seed: 2 }), annotation);
    expect(o.syllables).toHaveLength(5);
    for (const run of [...o.reference, ...o.learner]) {
      for (const [i, p] of run.entries()) {
        expect(p.x).toBeGreaterThanOrEqual(0);
        expect(p.x).toBeLessThanOrEqual(1);
        expect(Number.isFinite(p.y)).toBe(true);
        if (i > 0) expect(p.x).toBeGreaterThan(run[i - 1]!.x);
      }
    }
    for (const [i, s] of o.syllables.entries()) {
      expect(s.x1).toBeGreaterThan(s.x0);
      if (i > 0) expect(s.x0).toBeGreaterThanOrEqual(o.syllables[i - 1]!.x1 - 1e-9);
    }
    expect(o.yMax - o.yMin).toBeGreaterThanOrEqual(6);
  });

  it("makes a same-voice reading overlap the reference, even when read more slowly", () => {
    const o = buildOverlay(analyse({ seed: 2, tempo: 1.3 }), annotation);
    const mean = (runs: typeof o.reference) => {
      const all = runs.flat();
      return all.reduce((a, p) => a + p.y, 0) / all.length;
    };
    expect(Math.abs(mean(o.reference) - mean(o.learner))).toBeLessThan(0.6);
  });

  it("shows a monotone reading as flatter than the reference", () => {
    const o = buildOverlay(analyse({ seed: 6, monotone: true }), annotation);
    const spread = (runs: typeof o.reference) => {
      const ys = runs.flat().map((p) => p.y);
      return Math.max(...ys) - Math.min(...ys);
    };
    expect(spread(o.learner)).toBeLessThan(spread(o.reference) * 0.6);
  });
});

describe("result wording", () => {
  it("describes the steps without judging", () => {
    expect(stepSummary(["first", "close", "close", "higher", "lower"])).toMatchObject({
      measured: 4,
      close: 2,
      sentence: "2 of 4 pitch steps went the way the tone marks call for.",
      revisit: [{ index: 3, direction: "higher" }, { index: 4, direction: "lower" }],
    });
    expect(stepSummary(["first", "close"]).sentence).toBe("1 of 1 pitch step went the way the tone marks call for.");
    expect(stepSummary(["first", "unmeasured", "unmeasured"]).sentence).toMatch(/couldn't measure/);
  });
  it("reports pace only when it is clearly different", () => {
    expect(paceSentence(1.05)).toBeNull();
    expect(paceSentence(1.4)).toBe("You read about 40% slower than the reference.");
    expect(paceSentence(0.7)).toBe("You read about 30% faster than the reference.");
    expect(paceSentence(Number.NaN)).toBeNull();
  });
  it("uses the four score bands from the spec", () => {
    expect(scoreSentence(100)).toBe("Your reading followed the tones closely.");
    expect(scoreSentence(80)).toBe("Your reading followed the tones closely.");
    expect(scoreSentence(79)).toBe("Your reading followed most of the tones.");
    expect(scoreSentence(60)).toBe("Your reading followed most of the tones.");
    expect(scoreSentence(59)).toMatch(/^Some tones differed/);
    expect(scoreSentence(40)).toMatch(/^Some tones differed/);
    expect(scoreSentence(39)).toMatch(/^The tones differed/);
  });
  it("never uses banned words", () => {
    for (const text of [...Object.values(MARKER_LABELS), NOT_WORDS_NOTE, scoreSentence(10), scoreSentence(50), scoreSentence(70), scoreSentence(90), ...Object.values(REFUSAL_MESSAGES)]) {
      expect(text).not.toMatch(BANNED);
    }
  });
  it("states that words are not checked", () => {
    expect(NOT_WORDS_NOTE).toBe("This checks the tones and timing of your reading, not the words.");
  });
});

import { encodeWav } from "../src/wav";

describe("WAV encoding", () => {
  it("writes a valid 16-bit mono header and clamps samples", () => {
    const bytes = encodeWav(Float32Array.from([0, 0.5, -0.5, 2, -2]), 16000);
    const view = new DataView(bytes.buffer);
    const text = (o: number, n: number) => String.fromCharCode(...bytes.slice(o, o + n));
    expect([text(0, 4), text(8, 4), text(12, 4), text(36, 4)]).toEqual(["RIFF", "WAVE", "fmt ", "data"]);
    expect(view.getUint32(24, true)).toBe(16000);
    expect(view.getUint16(22, true)).toBe(1);
    expect(view.getUint16(34, true)).toBe(16);
    expect(bytes.length).toBe(44 + 5 * 2);
    expect(view.getUint32(40, true)).toBe(10);
    expect(view.getInt16(44 + 3 * 2, true)).toBe(32767);
    expect(view.getInt16(44 + 4 * 2, true)).toBe(-32767);
    expect(view.getInt16(44 + 1 * 2, true)).toBe(16384);
  });
});
