"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import {
  initialRecorder,
  MAX_RECORDING_MS,
  recorderReducer,
  resampleTo16k,
  type AttemptAnalysis,
  type RecorderErrorKind,
  type ReferenceAnnotation,
} from "@ogbifo/speech";
import { analyseOffThread } from "@/lib/analyse";

const annotationCache = new Map<string, ReferenceAnnotation>();

async function loadAnnotation(cardId: string): Promise<ReferenceAnnotation> {
  const cached = annotationCache.get(cardId);
  if (cached) return cached;
  const response = await fetch(`/api/references/${encodeURIComponent(cardId)}`);
  if (!response.ok) throw new Error("reference unavailable");
  const annotation = (await response.json()) as ReferenceAnnotation;
  annotationCache.set(cardId, annotation);
  return annotation;
}

export interface FinishedAttempt {
  result: AttemptAnalysis;
  annotation: ReferenceAnnotation;
  startedAt: string;
}

/**
 * Microphone capture and analysis. The microphone is requested only when
 * `start` is called. Audio lives in memory for the length of the recording and
 * the analysis, then is dropped. It is never stored or uploaded (D-019).
 */
export function useRecorder(cardId: string, onFinished: (attempt: FinishedAttempt) => void) {
  const [state, dispatch] = useReducer(recorderReducer, initialRecorder);
  const [elapsedMs, setElapsedMs] = useState(0);
  const finishedRef = useRef(onFinished);
  useEffect(() => {
    finishedRef.current = onFinished;
  }, [onFinished]);

  const stream = useRef<MediaStream | null>(null);
  const context = useRef<AudioContext | null>(null);
  const chunks = useRef<Float32Array[]>([]);
  const timers = useRef<{ stop?: ReturnType<typeof setTimeout>; tick?: ReturnType<typeof setInterval> }>({});
  const startedAt = useRef("");
  const cancelled = useRef(false);

  const release = useCallback(() => {
    clearTimeout(timers.current.stop);
    clearInterval(timers.current.tick);
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
    const ctx = context.current;
    context.current = null;
    if (ctx && ctx.state !== "closed") void ctx.close();
  }, []);

  useEffect(
    () => () => {
      cancelled.current = true;
      release();
      chunks.current = [];
    },
    [release],
  );

  const stop = useCallback(async () => {
    const rate = context.current?.sampleRate ?? 48000;
    release();
    dispatch({ type: "stop" });
    const blocks = chunks.current;
    chunks.current = [];
    const length = blocks.reduce((total, block) => total + block.length, 0);
    const joined = new Float32Array(length);
    let offset = 0;
    for (const block of blocks) {
      joined.set(block, offset);
      offset += block.length;
    }
    try {
      const samples = resampleTo16k(joined, rate);
      const annotation = await loadAnnotation(cardId).catch(() => null);
      if (!annotation) {
        if (!cancelled.current) dispatch({ type: "failed", kind: "reference_unavailable" });
        return;
      }
      const result = await analyseOffThread(samples, annotation);
      if (cancelled.current) return;
      dispatch({ type: "analysed", result });
      finishedRef.current({ result, annotation, startedAt: startedAt.current });
    } catch {
      if (!cancelled.current) dispatch({ type: "failed", kind: "analysis_failed" });
    }
  }, [cardId, release]);

  const start = useCallback(async () => {
    const supported =
      typeof navigator !== "undefined" &&
      !!navigator.mediaDevices?.getUserMedia &&
      typeof AudioContext !== "undefined" &&
      typeof AudioWorkletNode !== "undefined";
    dispatch({ type: "press" });
    if (!supported) {
      dispatch({ type: "denied", kind: "unsupported" });
      return;
    }
    let media: MediaStream;
    try {
      // Echo cancellation and noise suppression can bend pitch, so they stay off.
      media = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: true, channelCount: 1 },
      });
    } catch (error) {
      const name = error instanceof DOMException ? error.name : "";
      const kind: RecorderErrorKind =
        name === "NotAllowedError" || name === "SecurityError"
          ? "permission_denied"
          : name === "NotFoundError" || name === "OverconstrainedError"
            ? "no_microphone"
            : "capture_failed";
      dispatch({ type: "denied", kind });
      return;
    }
    try {
      const ctx = new AudioContext();
      await ctx.audioWorklet.addModule("/recorder-worklet.js");
      const source = ctx.createMediaStreamSource(media);
      const node = new AudioWorkletNode(ctx, "ogbifo-recorder");
      const silent = ctx.createGain();
      silent.gain.value = 0;
      chunks.current = [];
      node.port.onmessage = (event: MessageEvent<Float32Array>) => {
        chunks.current.push(event.data);
      };
      source.connect(node);
      node.connect(silent).connect(ctx.destination);
      stream.current = media;
      context.current = ctx;
      cancelled.current = false;
      startedAt.current = new Date().toISOString();
      setElapsedMs(0);
      dispatch({ type: "granted" });
      const began = performance.now();
      timers.current.tick = setInterval(() => setElapsedMs(performance.now() - began), 200);
      timers.current.stop = setTimeout(() => void stop(), MAX_RECORDING_MS);
    } catch {
      media.getTracks().forEach((track) => track.stop());
      dispatch({ type: "denied", kind: "capture_failed" });
    }
  }, [stop]);

  const reset = useCallback(() => {
    release();
    chunks.current = [];
    dispatch({ type: "reset" });
  }, [release]);

  return { state, elapsedMs, start, stop, reset };
}
