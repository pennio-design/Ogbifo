# Ogbifọ — Briefing for Legal Counsel

**Status: working draft prepared by the product owner's engineering assistant. This is not legal advice. Nothing in the "Draft wording" section has been reviewed by a lawyer and none of it is in the product.** Its purpose is to let counsel see, in plain English, what Ogbifọ does with people's data and content, what has been decided, and what we need counsel to decide.

Prepared for: Iniabasi (barrister). Prepared by: Ogbifọ project. Source of truth for product decisions: `docs/PRODUCT_DECISIONS.md` (cited below as D-nnn). Open legal items: `docs/OPEN_CONFLICTS.md` #5, #13, #17.

---

## 1. What Ogbifọ is

A consumer product for learning, reading and preserving **Yorùbá**. Two parts:

- **Reading Room.** A learner is shown a Card (a Yorùbá phrase or proverb with its translation), listens to a reference recording, records themselves reading it, and gets guidance on their **tones and timing**. Scores are guidance only. They do not claim a reading is correct or authentic.
- **Archive and Community** (not built yet). Users may contribute recordings, written material and cultural content. Other users confirm it. Verified entries are public to read.

It is **not** a data business. No dataset selling, licensing, export or training-data revenue in the MVP (D-002, D-003). That is a deliberate design constraint: no sponsor or investor receives rights to contributions or recordings (D-032).

## 2. What exists today and what does not

| Area | State |
|---|---|
| Reading Room, Decks, Cards, progress | Built. Runs in the browser. Progress for anonymous readers lasts one visit (D-022). |
| Recording and tone/timing analysis | Built. Runs **on the learner's device**. Audio is held in memory, analysed, and discarded. It is never uploaded or stored (D-019). Only tested with synthetic voices in Chromium. |
| Reviewer annotation tool | Built, switched off by default, no login yet. Used by volunteers to mark syllable boundaries on reference recordings. |
| Accounts, server storage, database | **Not built.** Nothing about any user is stored on a server today. |
| Analytics | **Not built.** Guardrails decided (D-028, D-035); vendor not chosen. |
| Contributions (text only) | **Built, device-only.** Form, draft consent screen and licence fields exist and save to the contributor's own browser. Contributing requires an account, so every contribution is attributable to a person (sign-in itself is not built). Sync to a server is switched off in code until this wording is approved (D-038). |
| Accounts | **Built, not deployable.** Sign-in by emailed link (no passwords). We store the email address and a display name ("Reader"). No email provider is chosen and account data is stored in a PostgreSQL database whose host is not yet chosen. |
| Archive, Community verification | **Not built.** Peer confirmation rules exist as tested logic, with no screen. |
| Consent screens, privacy notice, terms of service | **Not written.** |

Consequence for counsel: **today the product collects no personal data on any server.** A contributor's text is stored only in their own browser. The legal exposure arises at the next stages (volunteer calibration, reference voices, accounts, analytics, contributions). We would rather settle the rules before building those than after.

## 3. Data flows (what touches what)

