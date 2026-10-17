# Tone Lexicon and Tone Game — PROPOSAL

**Status: proposed, not decided, nothing built.** Raised by the owner. Decisions needed are in section 9. Conflicts with existing decisions are in `OPEN_CONFLICTS.md` #23.

## 1. Goal

Give Ogbifọ a dependable knowledge of Yorùbá tone: for any word, which tone marks it carries, and for any spoken syllable, which tone it was, **whatever the speaker's pitch**. Get there through a game that rewards volume of **accepted** contributions, without ever letting an unverified answer into the data.

## 2. What "tonal intelligence" means here

Two parts, neither a black box:

1. **A tone lexicon.** Word forms with their tone-marked spellings, an English gloss, a dialect label and a review status. It is data, reviewed by people. It also closes a known gap: the current score does not check words (`OPEN_CONFLICTS.md` #18). Typed answers can be checked against it.
2. **A speaker-normalised tone classifier.** Tone is relative. Express each syllable's pitch in semitones against that speaker's own median and range (the scoring core already compares intervals and rescales range, D-037), then classify High, Mid or Low. Thresholds are set from teacher-labelled calibration recordings, which are already consented (`OPEN_CONFLICTS.md` #17.2). Pass bar to define: accuracy on low and high voices alike.

Training a statistical model on crowd audio is not proposed. It is not needed for either part and it collides with consent (section 7).

## 3. Two tiers, so learners cannot pollute the data

- **Learner tier (everyone, including the diaspora heritage learner of D-011).** Plays the games, gets feedback, earns progress. Answers stay on the device and in the learner's own progress. They never enter the lexicon.
- **Contributor tier (qualified speakers only).** Their answers can count towards the lexicon.

Native-speaker status cannot be proved, only made likely. A speaker qualifies by **all** of:
1. being vouched for by a named reviewer;
2. passing a qualification of 20 items from the reviewed lexicon at 90% or better (proposed number);
3. staying accurate: about one item in ten is a hidden known answer, and falling below 85% over the last 40 pauses their contributions until a reviewer looks.

## 4. When an answer becomes data

Same two labels as everywhere else (D-021):
- **Peer confirmed:** at least 3 different qualified contributors gave the same tone-marked form (compared after NFC; the original text is stored as typed), within the same dialect label, and none of the qualified contributors disagreed.
- **Reviewed:** a named reviewer (the teacher) approved it. Only Reviewed entries may inform scoring or checks that learners see.

Never labelled gold, certified or authoritative.

**Disagreement is not an error.** Yorùbá varies by dialect. "The common tone becomes the standard" must not erase a regional form: entries carry a dialect label, and the Standard Yorùbá layer is one labelled layer among them (D-013; principle 2, preserve linguistic identity).

**Ambiguity.** Many words differ only in tone and meaning. Show each item with an English gloss and a short context sentence, never a bare word, or contributors will be marking different words.

## 5. The games

1. **Tone-mark it (text).** Given a word or phrase without tone marks, plus its gloss, type or tap the marks. Needs no audio and no microphone. The first game to build.
2. **Say the tone (voice).** Given a word with its tone marks, say it. The app compares the speaker-normalised contour with the lexicon entry and the reference, on the device, as the Reading Room does now. Audio is not uploaded (D-019). It is a learner game first; it adds nothing to the lexicon.
3. **Check a word (contributors).** See someone's answer and confirm or dispute it. This is where agreement comes from. Needs the abuse controls in `OPEN_CONFLICTS.md` #4.

## 6. Reward and leaderboard

- The count that matters is **accepted** answers (Peer confirmed or Reviewed), not attempts. A revoked entry removes its points.
- Volume still matters, so a contributor sees their accepted total, their agreement rate and a daily cap. The cap blunts speed-spamming and burnout.
- Ranks (Listener, Reader, Interpreter, Keeper, Ogbifọ) can follow accepted counts and agreement.
- A leaderboard, if any: opt-in display name, weekly, accepted counts only, not in the beta. **It conflicts with MVP_SCOPE "Not MVP: leaderboards".** The owner's request is the newer statement, so it is flagged for a decision, not silently built.

## 7. Consent and law (counsel)

- The licence in D-020 covers displaying, preserving and community verification. Using answers to **train or tune the app's intelligence** is another use and needs new, explicit consent and a decision recorded here (D-005).
- Tone-marked text answers are low risk (no audio). Audio is high risk. The draft reference-voice licence promises **no model training and no voice cloning**; crowd audio for training would contradict it. Proposal: no audio from the games is stored or uploaded.
- Each contributor is identifiable (accounts, D-039). Withdrawal needs a defined effect on entries already confirmed.

## 8. Sequencing

1. **Seed the lexicon** with the teacher and the owner: a few hundred common words, tone-marked, glossed, dialect-labelled, two reviewers each. This is the known-good set for qualification.
2. **Tone-mark it, learner tier only.** Learners practise against the lexicon. No data collected, so no consent problem and a real learning benefit.
3. **Qualification and contributor tier**, once server storage, consent wording and counsel are done.
4. **Say the tone**, after calibration shows tone classification works across voices.
5. **Check a word and the leaderboard**, after abuse controls (#4).

## 9. Decisions needed

1. Text answers only (recommended), or also audio?
2. Is a leaderboard in scope, and when? (overrides "Not MVP")
3. How is a native speaker qualified: vouching plus test plus ongoing checks (recommended), or something simpler?
4. Entries per dialect (recommended), or one standard only?
5. May contributor answers ever tune the app's tone intelligence? If yes, that is new consent and counsel.
