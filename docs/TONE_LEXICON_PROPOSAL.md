# Tone Lexicon and Tone Game — PROPOSAL

**Status: direction decided in D-042 and D-043; nothing built.** Remaining open items are in `OPEN_CONFLICTS.md` #23. **D-043 (dialect-aware lexicon) replaces D-042 item 4 (one standard); where this text says otherwise, D-043 wins.**

## 1. Goal

Give Ogbifọ a dependable knowledge of Yorùbá tone: for any word, which tone marks it carries, and for any spoken syllable, which tone it was, **whatever the speaker's pitch**. Get there through a game that rewards volume of **accepted** contributions, without ever letting an unverified answer into the data.

## 2. What "tonal intelligence" means here

Two parts, neither a black box:

1. **A tone lexicon.** Word forms with their tone-marked spellings, an English gloss, a dialect label and a review status. It is data, reviewed by people. It also closes a known gap: the current score does not check words (`OPEN_CONFLICTS.md` #18). Typed answers can be checked against it.
2. **A speaker-normalised tone classifier.** Tone is relative. Express each syllable's pitch in semitones against that speaker's own median and range (the scoring core already compares intervals and rescales range, D-037), then classify High, Mid or Low. Thresholds are set from teacher-labelled calibration recordings, which are already consented (`OPEN_CONFLICTS.md` #17.2). Pass bar to define: accuracy on low and high voices alike.

Training a statistical model on crowd audio is not proposed. It is not needed for either part and it collides with consent (section 7).

## 3. Two tiers, and a simple competence check

- **Learner tier (everyone, including the diaspora heritage learner of D-011).** Plays the games, gets feedback, earns progress. Answers stay on the device and in the learner's own progress. They never enter the lexicon.
- **Contributor tier (qualified speakers only).** Their answers can count towards the lexicon.

Being a native speaker cannot be proved, and the product does not need it: what matters is whether someone reliably knows the tones. So the check tests **competence**:

1. **Listening test.** 20 items drawn at random from the reviewed lexicon, only those a reviewer has marked as the same in every dialect (D-043), so a regional speaker is not failed for speaking their own dialect. Each plays a recorded word, and the person picks its correct tone-marked spelling from four. Pass at 18 of 20. Guessing gets that by luck about once in 600 million tries, so it cannot be gamed, and reading the answer does not help because it is the sound that is tested. A failed attempt can be retried after 24 hours with different items.
2. **Staying accurate.** About one item in ten is a hidden known answer. Falling below 85% over the last 40 pauses their contributions until a reviewer looks.
3. **For the first contributors only,** while the lexicon is small, a named reviewer also vouches for them.

A learner who has studied and passes is welcome: the data needs competence, and the leaderboard and ranks reward accepted answers, not birthplace.

## 4. When an answer becomes data

Same two labels as everywhere else (D-021):
- **Peer confirmed:** at least 3 different qualified contributors who declare the same dialect gave the same tone-marked form (compared after NFC; the original text is stored as typed), and none of them disagreed.
- **Reviewed:** a named reviewer who speaks that dialect approved it. Only Reviewed entries may inform scoring or checks that learners see.

Never labelled gold, certified or authoritative.

**Dialect-aware (D-043).** A tone is recorded the way it sounds in a named dialect, and read the way it sounds. Entries carry a dialect from a register curated by reviewers; Standard Yorùbá is one label among others. A difference between dialects is not an error. Dialect is self-declared and cannot be proved, so it is a label for grouping agreement, not a credential. Start with the dialects the owner and the teacher speak; reviewers are the limit per dialect.

**Ambiguity.** Many words differ only in tone and meaning. Show each item with an English gloss and a short context sentence, never a bare word, or contributors will be marking different words.

## 5. The games

1. **Tone-mark it (text).** Given a word or phrase without tone marks, plus its gloss, type or tap the marks. Needs no audio and no microphone. The first game to build.
2. **Say the tone (voice).** Given a word with its tone marks, say it. The app compares the speaker-normalised contour with the lexicon entry and the reference, on the device, as the Reading Room does now. By default audio is not uploaded (D-019). A contributor may separately opt in to let their recordings, and measurements from them, tune tone detection (D-042). Opt-in audio is the most sensitive data in the product: stored apart from account details, with a stated retention period, deletable on withdrawal.
3. **Check a word (contributors).** See someone's answer and confirm or dispute it. This is where agreement comes from. Needs the abuse controls in `OPEN_CONFLICTS.md` #4.

## 6. Reward and leaderboard

- The count that matters is **accepted** answers (Peer confirmed or Reviewed), not attempts. A revoked entry removes its points.
- Volume still matters, so a contributor sees their accepted total, their agreement rate and a daily cap. The cap blunts speed-spamming and burnout.
- Ranks (Listener, Reader, Interpreter, Keeper, Ogbifọ) can follow accepted counts and agreement.
- Leaderboard (D-042): after the contributor tier is live and abuse controls exist. Opt-in display name, weekly, accepted counts only. Personal progress and ranks come first; a board with a handful of people motivates nobody.

## 7. Consent and law (counsel)

- The licence in D-020 covers displaying, preserving and community verification. Using answers to **tune the app's tone detection** is another use. D-042 decides it is allowed **only through a separate opt-in**, plain language, unbundled from the terms, withdrawable. A clear terms page is required for the product but is not valid consent for voice on its own.
- Tone-marked text answers are low risk. Audio is high risk. The reference-voice licence now has a tick-box for tuning, and still forbids creating or imitating a voice.
- Each contributor is identifiable (accounts, D-039). Withdrawal needs a defined effect on entries already confirmed.

## 8. Sequencing

1. **Seed the lexicon** (the sheet workflow is built, see `apps/web/content/lexicon/README.md`) with the teacher and the owner: a few hundred common words, tone-marked, glossed, dialect-labelled, two reviewers each. This is the known-good set for qualification.
2. **Tone-mark it, learner tier only.** Learners practise against the lexicon. No data collected, so no consent problem and a real learning benefit.
3. **Qualification and contributor tier**, once server storage, consent wording and counsel are done.
4. **Say the tone**, after calibration shows tone classification works across voices.
5. **Check a word and the leaderboard**, after abuse controls (#4).

## 9. Decided (D-042)

Audio opt-in in scope. Leaderboard later. Competence test instead of proof of nativeness. One standard. Terms plus a separate opt-in for voice.

Still open: opt-in wording and retention (counsel), the pass marks (calibrate on real people), how a lexicon entry is revoked, and the abuse controls (#4).