1. **Learner voice, in the Reading Room.** Microphone requested only when the learner presses Record. Audio stays in browser memory; pitch analysis runs in a Web Worker on the device; the audio is discarded after the result. Not sent anywhere. Only a numeric score and pitch contour are kept, and for now only in the browser (D-019). *If we ever let a learner keep or share a recording, that is new consent and a new decision.*
2. **Calibration speakers (planned, ≥20 volunteers).** Their recordings are used once to tune and test the scoring. This **is** voice data collected and stored by us. Needs written consent, a stated purpose (calibration only), a storage location and a deletion date (OPEN_CONFLICTS #17.2). Any reward is separate from, and never a condition of, consent.
3. **Reference voices (planned, two).** The recordings learners are scored against. Stored by us and played to the public. Provenance rules in D-034 (section 6 below).
4. **Reviewers and linguists (volunteers).** Named publicly on Cards they approve (D-012: two distinct named reviewers per Card). They are identifiable people whose names we publish.
5. **Analytics (planned).** Off until consent; withdrawable; never audio, pitch data, typed Yorùbá text, or scores; session replay masks the recording interface and forms; vendor named in the privacy notice (D-028, D-035).
6. **Accounts (planned).** Google, Apple or email link; no passwords (D-022). Needed to keep progress, download Decks, contribute or confirm.
7. **Contributions (planned).** Recordings, media, lyrics, cultural material. See sections 4 and 5.

## 4. Consent and licence model, as decided

- Consent, licence and rights fields are **mandatory before any contribution is stored**; the grant is scoped to Archive use (D-005).
- Contributor **keeps ownership** and grants Ogbifọ a **non-exclusive licence** to display, preserve and let the community verify the entry, **on Ogbifọ only**. Nothing is licensed to third parties (D-020).
- Contributor can **withdraw** the licence; a withdrawn entry disappears from view (D-020).
- Anything beyond Archive display, community verification and the contributor's own use requires new, explicit consent and a new recorded decision (D-005).
- **Copyrighted works such as lyrics** are not accepted without a rights declaration (D-020).
- Planned record fields per contribution: `consentVersion`, `licenseGrant`, `rightsDeclaration`, `speakerConsentForAudio`, `retentionPolicy`, `withdrawnAt`.
- Two verification labels never conflated: **Peer confirmed** (five confirmations from fluent signed-in users) and **Reviewed** (named reviewers only). Verification is community trust, not certification or truth (D-021, product rules).

## 5. Questions for counsel

Numbered so you can answer by number. Where we have a leaning, it is stated; please override freely.

**A. Data protection**
1. **Which regimes apply?** Operator is in Nigeria (NDPA 2023 assumed). Diaspora learners (UK, EU, US) are an intended audience. Do GDPR and UK GDPR apply to us from day one, and what follows (representative, transfer rules)? Anything for Nigerian data-controller registration thresholds?
2. **Voice recordings.** Is a voice recording used for pitch analysis "biometric" or special-category data? We do no speaker identification, but the recordings are of identifiable people. What lawful basis fits calibration speakers, reference speakers and (later) contributors: consent, contract, legitimate interest?
3. **On-device processing.** We state that learner audio never leaves the device. Does that take the Reading Room largely outside controller obligations for that audio? Wording for the privacy notice so the claim is accurate and not overstated.
4. **Retention.** What deletion periods are defensible for calibration recordings (we propose: delete after calibration, fixed date), reference recordings (life of the Card plus withdrawal), and withdrawn contributions?
5. **Children.** We have no age gate. Yorùbá learners include children. What is the minimum age, parental consent, and is an age gate or a "16+" terms position needed before accounts launch?
6. **Analytics consent.** Opt-in banner design that satisfies NDPA and GDPR/ePrivacy; whether the vendor must be EU/UK/Nigeria-hosted; DPA requirements; whether masked session replay is acceptable.
7. **Cross-border transfer** if a host or vendor is outside Nigeria.

**B. Consent, licence and withdrawal**
8. **Licence grant.** Is "non-exclusive licence to display, preserve and let the community verify, on Ogbifọ only" enough to operate a public archive? What must it say about duration, territory, sublicensing to hosting providers, and derivative formats (transcoding, thumbnails)?
9. **Withdrawal.** What happens to an entry other people have already confirmed or reviewed? We lean: it disappears from view, confirmations are retained as non-public records, no purported certificate survives. Is that compatible with erasure rights and with our legitimate interest in record integrity?
10. **Speaker consent for audio.** The uploader may not be the speaker. What evidence of the speaker's consent is required, and what if the speaker cannot be reached?
11. **Revision of terms.** If the licence wording changes (`consentVersion`), what re-consent is required, and what happens to entries whose contributors do not respond?

**C. Copyright and cultural material**
12. **Lyrics.** Lyrics are the main copyright risk. Our rule: no lyrics without a rights declaration. Is a self-declaration adequate, what warranties and indemnity should it carry, and what notice-and-takedown process do we need as host? (Takedown process: what jurisdiction's model should we follow?)
13. **Reference audio provenance (D-034).** Three allowed routes: (a) speaker recorded for Ogbifọ under written consent and licence; (b) existing recording with written permission from the rights holder; (c) CC BY or CC0 clip with attribution kept and no third-party music or lyrics. Please review the three routes and the wording of the provenance record we keep. Specific question on sourcing from public video platforms: only (b) or (c) are intended; confirm that platform terms do not undermine (c).
14. **Traditional and communal knowledge.** Proverbs, oriki and ritual material may be communal, not individually owned. Can an individual grant a licence over them? Should the rights declaration be different for them? Any cultural-rights considerations beyond copyright?
15. **Moral rights and attribution** for contributors and reference speakers.

**D. Volunteers, sponsors and funding**
16. **Volunteer agreement** for reviewers, linguists, annotators and calibration speakers (D-032): unpaid vs rewarded, tax or employment characterisation of rewards, IP in annotations they create, and publication of their names.
17. **Sponsors and investors.** D-032 says funding brings no data rights. What clause in a sponsorship or investment document makes that binding, and does it survive a change of control?
18. **Entity.** Which entity should be the contracting party and data controller (company, non-profit, or the founder personally until incorporation)? Is a pre-incorporation beta advisable?

**D2. Accounts and email addresses**
18a. Lawful basis and retention for email addresses; how long may an inactive account be kept; what an erasure request must remove (account, contributions, confirmations).
18b. The email provider is a processor and may sit outside Nigeria: what must the contract and notice say?
18c. Display names are public and chosen by users: terms for impersonation and offensive names.

**E. Public-facing terms and statements**
19. **Terms of service and privacy notice.** Scope and who drafts. We will supply the facts from this document.
20. **Product claims.** Our rules: scores are "guidance", never "correct" or "authentic"; Peer confirmed is "community trust". Any statement here that creates liability (accuracy of translation, cultural authenticity, educational outcomes)?
21. **Reviewer liability** if a reviewed Card contains an error or offensive content.
22. **Minimum viable legal set** for a closed beta of roughly 30 to 50 people: what must exist before we invite anyone, and what can wait for public launch?

## 6. Reference audio provenance, as decided (D-034)

Reference recordings used for scoring may come only from:

1. a speaker recorded for Ogbifọ under written consent and licence;
2. an existing recording whose rights holder gives written permission for this specific use; or
3. a clip published under CC BY or CC0, with attribution kept and no third-party music or lyrics in it.

Each reference carries a provenance record. The product refuses to attach a reference without one. A `synthetic_test` licence exists for development and is blocked on any reviewed Card.

## 7. Draft wording (NOT REVIEWED — for counsel to rewrite or discard)

Plain-language starting points only. They are not in the product. Nothing will ship until counsel has reviewed or replaced them (OPEN_CONFLICTS #17.5).

**Calibration speaker consent (draft)**
> We are asking you to read some Yorùbá phrases aloud so we can test how Ogbifọ gives feedback on tones and timing. We will record your voice. We will use the recordings only for that testing. We will keep them on [storage location] and delete them on [date]. We will not share them with anyone, publish them, sell them, or use them for any other purpose. Taking part is voluntary. You can withdraw at any time before [date] and we will delete your recordings. Any reward we give you is not conditional on this consent.

**Contributor licence (draft)**
> You keep ownership of what you contribute. You give Ogbifọ a non-exclusive licence to display it on Ogbifọ, preserve it in the Archive, and let the community confirm it. We will not license it to anyone else. You can withdraw this licence at any time; the entry will then disappear from view.

**Rights declaration, written material (draft)**
> I wrote this myself, or I have permission from the rights holder to add it to the Archive. If it is a lyric or other copyrighted work, I have the right to contribute it.

**Learner audio statement for the privacy notice (draft, depends on questions 2 and 3)**
> When you record yourself in the Reading Room, your recording is analysed on your device and is not sent to us or stored.

## 8. Known engineering limits relevant to legal review

- The "audio never leaves the device" claim is verified only in Chromium with a fake microphone. Safari and Firefox are untested. We will verify before any public statement.
- The reviewer tool has no login (a deployment switch only). It is off in production until accounts exist.
- Withdrawal and deletion flows do not exist yet; they will be built to whatever counsel specifies.
- No server-side storage exists, so no data breach surface exists today. This changes when accounts and contributions ship.

## 9. What we will do with your answers

Each answer becomes either a recorded decision in `PRODUCT_DECISIONS.md`, a field or rule in the data model, or reviewed wording in the consent screens. Contribution storage (Sprint 4) will not persist anything off-device until the consent and licence wording is approved.

## 10. Source documents (available on request)

`docs/PRODUCT_DECISIONS.md`, `docs/OPEN_CONFLICTS.md`, `docs/SECURITY.md`, `docs/DATA_MODEL.md`, `docs/AUDIO_SPEECH.md`, `docs/SCORING_SPEC.md` (technical; section 10 is the calibration plan).
