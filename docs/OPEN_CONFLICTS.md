# Ogbifọ — Open Conflicts and Decisions

Per `CLAUDE.md`: when requirements conflict, flag the conflict rather than silently choosing. Nothing below has been resolved in the specs. Each item needs an owner decision before the dependent work starts.

Status key: **BLOCKING** (resolve before Sprint 1 scope is final), **BEFORE-PHASE-N** (resolve before that MVP phase), **MINOR**.

---

## 1. Which product is this? — BLOCKING

Four artifacts describe four different centers of gravity:

| Source | Product | Primary user | Money |
|---|---|---|---|
| `README.md`, `bench/`, `audit/` (in this repo) | Yorùbá tone-restoration + translation + verification for songs, reels, films | Rights holders, media | Cost per verified line; demand gate |
| `reference/ogbifo-architecture.md` | B2B pipeline: ASR → MT → human review → exports/search/API | Media teams, NGOs, researchers | Workspace/SaaS/API |
| Pitch deck ($500K pre-seed) | Storytelling **data engine** for African language AI | Model builders, institutions | Dataset services → SaaS → API/licensing |
| `docs/PRD.md` (this package) | Consumer reading/learning app with gamified progression and community archive | Learners, native speakers | Not defined |

The spec's Sprints 1–6 build the fourth. The repo's Week 1 test (the benchmark) exists to decide whether the first is viable. The package defines no revenue model, and its MVP exclusions (marketplace, enterprise, monetization) remove every revenue path the deck describes.

Relationship worth deciding explicitly: the consumer loop (Reading Room, contributions, peer verification) is plausibly the **supply side** of the data engine, not a separate business. If so, the PRD should say what data it produces, in what format, under what consent, and who buys it. Until that is written, building Sprints 1–3 is speculative.

## 2. Brand drift across artifacts — BEFORE-PHASE-1

`CLAUDE.md` bans excessive gradients and generic SaaS styling. Existing artifacts violate it:

- Pitch deck: Yeseva One / Instrument Serif, orange→gold→teal gradient headlines, glow orbs, custom cursor.
- Early prototype (`ogbifo-1.html`): terracotta palette, Syne / Space Mono, grain overlay.
- Motion bank: Inter, a plain circle mark rather than the Royal Seal.

Decision: the brand guidelines palette and type (Clay / Ochre / Bone; Fraunces / Space Grotesk / Plus Jakarta) are canonical. Others are to be retired, not ported. The pitch deck should be rebuilt on the brand system before it is shown again.

## 3. Royal Seal: one loop or two? — BEFORE-PHASE-1

The brand copy and this spec say "two intersecting ochre loops" (left = oral statecraft, right = foreign technical registers). The production SVG draws a **single** lens-shaped loop (`M 32 50 C 32 36, 68 36, 68 50 C 68 64, 32 64, 32 50 Z`) plus the central dot. The shipped asset and the written meaning disagree.

Decision needed: redraw the seal with two loops, or rewrite the meaning for one. The `packages/ui` Seal component must not be built until this is settled.

## 4. Verification can be gamed — BEFORE-PHASE-4

`peer_verified` at 5 confirmations has no sybil resistance: five throwaway accounts verify anything. This matters more if verified material feeds datasets or training. Also unspecified: who may confirm (any user? speakers of that language?), how a confirmer's competence is established, and what `flagged`/`rejected` transitions require.

`VERIFICATION_SYSTEM.md` correctly says verification is not universal truth. Add: the label must never be exported to a dataset consumer as "gold" without a stronger tier (curator review).

## 5. Consent, licensing and copyright — BEFORE-PHASE-3

`DATA_MODEL.md` has no fields for contributor consent, license grant, speaker consent for audio, or copyright status. Contributions accept text, audio, video and **external media URLs**. Gaps:

- Lyrics and songs are copyrighted (this repo's `.gitignore` already treats them so). "Praise/song excerpt" is a listed content type.
- Audio is biometric-adjacent personal data; `AUDIO_SPEECH.md` leaves retention undefined.
- If contributions will ever train models or be licensed (deck), the grant must be captured at submission. It cannot be added retroactively.
- Nigeria's data protection law (NDPA) applies to voice and personal data.

Minimum fields before any contribution is stored: `consentVersion`, `licenseGrant`, `rightsHolderDeclaration`, `speakerConsentForAudio`, `retentionPolicy`.

## 6. Two data models — BEFORE-PHASE-3

`DATA_MODEL.md` (Contribution / Verification / ArchiveArtifact) and `reference/ogbifo-architecture.md` (workspace / job / transcript_segment / review_item / review_decision) overlap: `review_item`/`review_decision` vs. `Verification`/`PeerConfirmation`; `media_asset` vs. `ArchiveArtifact`. Pick one canonical vocabulary or define the mapping.

## 7. Resonance Score depends on unmeasured Yorùbá ASR — BEFORE-PHASE-2

Clarity, Rhythm and Boldness are undefined as computations, and any transcript-based score needs ASR that works on Yorùbá, which the architecture doc lists as an open evaluation question. Ship Phase 2 behind an explicit "guidance" label (already required by the PRD), and define each metric as a deterministic function of named audio features before building UI around the numbers.

## 8. "Sovereign" has two meanings — MINOR

Brand: "Sovereign Accord System", sovereign courts (the *client* of the interpreter). Product: top progression rank and "first Sovereign" of a language. The user is cast as the king in one place and the interpreter in another. Pick one stance; the Ogbifọ is the interpreter, so rank titles are arguably better drawn from the interpreter's role (Keeper, Interpreter) than from the court.

## 9. Leaderboard vs. "don't gamify culture" — MINOR

The early prototype has a reputation leaderboard ("Language champions", crowns). `UX_SPEC.md` and `GAMIFICATION.md` reject likes, followers and competitive framing. Drop the leaderboard from MVP.

## 10. Stack split — MINOR

App spec: Node/TypeScript, REST. Architecture doc and `bench/`: Python for ML/ASR/MT workers. Plausible as TypeScript app + Python workers behind an API; state it so engineers don't pick one stack.
