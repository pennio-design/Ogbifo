# Ogbifọ — Resonance Score Specification

**Status: APPROVED (D-031, D-036). Nothing open blocks Sprint 3.** Nothing here is built. It replaces the Clarity, Rhythm and Boldness metrics in `AUDIO_SPEECH.md` and `DATA_MODEL.md`, and fixes Sprint 3's scope.

Governed by: D-014 (pitch contour against a native reference), D-019 (on-device, audio not uploaded), D-024 (Studio unscored, Live scored), D-028 (no audio or pitch data to analytics).

---

## 1. What the score is for

Yorùbá is a tonal language: pitch separates words. The score tells a learner whether the **pitch pattern and timing** of their reading follows a native reference. It is guidance. It never says a reading is correct, wrong or authentic, and it never judges accent, dialect or voice.

Principles:

1. **Deterministic.** Same audio and same reference give the same score. No machine-learning model and no ASR in the scoring path.
2. **Register-independent.** A low voice and a high voice reading the same tones score the same.
3. **Explainable.** Every number can be shown as a contour or a per-syllable marker. If we cannot explain it, we do not show it.
4. **Refuses to guess.** Poor audio or a failed alignment produces "we couldn't follow that, try again", never a low score.
5. **Private.** Audio stays in memory on the device and is freed after analysis (D-019).

## 2. Inputs

| Input | Source |
|---|---|
| Card text | Reviewed, fully tone-marked (D-015) |
| Syllable list with tones | Proposed by the syllabifier (§3), confirmed by reviewers |
| Reference recording | Reviewer-recorded, one per Card (and a slow one, §9) |
| Reference annotation | Syllable boundaries in ms plus the reference pitch contour, stored with the Card (§8) |
| Learner recording | Browser microphone, 16 kHz mono after downsampling |

## 3. Syllables and tones from text

Yorùbá syllables are V, CV, or a syllabic nasal (N). Rules, applied to NFC text:

1. Every **vowel** (`a e ẹ i o ọ u`) is a syllable nucleus. Adjacent vowels are separate syllables (`jẹun` is `jẹ` + `un`).
2. A **consonant** attaches to the vowel after it as its onset. `gb` and `kp` are single consonants.
3. **`n` after a vowel**, when not followed by a vowel, marks a nasal vowel and stays in that syllable (`dàn`, `un`). `n` before a vowel is the onset of the next syllable.
4. A **syllabic nasal** (`m`, `n`, with or without a tone mark) not adjacent to a vowel in that way is its own syllable (`ń lọ`).
5. **Tone** per syllable: acute is High, grave is Low, no mark is Mid. A macron is an explicit Mid.

Test vectors (become Sprint 3 unit tests):

| Text | Syllables and tone |
|---|---|
| `Ẹ káàárọ̀` | Ẹ·M ká·H à·L á·H rọ̀·L |
| `ọmọ` | ọ·M mọ·M |
| `ìbàdàn` | ì·L bà·L dàn·L |
| `ń lọ` | ń·H lọ·M |
| `jẹun` | jẹ·M un·M |
| `ogbó` | o·M gbó·H |
| `kò gbọdọ̀` | kò·L gbọ·M dọ̀·L |
| `ojúkòkòrò` | o·M jú·H kò·L kò·L rò·L |
| `dára` | dá·H ra·M |

**Limits, to confirm with a Yorùbá linguist before build:** these are citation tones. Real speech has downstep, tone spreading and elision at word boundaries, and the syllabifier will not know them. That is why reviewers confirm every Card's syllables and why the reference, not the text, is the target.

## 4. Pitch tracking (on-device)

- **Algorithm:** YIN (de Cheveigné and Kawahara, 2002). Deterministic, no model, small enough for an AudioWorklet or Web Worker.
- **Frames:** 40 ms window, 10 ms hop, search range 70 to 450 Hz, aperiodicity threshold 0.15.
- **Voiced frame:** aperiodicity at or under threshold **and** frame energy above a noise floor estimated from the quietest 10 percent of frames.
- **Clean-up:** 5-frame median filter, then reject frames that jump more than 6 semitones in 10 ms (octave errors).
- **Units:** convert Hz to semitones relative to the speaker's own median voiced F0 in that recording. Tone is relative, so this removes voice height. Men, women and children are compared on the same footing.
- The reference contour is computed with the same algorithm and a stored `pitchAlgorithmVersion`. A version change recomputes references; old attempts are not re-scored (D-019).

## 5. Aligning the learner to the reference

No ASR. Use **dynamic time warping** between learner and reference on 13 MFCCs with cepstral mean normalisation (10 ms hop), then carry the reference's reviewer-marked syllable boundaries across the warping path to get learner syllable boundaries.

