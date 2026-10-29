"use client";

import { useEffect, useRef, useState } from "react";
import {
  completeReadingSession,
  createReadingSession,
  type ReadingMode,
  type ReadingSession,
  type ReferenceLicence,
} from "@ogbifo/domain";
import {
  buildOverlay,
  MARKER_LABELS,
  NOT_WORDS_NOTE,
  RECORDER_ERROR_MESSAGES,
  recorderAnnouncement,
  scoreSentence,
  stepSummary,
  testerDetails,
  type AttemptScored,
  type ReferenceAnnotation,
  type Tone,
} from "@ogbifo/speech";
import { LanguageText } from "@ogbifo/ui";
import { showResonanceNumber } from "@/lib/config";
import { ContourChart, markerSymbol } from "./contour-chart";
import { useRecorder, type FinishedAttempt } from "./use-recorder";

export interface ClientReference {
  audioUrl: string;
  licence: ReferenceLicence;
  /** Shown wherever the audio plays; required for CC BY. */
  attribution: string | null;
  source: string;
}

const button = "inline-flex min-h-12 items-center justify-center px-6 font-ui text-sm disabled:opacity-40";
const primary = `${button} bg-ochre font-semibold text-clay hover:brightness-110`;
const secondary = `${button} border border-bone/20 text-bone hover:border-ochre`;
const TONE_NAMES: Record<Tone, string> = { H: "High", M: "Mid", L: "Low" };

