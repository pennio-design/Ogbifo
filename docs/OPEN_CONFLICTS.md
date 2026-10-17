# Ogbifọ — Open Conflicts and Decisions

Per `CLAUDE.md`: when requirements conflict, flag the conflict rather than silently choosing. Nothing below has been resolved in the specs. Each item needs an owner decision before the dependent work starts.

Status key: **RESOLVED** (decided; see `PRODUCT_DECISIONS.md`), **BEFORE-PHASE-N** (resolve before that MVP phase), **MINOR**.

---

## 1. Which product is this? — RESOLVED

**Decision:** Ogbifọ is a consumer language and cultural archive/interpreter product. It is not a data-engine business. See `PRODUCT_DECISIONS.md` D-001 to D-005.

The repo's `bench/` and `audit/` (Yorùbá tone restoration for lyrics, reels and films), `reference/ogbifo-architecture.md` (B2B review pipeline) and the pitch deck (data engine, $500K) describe a different project. They stay in the repo for now but do not dictate Ogbifọ's product direction, scope or roadmap. Nothing in `docs/` depends on them.

Still open: the revenue model for the consumer product is undefined. This is a business question, not a blocker for Phase 1.

## 2. Brand drift across artifacts — BEFORE-PHASE-1

`CLAUDE.md` bans excessive gradients and generic SaaS styling. Existing artifacts violate it:

- Pitch deck: Yeseva One / Instrument Serif, orange→gold→teal gradient headlines, glow orbs, custom cursor.
- Early prototype (`ogbifo-1.html`): terracotta palette, Syne / Space Mono, grain overlay.
- Motion bank: Inter, a plain circle mark rather than the Royal Seal.

Decision: the brand guidelines palette and type (Clay / Ochre / Bone; Fraunces / Space Grotesk / Plus Jakarta) are canonical. Others are to be retired, not ported. The pitch deck should be rebuilt on the brand system before it is shown again.

## 3. Royal Seal: one loop or two? — CANDIDATE RECEIVED, NEEDS CONFIRMATION

The brand copy and spec say "two intersecting ochre loops". The shipped SVG (`BRAND_SYSTEM.md`) draws one lens plus a dot. A new candidate, `brand/royal-seal-candidate.svg`, also draws **one** loop, so a single loop looks like the direction. Not yet confirmed as canonical, so the `packages/ui` Seal component is still blocked.

What the candidate changes versus the shipped seal:

- Spokes are 16 identical short strokes rotated about the center, inside r 27–34, instead of the outer, irregular r 33–38 ring. It reads as a dial or sun-ray ring, less like a waveform.
- Heavier: spoke stroke 3.5 (was 3), loop stroke 6 (was 4.5), pupil r 6.5 (was 5).
- Spokes are hardcoded `#1a1a1a`. On Clay (`#121413`) they are effectively invisible. They need `currentColor` and a Bone/Clay theme pair, as in the shipped asset. The file is saved unchanged; fix it when confirmed.

Concern to decide before confirming: an almond with a round center reads as an **eye**. The brand guidelines say the seal "rejects the surveillance aesthetic of cold technology tools" and presents Ogbifọ as a protective guard rail. An eye with a pupil, combined with microphone recording and scoring, can read as watching. This may be fine (the all-seeing interpreter, a watchful guardian), but if so, state it in `BRAND_SYSTEM.md` and say why it is not surveillance. Also decide whether the "two domains converging" meaning survives with one loop. The written meaning (left = oral statecraft, right = foreign register) does not apply to a single shape.

## 4. Verification can be gamed — BEFORE-PHASE-4

Peer verification supports community trust and archive quality. It is not dataset certification (D-004). That lowers the stakes, but the weakness remains: `peer_verified` at 5 confirmations has no sybil resistance, so five throwaway accounts can mark anything verified and degrade trust in the Archive.

Still unspecified: who may confirm (any user, or speakers of that language), how a confirmer's competence is established, and what `flagged` and `rejected` require. Minimum before Phase 4: rate limits, one-account-per-person signals, and a moderation path to revoke `peer_verified`.

## 5. Consent, licensing and copyright — BEFORE-PHASE-3

Not a dataset concern, but still required: users contribute recordings, media, lyrics and cultural material (D-003, D-005). `DATA_MODEL.md` has no consent, license, rights or retention fields.

- Lyrics and songs are copyrighted. "Praise/song excerpt" is a listed content type, and external media URLs are accepted.
- Voice recordings are personal data. Nigeria's data protection law (NDPA) applies.
- Cultural material may carry community or family ownership that the contributor does not hold alone.
- The grant must be scoped to what Ogbifọ actually does: display in the Archive, community verification, the contributor's own practice. Any use beyond that (training, licensing, sale) needs new, separate consent. It must not be bundled into the original terms.

Minimum fields before any contribution is stored: `consentVersion`, `licenseGrant` (scoped as above), `rightsDeclaration`, `speakerConsentForAudio`, `retentionPolicy`, and a withdrawal path.

## 6. Two data models — RESOLVED

`DATA_MODEL.md` is canonical. The B2B vocabulary in `reference/ogbifo-architecture.md` belongs to the separate project and is not used here.

## 7. Resonance Score depends on unmeasured Yorùbá ASR — BEFORE-PHASE-2

Clarity, Rhythm and Boldness are undefined as computations, and any transcript-based score needs ASR that works on Yorùbá, which the architecture doc lists as an open evaluation question. Ship Phase 2 behind an explicit "guidance" label (already required by the PRD), and define each metric as a deterministic function of named audio features before building UI around the numbers.

## 8. "Sovereign" has two meanings — MINOR

Brand: "Sovereign Accord System", sovereign courts (the *client* of the interpreter). Product: top progression rank and "first Sovereign" of a language. The user is cast as the king in one place and the interpreter in another. Pick one stance; the Ogbifọ is the interpreter, so rank titles are arguably better drawn from the interpreter's role (Keeper, Interpreter) than from the court.

## 9. Leaderboard vs. "don't gamify culture" — MINOR

The early prototype has a reputation leaderboard ("Language champions", crowns). `UX_SPEC.md` and `GAMIFICATION.md` reject likes, followers and competitive framing. Drop the leaderboard from MVP.

## 10. Stack split — MINOR

App spec: Node/TypeScript, REST. Speech scoring and translation may need Python model workers behind the API; decide when Phase 2 starts.
