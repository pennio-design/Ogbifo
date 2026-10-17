# Ogbifọ — Data Model

> Consent, licence, rights and retention fields now exist on `Contribution` (`packages/domain/src/contribution.ts`, migration 0004). The wording behind them is an unreviewed draft: `OPEN_CONFLICTS.md` #5, #20, D-038. Do not add dataset-export fields (`PRODUCT_DECISIONS.md`).

```
User
- id
- displayName
- avatarUrl
- preferredLanguage
- targetLanguages[]
- rank
- tokens
- createdAt

Language
- id
- name
- code
- nativeName
- regions[]
- writingSystem
- status
- archiveCount
- archiveGapScore

Dialect
- id
- languageId
- name
- region
- description

Deck
- id
- name
- languageId
- description
- tier
- region
- tokenMultiplier
- isLocked
- unlockedByDeckId?    (Sprint 2, D-029: finishing that Deck unlocks this one)

Card
- id
- deckId
- languageId
- dialectId?
- category
- sourceText
- translation
- context
- source
- tokenValue
- difficulty
- createdAt
- reviewStatus         (Sprint 2, D-012: unreviewed | reviewed)
- reviewers[]          (named native-speaker reviewers; reviewed needs 2 or more, distinct)
- reviewedAt?          (required when reviewed)
- referenceAudioUrl?   (D-014; absent until recorded)
- referenceAnnotation? (in code, migration 0003: syllables with ms boundaries, reference pitch contour, MFCC, algorithmVersion; type in packages/speech)
- referenceProvenance? (in code, migration 0003, D-034: source, licence, rights holder, speaker consent, date, attribution)

ReadingSession
- id
- userId
- cardId
- startedAt
- completedAt?
- mode                 (studio | live, D-024)
- targetLanguage       (en, D-023)
- score                (null until scoring exists; scale per OPEN_CONFLICTS #7)

ResonanceScore         (D-031, SCORING_SPEC.md; specified, not yet in code)
- id
- sessionId
- overall              (0 to 100, always stored; shown only while showResonanceNumber is on, D-036)
- tone
- rhythm
- coverage             (share of syllables measured)
- pace                 (information only)
- algorithmVersion
- syllableMarkers[]    (first | close | higher | lower | unmeasured)
- learnerContour       (normalised semitones; audio is never stored, D-019)
- confidence

Contribution
- id
- clientId
- userId
- type
- languageId
- dialectId?
- contentText?
- contentUrl?
- contextTags[]
- verificationStatus
- createdAt

Verification
- contributionId
- status
- peerConfirmations
- peerThreshold
- verifiedAt

PeerConfirmation
- id
- contributionId
- userId
- createdAt

ArchiveArtifact
- id
- contributionId?
- cardId?
- languageId
- dialectId?
- artifactType
- storageUrl
- metadata
- createdAt

SyncOutbox
- clientId
- operation
- payload
- status
- retryCount
- createdAt
- lastAttemptAt
```
