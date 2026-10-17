# Ogbifọ — Audio & Speech

## Goal

Allow users to speak/read language naturally and receive useful interpretation and performance feedback.

## Recording

> Built (`SCORING_SPEC.md` section 15). The `ready` state is not used; echo cancellation and noise suppression are off.

Browser capabilities: MediaRecorder, Web Audio API. Request microphone permission only when necessary.

Recording states: `idle`, `requesting_permission`, `ready`, `recording`, `processing`, `complete`, `error`.

## Speech pipeline

```
Audio → Speech detection → Language detection → Transcription
      → Alignment → Interpretation → Metrics → Resonance Score
```

## Metrics

MVP: Clarity, Rhythm, Boldness.

Overall = (clarity + rhythm + boldness) / 3. The current prototype models the overall score as the average of the three.

> Superseded by `PRODUCT_DECISIONS.md` D-014: scoring compares pitch contour and timing to a native reference recording. Metric definitions: `SCORING_SPEC.md` (approved). The pipeline above lists ASR stages that are not used for scoring.

## Important product constraint

Scores are guidance. Do not claim: *"Your pronunciation is objectively correct."* Prefer: *"Your reading shows strong rhythm."*

## Audio privacy

> Decided (`PRODUCT_DECISIONS.md` D-019): learner audio is analysed on-device and not uploaded by default.

Recordings should not be retained indefinitely by default. Storage/retention policy must be explicit.

Users must be able to understand whether audio is: processed locally, uploaded, stored, used for improvement, deleted.