function clock(ms: number) {
  const total = Math.floor(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}

export interface SayItAloudProps {
  cardId: string;
  languageCode: string;
  reference: ClientReference | null;
  mode: ReadingMode;
  /** The Card already has a completed Live attempt. Live is one scored attempt per Card (D-024). */
  liveFinished: boolean;
  onLiveAttempt: (session: ReadingSession) => void;
}

export function SayItAloud({ cardId, languageCode, reference, mode, liveFinished, onLiveAttempt }: SayItAloudProps) {
  const [attempt, setAttempt] = useState<(FinishedAttempt & { mode: ReadingMode }) | null>(null);
  const modeAtPress = useRef<ReadingMode>(mode);
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [slow, setSlow] = useState(false);

  const recorder = useRecorder(cardId, (finished) => {
    setAttempt({ ...finished, mode: modeAtPress.current });
    // A Live attempt finishes the Card when the recording was clear enough to analyse (D-036).
    if (finished.result.status === "scored" && modeAtPress.current === "live") {
      const started = createReadingSession({ id: crypto.randomUUID(), cardId, mode: "live", startedAt: finished.startedAt });
      if (!started.ok) return;
      const done = completeReadingSession(started.value, new Date().toISOString(), finished.result.overall);
      if (done.ok) onLiveAttempt(done.value);
    }
  });
  const { state } = recorder;

  useEffect(() => {
    const element = audio.current;
    if (!element) return;
    element.playbackRate = slow ? 0.7 : 1;
    element.preservesPitch = true;
  }, [slow]);

  // The microphone must not hear the reference.
  useEffect(() => {
    if (state.status === "requesting_permission" || state.status === "recording") audio.current?.pause();
  }, [state.status]);

  const press = () => {
    modeAtPress.current = mode;
    setAttempt(null);
    void recorder.start();
  };

  const liveLocked = mode === "live" && liveFinished;
  const busy = state.status === "requesting_permission" || state.status === "recording" || state.status === "processing";

  if (!reference) {
    return (
      <section aria-label="Say it aloud" className="mt-6 border border-bone/10 p-6">
        <h2 className="font-ui text-xs uppercase tracking-[0.2em] text-ash">Say it aloud</h2>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <button type="button" disabled aria-disabled="true" className={secondary}>Record</button>
          <p className="max-w-prose font-body text-sm text-ash">
            A native reference for this Card hasn&rsquo;t been recorded yet. Recording opens when it is.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section aria-label="Say it aloud" className="mt-6 border border-bone/10 p-6">
      <h2 className="font-ui text-xs uppercase tracking-[0.2em] text-ash">Say it aloud</h2>
      <p className="sr-only" aria-live="polite">{recorderAnnouncement(state)}</p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <audio
          ref={audio}
          src={reference.audioUrl}
          preload="none"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => setPlaying(false)}
        />
        <button
          type="button"
          className={secondary}
          disabled={busy}
          onClick={() => {
            const element = audio.current;
            if (!element) return;
            if (element.paused) {
              element.playbackRate = slow ? 0.7 : 1;
              element.preservesPitch = true;
              void element.play();
            } else {
              element.pause();
            }
          }}
        >
          {playing ? "Pause the reference" : "Hear the reference"}
        </button>
        <button type="button" className={secondary} aria-pressed={slow} onClick={() => setSlow((v) => !v)}>
          Slow
        </button>
        <p className="font-body text-xs text-ash">
          Reference: {reference.attribution ?? reference.source}
        </p>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-4">
        {state.status === "recording" ? (
          <>
            <button type="button" className={primary} onClick={() => void recorder.stop()}>Stop</button>
            <p className="font-ui text-sm text-bone">
              <span aria-hidden="true" className="mr-2 inline-block h-2 w-2 rounded-full bg-ochre align-middle" />
              Recording {clock(recorder.elapsedMs)}
            </p>
            <button type="button" className={secondary} onClick={recorder.reset}>Cancel</button>
          </>
        ) : state.status === "requesting_permission" ? (
          <button type="button" className={secondary} disabled>Waiting for the microphone…</button>
        ) : state.status === "processing" ? (
          <p role="status" className="font-ui text-sm text-bone">Listening back to your reading…</p>
        ) : liveLocked && state.status === "idle" ? (
          <button type="button" className={secondary} disabled aria-disabled="true">Record</button>
        ) : liveLocked ? null : (
          <button type="button" className={primary} onClick={press}>
            {state.status === "idle" ? "Record" : "Try again"}
          </button>
        )}
        {state.status === "idle" || liveLocked ? (
          <p className="max-w-prose font-body text-sm text-ash">
            {liveLocked
              ? "You have finished this Card in Live. Switch to Studio to keep practising."
              : mode === "studio"
                ? "Studio is practice: nothing is scored or saved."
                : "Live is one scored attempt, and it finishes this Card. Your recording stays on this device."}
          </p>
        ) : null}
      </div>

      {state.status === "error" && state.errorKind ? (
        <p role="alert" className="mt-4 max-w-prose font-body text-sm text-bone">{RECORDER_ERROR_MESSAGES[state.errorKind]}</p>
      ) : null}

      {state.status === "complete" && attempt ? (
        attempt.result.status === "refused" ? (
          <p role="alert" className="mt-4 max-w-prose font-body text-sm text-bone">{attempt.result.message}</p>
        ) : (
          <AttemptResult result={attempt.result} annotation={attempt.annotation} mode={attempt.mode} languageCode={languageCode} />
        )
      ) : null}
    </section>
  );
}

/** Development builds (and NEXT_PUBLIC_TESTER_DETAILS=1) show the numbers behind a result, for testers. */
const SHOW_TESTER_DETAILS = process.env.NODE_ENV !== "production" || process.env.NEXT_PUBLIC_TESTER_DETAILS === "1";

function TesterDetails({ text }: { text: string }) {
  return (
    <details className="mt-6 border border-bone/10 p-3">
      <summary className="cursor-pointer font-ui text-sm text-ash">Numbers behind this result (for testers)</summary>
      <pre className="mt-3 overflow-x-auto whitespace-pre font-mono text-xs leading-relaxed text-bone" data-testid="tester-details">{text}</pre>
      <button
        type="button"
        className="mt-3 inline-flex min-h-12 items-center border border-bone/20 px-4 font-ui text-sm hover:border-ochre"
        onClick={() => void navigator.clipboard?.writeText(text)}
      >
        Copy the numbers
      </button>
    </details>
  );
}

function AttemptResult({
  result,
  annotation,
  mode,
  languageCode,
}: {
  result: AttemptScored;
  annotation: ReferenceAnnotation;
  mode: ReadingMode;
  languageCode: string;
}) {
  const overlay = buildOverlay(result, annotation);
  const steps = stepSummary(result.syllables.map((s) => s.marker));
  // D-036 and D-024: a number only in Live, and only once calibration has passed.
  const showNumber = showResonanceNumber && mode === "live";

  return (
    <div className="mt-6 border-t border-bone/10 pt-6" data-testid="attempt-result">
      <h3 className="font-serif text-2xl font-semibold">
        {mode === "live" ? "Your Live reading" : "Your practice reading"}
      </h3>
      {showNumber ? (
        <div className="mt-4">
          <p className="font-ui text-xs uppercase tracking-[0.2em] text-ash">Resonance Score</p>
          <p className="font-serif text-5xl font-semibold" data-testid="resonance-number">{result.overall}</p>
          <p className="mt-2 font-body text-bone">{scoreSentence(result.overall)}</p>
          <p className="mt-1 font-ui text-sm text-ash">Tone {result.tone} · Rhythm {result.rhythm}</p>
        </div>
      ) : null}
      <p className="mt-4 font-body text-lg text-bone">{steps.sentence}</p>
      <div className="mt-6">
        <ContourChart overlay={overlay} />
      </div>
      <ol className="mt-4 flex flex-wrap gap-2" aria-label="Each syllable and whether its pitch step went the way the tone marks call for">
        {result.syllables.map((s) => (
          <li key={s.index} className="border border-bone/10 px-3 py-2 font-ui text-sm">
            <LanguageText lang={languageCode} text={s.text} className="text-lg" />
            <span className="ml-2 text-ash">{TONE_NAMES[s.tone]}</span>
            <span className="block text-bone">
              <span aria-hidden="true" className="mr-1">{markerSymbol[s.marker]}</span>
              {MARKER_LABELS[s.marker]}
            </span>
          </li>
        ))}
      </ol>
      <p className="mt-6 max-w-prose font-body text-sm text-ash">{NOT_WORDS_NOTE}</p>
      {SHOW_TESTER_DETAILS ? <TesterDetails text={testerDetails(result)} /> : null}
      {mode === "live" ? (
        <p className="mt-2 font-ui text-sm text-bone">This Card is now finished in Live.</p>
      ) : (
        <p className="mt-2 font-ui text-sm text-ash">Practice in Studio is not scored or saved.</p>
      )}
    </div>
  );
}
