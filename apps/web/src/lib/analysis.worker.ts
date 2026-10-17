import { analyzeAttempt, type AttemptAnalysis, type ReferenceAnnotation } from "@ogbifo/speech";

/** Runs the scoring off the main thread so the page stays responsive on a phone. */
interface AnalysisRequest {
  samples: Float32Array;
  reference: ReferenceAnnotation;
}

const scope = self as unknown as {
  onmessage: ((event: MessageEvent<AnalysisRequest>) => void) | null;
  postMessage(message: AttemptAnalysis): void;
};

scope.onmessage = (event) => {
  scope.postMessage(analyzeAttempt(event.data.samples, event.data.reference));
};