Refuse to score (§7) when: the path cost exceeds a calibrated limit, learner duration is outside 0.5x to 2x of the reference, or fewer than 60 percent of syllables contain enough voiced frames (at least 3).

## 6. Metrics

Per syllable, take the **median semitone value of voiced frames in its middle 60 percent**, for learner and reference.

**Tone (0 to 100).** For each pair of consecutive syllables, compute the pitch interval in semitones for learner and reference. Error is the absolute difference. Credit is 1 at 1.5 semitones or less, 0 at 4 or more, linear between. Tone is the mean credit times 100. Comparing intervals, not heights, makes it independent of register and key.

**Rhythm (0 to 100).** Normalise each syllable duration by the whole utterance's duration for learner and reference (this removes overall speed). For each syllable, take the absolute log ratio of learner to reference share. Credit is 1 at 0.15 or less, 0 at 0.7 or more (about 2x), linear between. Rhythm is the mean credit times 100. Overall pace is shown separately as information and is never scored.

**Resonance Score** is `round(0.7 x Tone + 0.3 x Rhythm)`, an integer from 0 to 100. Tone is weighted higher because tone changes meaning and rhythm does not. **Clarity and Boldness are dropped:** they have no measurable definition for a tonal language.

All thresholds and weights above are **initial values to be calibrated** (§10), not validated facts.

Stored per attempt: `overall`, `tone`, `rhythm`, `coverage` (share of syllables measured), per-syllable markers, the normalised learner contour, `algorithmVersion`.

## 7. What the learner sees

- The reference and the learner's normalised contours, overlaid and aligned, with the syllables underneath.
- A marker per syllable: "close", "higher" or "lower" than the reference, with the interval in plain words.
- The Resonance Score, with a sentence chosen by band:

| Score | Sentence |
|---|---|
| 80 to 100 | Your reading followed the tones closely. |
| 60 to 79 | Your reading followed most of the tones. |
| 40 to 59 | Some tones differed from the reference. Listen again and try the marked syllables. |
| 0 to 39 | The tones differed from the reference. Listen again, then try once more. |

- **Banned words:** correct, incorrect, wrong, perfect, authentic, native-like, accent.
- **Not scored, with a plain message and no number:** mic denied, too quiet, clipping, too much background noise, too short or too long, alignment failed. Copy follows the UX rule: say what happened and what to do, never "error".

## 8. Reference recordings

- Recorded in a quiet room, WAV, 44.1 kHz or higher, 16-bit or higher, one Card per file, natural speed. Two voices across the beta (D-026).
- **Slow version** for Studio playback: use the browser's pitch-preserving `playbackRate`. No separate slow recording.
- **Annotation (D-033):** an in-app, reviewer-only tool built on wavesurfer.js regions: the reviewer clicks to place syllable boundaries on the waveform and confirms each syllable's text and tone. Audacity label files are also imported. Either way we compute and store the reference pitch contour on save. Build order: label import first (small), then the in-app tool.
- Stored on the Card: `referenceAudioUrl`, `referenceAnnotation` (syllables with text, tone, start and end ms, the contour, `pitchAlgorithmVersion`).
- Reviewers confirm both the audio and the syllable boundaries (D-012).

## 9. Performance and offline

- Analysis of a 10 s reading finishes in under 2 s on a mid-range Android phone, off the main thread. Target hardware: a Moto G-class device.
- Reference audio and annotation download with the Deck and work offline (D-017).
- No network call during scoring.

## 10. Calibration and acceptance (ship criteria)

The thresholds above are guesses until measured. Before the score ships to beta users:

1. **Calibration set:** at least 20 speakers (10 fluent, 10 learners), male and female, on at least 3 phone models and one laptop, in quiet and noisy rooms, reading at least 15 Cards each. Plus a deliberately **monotone** reading and a **wrong-tone** reading of the same Cards from the fluent speakers.
2. **Pass bars:**
   - Fluent readings: median Resonance Score at least 80, 10th percentile at least 65.
   - Monotone readings: median at most 40.
   - Separation between fluent and monotone readings: AUC at least 0.9.
   - Wrong-tone readings score lower than the same speaker's correct readings in at least 85 percent of pairs.
   - Scores for male and female fluent speakers differ by no more than 5 points at the median.
   - Not-scored rate for fluent readings in quiet rooms below 5 percent.
3. **Automated tests** (no real speech needed): synthetic harmonic signals 80 to 400 Hz recover F0 within 1 percent; octave errors under 2 percent; silence and noise yield no voiced frames; the same input yields the same output; the syllabifier passes the §3 vectors.
4. If a bar fails, thresholds are retuned and the set re-run. If it still fails, the number does not ship and Live shows contour and markers only (D-036). Until calibration passes the number is hidden behind `showResonanceNumber` (default off). A Live attempt is finished when its recording is clear enough to analyse, with or without a number.

