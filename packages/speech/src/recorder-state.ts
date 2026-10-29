import type { AttemptAnalysis } from "./analyze";

/**
 * Recording states (AUDIO_SPEECH.md). The microphone is requested only when the
 * learner presses Record. `ready` from the original list is not used: once
 * permission is granted, recording starts at once.
 */
export type RecorderStatus = "idle" | "requesting_permission" | "recording" | "processing" | "complete" | "error";

export type RecorderErrorKind =
  | "permission_denied"
  | "no_microphone"
  | "unsupported"
  | "capture_failed"
  | "analysis_failed"
  | "reference_unavailable";

export interface RecorderState {
  readonly status: RecorderStatus;
  readonly errorKind?: RecorderErrorKind;
  readonly result?: AttemptAnalysis;
}

export type RecorderAction =
  | { readonly type: "press" }
  | { readonly type: "granted" }
  | { readonly type: "denied"; readonly kind: RecorderErrorKind }
  | { readonly type: "stop" }
  | { readonly type: "analysed"; readonly result: AttemptAnalysis }
  | { readonly type: "failed"; readonly kind: RecorderErrorKind }
  | { readonly type: "reset" };

export const initialRecorder: RecorderState = { status: "idle" };

export function recorderReducer(state: RecorderState, action: RecorderAction): RecorderState {
  switch (action.type) {
    case "press":
      return state.status === "idle" || state.status === "complete" || state.status === "error"
        ? { status: "requesting_permission" }
        : state;
    case "granted":
      return state.status === "requesting_permission" ? { status: "recording" } : state;
    case "denied":
      return state.status === "requesting_permission" ? { status: "error", errorKind: action.kind } : state;
    case "stop":
      return state.status === "recording" ? { status: "processing" } : state;
    case "analysed":
      return state.status === "processing" ? { status: "complete", result: action.result } : state;
    case "failed":
      return state.status === "recording" || state.status === "processing"
        ? { status: "error", errorKind: action.kind }
        : state;
    case "reset":
      // Cancelling is allowed up to the moment analysis starts.
      return state.status === "processing" ? state : initialRecorder;
  }
}

/** Plain copy: what happened, what to do. Never "error". */
export const RECORDER_ERROR_MESSAGES: Record<RecorderErrorKind, string> = {
  permission_denied:
    "Microphone access is off. To record, allow the microphone for this site in your browser settings, then try again. Nothing was recorded.",
  no_microphone: "We couldn't find a microphone. Connect one, or check that another app isn't using it, then try again.",
  unsupported: "This browser can't record audio here. Try a recent version of Chrome, Safari or Firefox.",
  capture_failed: "The recording stopped unexpectedly. Please try again.",
  analysis_failed: "We couldn't analyse that recording on this device. Please try again.",
  reference_unavailable: "We couldn't load this Card's reference recording. Check your connection and try again.",
};

/** Text for a polite live region. */
export function recorderAnnouncement(state: RecorderState): string {
  switch (state.status) {
    case "idle":
      return "";
    case "requesting_permission":
      return "Waiting for microphone permission.";
    case "recording":
      return "Recording. Read the phrase now.";
    case "processing":
      return "Listening back to your reading.";
    case "complete":
      return state.result?.status === "refused" ? state.result.message : "Your reading has been analysed.";
    case "error":
      return state.errorKind ? RECORDER_ERROR_MESSAGES[state.errorKind] : "";
  }
}

/** Stop automatically after this long, so a forgotten recording cannot run on. */
/** A safety limit, not a pace: the learner stops when they are done (D-045). A Card is a phrase or proverb. */
export const MAX_RECORDING_MS = 60_000;
