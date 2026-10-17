# Ogbifọ — Product Requirements Document

## 1. Overview

Ogbifọ is a consumer language and cultural archive/interpreter product centered around authentic Yorùbá content and interpretation. It is not a data-engine business: the MVP has no dataset-selling model, and the Reading Room and contributions exist for learning, interpretation, preservation and cultural participation (`PRODUCT_DECISIONS.md`).

The MVP consists of:

1. Reading Room
2. Language Decks
3. Language Map
4. Translation
5. Speech/reading interaction
6. Resonance scoring
7. Community contributions
8. Peer verification
9. Offline-first contribution flow
10. User progression

---

## 2. MVP objectives

- **A — Language encounter.** Allow users to encounter authentic language artifacts in a focused reading experience.
- **B — Interpretation.** Provide understandable interpretation/translation without erasing the original language.
- **C — Speech interaction.** Allow users to read language artifacts aloud and receive useful feedback.
- **D — Archive growth.** Allow users to contribute text/media and preserve language metadata.
- **E — Community authority.** Create a peer verification mechanism for submitted content.
- **F — Retention.** Create progression through decks, scores, ranks, and recurring practice.

---

## 3. Core features

### 3.1 Reading Room

The Reading Room is the central product experience.

A Reading Room session contains: current deck, progress indicator, score, mode selector, target language, language label, tier, category, original text, translation, interpretation controls, reference/context action, next card.

The existing product design models Live and Studio modes and target-language selection.

**Acceptance criteria**

- User can start a session.
- A card is displayed.
- Source language is clearly visible.
- Original orthography is preserved.
- Translation is available.
- User can advance.
- Progress updates.
- Session score updates.
- Session works on mobile.

### 3.2 Decks

A Deck is a curated collection of Cards.

Examples in the source product: Proverb House, Common Tongue.

Cards may contain: language, tier, category, source text, translation, metadata, token value.

MVP content is Yorùbá only (`PRODUCT_DECISIONS.md` D-010); more languages follow the gate in `LANGUAGE_EXPANSION.md`.

**Deck selection.** A deck may have: language, region, difficulty, number of cards, reward multiplier, locked/unlocked state.

### 3.3 Language Map

The Language Map exposes languages and regional coverage.

Each language may display: language name, region, archive count, archive gap, Pioneer status, discovery action.

The product concept treats archive gaps as something the platform can use to influence content selection.

### 3.4 Translation

> Deferred (`PRODUCT_DECISIONS.md` D-023): no free-text machine translation in the MVP. Cards carry reviewer-approved translations. The list below is the deferred spec.

Translation should support: source language, target language, text input, output, language swap, character count, word count, copy, feedback.

Translation must preserve the source text exactly. It must not silently remove diacritics.

### 3.5 Speech / Reading

The user reads a card naturally.

The system may capture: audio, transcript, detected language, pronunciation characteristics, timing, rhythm.

The prototype describes the speaker reading in their own cadence and dialect, followed by real-time interpretation and subtitles.

### 3.6 Resonance Score

The system produces: overall Resonance Score, Clarity, Rhythm, Boldness.

The score should be presented as guidance rather than absolute linguistic truth. Avoid wording that implies the score objectively determines whether a person is culturally or linguistically authentic.

> Scoring approach is decided (`PRODUCT_DECISIONS.md` D-014); metric definitions are open (`OPEN_CONFLICTS.md` #7).

### 3.7 Shareable Artifact

After a reading: generate waveform visualization, display language/category/deck, display score, allow sharing.

### 3.8 Community Contributions

Users can submit: text, audio, video, external media URL.

Metadata: language, dialect, context tags, source, contributor.

Contributions are for the Archive and Community, not commercial dataset production. Because users can contribute recordings, media, lyrics and cultural material, consent, license and rights fields are required (`OPEN_CONFLICTS.md` #5). No contribution may be persisted server-side until they exist.

### 3.9 Verification

Every contribution initially enters `pending_review`.

Community members can confirm it. Verification supports community trust and archive quality; it is not dataset certification. Default peer threshold in the current implementation: **5 confirmations**. After reaching the threshold: `peer_verified`.

### 3.10 Offline-first contributions

Contribution creation must not depend on an active network connection.

```
User submits
     ↓
Create clientId
     ↓
Save locally
     ↓
Render immediately
     ↓
pending_review
     ↓
Queue synchronization
     ↓
Network becomes available
     ↓
POST /contribute
     ↓
Server returns canonical record
     ↓
Update local record
```

The existing implementation uses IndexedDB/outbox semantics and renders the contribution immediately while synchronization happens later.

---

## 4. User progression

Users progress through Ogbifọ by: completing cards, maintaining practice, contributing content, verifying content, exploring new languages, improving reading/speech performance.

Progression must reward participation without turning culture into a competitive game.

---

## 5. Non-functional requirements

**Performance:** fast initial load; lazy-load heavy media; avoid blocking audio initialization; cache static language content.

**Accessibility:** keyboard navigation; semantic controls; visible focus; sufficient contrast; screen-reader labels; reduced-motion mode.

**Internationalization:** Unicode is first-class data. Never assume ASCII. Never truncate based on byte length.

---

## 6. MVP exclusions

Do not build initially:

- complex social messaging
- marketplace
- advertising system
- unrestricted public AI chat
- dataset export, licensing or selling
- automatic deletion of unverified contributions
- complex creator monetization
- large enterprise administration system
