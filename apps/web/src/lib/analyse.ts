import { analyzeAttempt, type AttemptAnalysis, type ReferenceAnnotation } from "@ogbifo/speech";

/** Score a reading in a Web Worker, falling back to the main thread if workers are unavailable. */
export function analyseOffThread(samples: Float32Array, reference: ReferenceAnnotation): Promise<AttemptAnalysis> {
  if (typeof Worker === "undefined") return Promise.resolve(analyzeAttempt(samples, reference));
  return new Promise((resolve, reject) => {
    let worker: Worker;
    try {
      worker = new Worker(new URL("./analysis.worker.ts", import.meta.url), { type: "module" });
    } catch {
      resolve(analyzeAttempt(samples, reference));
      return;
    }
    worker.onmessage = (event: MessageEvent<AttemptAnalysis>) => {
      worker.terminate();
      resolve(event.data);
    };
    worker.onerror = (event) => {
      worker.terminate();
      reject(new Error(event.message));
    };
    worker.postMessage({ samples, reference }, [samples.buffer]);
  });
}
