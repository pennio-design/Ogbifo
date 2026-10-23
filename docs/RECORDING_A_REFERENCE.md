# Recording a reference voice

For the owner, a second speaker (for a different pitch range), and anyone helping. This replaces the synthetic development voice, which will always sound robotic: it is a plumbing test, not Yorùbá. A real voice is the fix.

## Before anything is recorded

1. The speaker signs the **Reference Voice Licence** (`docs/legal/REFERENCE_VOICE_LICENCE_DRAFT.md`, once Iniabasi has approved the wording). For private testing on your own machine you may record first and sign before anything is shared or published.
2. Agree the text: the Card's written form, tone marks and all. If the speaker would say it contracted, record the full form first (the contracted form needs its own recording and annotation: `OPEN_CONFLICTS.md` #25 and #27).
3. Never commit recordings to this repository. It is public. `.gitignore` excludes them.

## Record

- A quiet room, soft furnishings, no fan or traffic. Phone held a hand's width from the mouth, a little to the side.
- Any phone voice recorder works. Save as **m4a, mp3, wav or ogg**. Do not use speakerphone or a video call.
- Say the phrase the way you would say it to a friend, **at your own natural pace**. Not slowly, not like a robot. Leave a second of silence before and after.
- Record three takes. Keep the one that sounds most like you.

## Annotate and place it

1. Start the app with the reviewer tool on: `OGBIFO_ENABLE_REVIEWER_TOOLS=1 npm run dev -w @ogbifo/web` (in a Codespace, set the variable in the terminal first).
2. Open `/reviewer/annotate`. Choose the Card, then the recording. The tool proposes syllable boundaries. Drag them to the real syllable edges (or use the table). A second person should confirm them.
3. Fill in the provenance: source, licence `recorded_for_ogbifo`, rights holder (the speaker's full name), tick that the speaker agreed in writing, the date.
4. Download the two files. Put the `.json` in `apps/web/content/references/` and the audio in `apps/web/public/references/`. Restart the app.
5. Open the Card. **Hear the reference** should play the real voice. Read the Card yourself and check that the result makes sense.

## What to check afterwards

- The reference sounds like a person, and the last sound is not clipped.
- A natural reading by someone else is not rejected because it differs from this voice. If it is, that is a scoring problem (`OPEN_CONFLICTS.md` #26), not a recording problem.
- Record a second voice, lower or higher, on the same Cards.