## 11. Privacy

- Audio lives in memory and is freed after analysis unless the learner explicitly keeps it (D-019).
- Saved with progress: scores, per-syllable markers and the normalised contour. **Not saved:** audio.
- Analytics (D-028): never audio or pitch data. Decided (D-035): analytics carries only that an attempt completed, never the score.

## 12. Decisions

Resolved: 1 metrics approved (D-031); 2 and 4 reviewers, linguists and calibration speakers come from the volunteer call, so they are ship gates (D-032, `OPEN_CONFLICTS.md` #17); 3 annotation tool (D-033); 5 reference provenance (D-034); 6 analytics (D-035). 7 contour and markers with no number if calibration fails (D-036). Nothing is open.

Original list, for the record:

1. **Metric names and weights.** Tone and Rhythm, Overall at 70 percent Tone and 30 percent Rhythm, Clarity and Boldness dropped. Approve or change.
2. **Yorùbá linguist review** of §3 (syllabification and tone rules) before build. Who?
3. **Annotation by Audacity labels** for the beta, instead of a custom tool. Approve?
4. **Calibration set** (§10): who recruits the 20 speakers and pays them, and when?
5. **Reference voices:** who records them, and under what licence and fee (D-012, D-020)?
6. **Analytics:** confirm that attempt-completed events carry no score.
7. **If calibration fails:** are you willing to ship Live without a number (contour and markers only)?

## 13. Sprint 3 scope if approved

Microphone capture and permission flow; YIN pitch tracker; syllabifier; MFCC and DTW alignment; Tone, Rhythm and Resonance Score; contour and marker UI; Audacity label importer, then the in-app annotation tool (D-033); reference provenance fields (D-034); reference playback with slow mode; enabling Live to finish a Card (which makes the Proverb House unlock reachable); Live and Studio states per `UX_SPEC.md`; synthetic-signal and syllabifier tests. Calibration is a gate on shipping to beta users, not a code task.

---

## 14. Built in Sprint 3 part 1, and where testing changed this spec

Package `packages/speech` (`@ogbifo/speech`): no dependencies, pure TypeScript, 82 tests. Contains the syllabifier, YIN pitch tracker, 16 kHz resampler, MFCC, DTW, Tone, Rhythm, Resonance Score, reference annotation builder, and `analyzeAttempt`. Not yet wired to the microphone or any screen.

**Changes made after testing, each one visible in the code and the tests:**

1. **Alignment is pinned at both ends.** The first version left the end open, so the path ended early and shortened the last syllables: a different-voice reading scored Rhythm 63 at the correct tempo. Start and end are now pinned near the speech span found from energy. Same readings now score Rhythm 100.
2. **Pitch range is normalised, within bounds.** Without it, a reading with half or 1.5x the reference's pitch range dropped Tone to 70, and 2x dropped it to 15. The learner's steps are now rescaled to the reference's spread, clamped to 0.6 to 1.67 (`RANGE_SCALE_MIN`, `RANGE_SCALE_MAX` in `metrics.ts`; set both to 1 to switch off). A flat reading still scores low because the clamp stops it being stretched into a match. This changes section 6, which compared raw steps. Approved by the owner and kept (D-037).
3. **MFCCs use mean and variance normalisation**, not mean only (section 5).
4. **Energy gate.** The noise floor is the lower of the 10th percentile and 10 percent of the 95th percentile, so a recording with no silence does not gate out its own speech. The speech gate is 5 percent of the 95th percentile.
5. **Alignment cost limit is 6.** It only catches "could not follow". See the next point.

**What the score does not measure.** It measures **tone pattern and timing, not whether the right words were said** (a consequence of D-014: no speech recognition). In synthetic tests, a different phrase read with the same tones scored 100. Alignment cost cannot detect wrong words: wrong phrases cost 2.9 to 4.6, while legitimate very different voices cost up to 4.7. **The results screen must say so**: "This checks the tones and timing of your reading, not the words."

**Measured on synthetic speech** (known pitch and timing, deterministic; `packages/speech/test/synth.ts`):

| Reading | Tone | Rhythm | Overall |
|---|---|---|---|
| Same reading, new noise | 100 | 100 | 100 |
| Higher, lower, much higher, child-like voice | 100 | 100 | 100 |
| 0.75x and 1.3x speed | 100 | 95 to 100 | 98 to 100 |
| Pitch range 0.5x to 2x | 100 | 100 | 100 |
| Moderate noise | 100 | 95 | 99 |
| Two tones swapped | 25 | 100 | 48 |
| Monotone | 15 | 100 | 40 |
| Wrong timing, right tones | 100 | 28 | 78 |
| Heavy noise, silence, too quiet, clipped, too short, 3x slow | refused | | |

Fluent and monotone readings separate completely across five voices.

**Limits of this evidence, stated plainly.**

- Synthetic speech is clean, perfectly periodic and has no consonants. Real speech will be harder. **The calibration set (section 10) remains a ship gate**; nothing here replaces it.
- A monotone reading with perfect rhythm scores about 40. That sits on the edge of the "median at most 40" bar (section 10) because Rhythm earns 30 percent. Real monotone readers also vary in rhythm. Calibration will show whether the weights need to change.
- A child-like voice scored 100 but only aligns with a relaxed cost limit (cost 4.7). Reference voices should include a lower and a higher voice, and scoring should use the better alignment of the two. Not built.
- **Speed:** a 9 second recording analyses in 201 ms on a developer machine (134 ms of it pitch tracking). Phones are several times slower. The 2 second target in section 9 is unmeasured on a device.
- The syllabifier passes the section 3 vectors and the seed proverb. It has not been reviewed by a linguist (`OPEN_CONFLICTS.md` #17).

---

## 15. Built in Sprint 3 part 2: recording, results, and the reviewer tool

**What a learner can now do** (Reading Room, on any Card that has a reference): hear the reference at normal or slow speed (the browser's pitch-preserving rate), press Record, read, press Stop, and see the result. Studio shows the contour and markers, no number, nothing saved. Live is one attempt per Card; an attempt clear enough to analyse finishes the Card (D-036) and is saved with its score; a refused attempt does not finish it and can be retried. The number appears only in Live and only when `NEXT_PUBLIC_SHOW_RESONANCE_NUMBER=1` (D-036). The header score shows the average of this Deck's Live readings, again only while the number is on. The results screen always says: "This checks the tones and timing of your reading, not the words."

**How it works.**

- The microphone is requested only when Record is pressed (tested: it is not requested on page load). Echo cancellation and noise suppression are off because they can bend pitch; automatic gain is on. Recording stops by itself at 20 seconds.
- Audio is collected in memory by an audio worklet, resampled to 16 kHz, analysed in a Web Worker, then dropped. It is not stored or uploaded, and progress holds only scores and markers (tested).
- The reference annotation is fetched on demand from `/api/references/[cardId]`, so Card pages stay small.
- Recorder states are idle, requesting permission, recording, processing, complete and error. `ready` from `AUDIO_SPEECH.md` is not used.
- Results show the reference and learner contours on one time axis (the learner stretched onto the reference's syllables), one marker per syllable in words as well as symbols, and a plain sentence ("4 of 4 pitch steps were close to the reference"). No band sentence is shown without the number.

**Reviewer annotation tool** at `/reviewer/annotate` (D-033; 404 unless `OGBIFO_ENABLE_REVIEWER_TOOLS=1`, because there are no accounts): choose a Card, load a recording, and the tool proposes syllable boundaries from the speech span. Reviewers adjust them on a waveform (wavesurfer.js, BSD-3-Clause) or in a keyboard-accessible table, can import Audacity labels, must complete a provenance record (D-034), and download a JSON file and the renamed audio. The app validates the JSON with the same rules it uses at load. Files are placed by hand (`content/references/` and `public/references/`) until there is storage and accounts. An invalid file is skipped with a logged reason and never half-applied.

**Verified in a real browser** (`apps/web/e2e`, Chromium with a fake microphone playing synthetic readings): 25 checks on the recording flow and 22 on the annotation tool, run with the number on and off. They cover a matching reading, a monotone reading, silence (refused), a refused microphone, no microphone request on page load, Live finishing a Card and unlocking Proverb House, no audio in storage, Audacity import (good and bad files), provenance being required, and the downloaded file validating.

**Not verified, and what that means.**

- **No real speech, no real devices.** Everything ran on synthetic voices through a fake microphone. Phone microphones, room noise, and real accents are untested.
- **Chromium only.** Safari and Firefox are untested, and AudioWorklet and Web Worker behaviour differs between them.
- **Microphone settings** (echo cancellation and noise suppression off, gain on) are a reasoned choice and have not been compared on devices.
- **Speed on a phone** is still unmeasured.
- **The development reference is a synthetic tone sequence**, labelled as such, shown only in development, and barred from reviewed Cards by `synthetic_test`.
- **A screen reader has not been run over any of it.** The chart has a text alternative and every marker is in words, but that is design, not testing.
- **Reference audio does not yet work offline** (D-017): it streams from the server and is not cached.
