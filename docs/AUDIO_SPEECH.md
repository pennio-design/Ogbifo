# Ogbifọ — Audio & Speech

## Goal

Allow users to speak/read language naturally and receive useful interpretation and performance feedback.

## Recording

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

> Per-metric computation is undefined. See `OPEN_CONFLICTS.md` #7.

## Important product constraint

Scores are guidance. Do not claim: *"Your pronunciation is objectively correct."* Prefer: *"Your reading shows strong rhythm."*

## Audio privacy

Recordings should not be retained indefinitely by default. Storage/retention policy must be explicit.

Users must be able to understand whether audio is: processed locally, uploaded, stored, used for improvement, deleted.
