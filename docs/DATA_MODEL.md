# Ogbifọ — Data Model

> Gap: no consent, license, rights or retention fields exist yet. See `OPEN_CONFLICTS.md` #5. Add them to `Contribution` before it is persisted anywhere. Do not add dataset-export fields (`PRODUCT_DECISIONS.md`).

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

ReadingSession
- id
- userId
- cardId
- startedAt
- completedAt?
- mode                 (studio | live, D-024)
- targetLanguage       (en, D-023)
- score                (null until scoring exists; scale per OPEN_CONFLICTS #7)

ResonanceScore
- id
- sessionId
- overall
- clarity
- rhythm
- boldness
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
