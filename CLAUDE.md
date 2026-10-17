# Ogbifọ — Claude Code Project Instructions

## Product

Ogbifọ is a language intelligence and cultural archive platform inspired by the historical role of the Ogbifọ: an interpreter who operated between sovereign courts and foreign delegates.

The product must not feel like a generic translation application.

Ogbifọ is a bridge between:

- language and meaning
- speaker and listener
- oral tradition and digital archive
- local knowledge and global understanding

The product should feel protective, trustworthy, human, culturally grounded, and technically sophisticated.

## Core product loop

The primary experience is:

1. A language artifact appears.
2. The user encounters it in the source language.
3. The user reads or speaks naturally.
4. Ogbifọ interprets the content.
5. The system provides translation/subtitles and interpretation feedback.
6. The interaction contributes to the user's progress.
7. Useful language/cultural material can enter the archive.
8. Community members help verify contributed material.

## Product principles

1. **Language before technology.** Never make the AI/technology the hero. The language, speaker, culture, and meaning are the hero.
2. **Preserve linguistic identity.** Do not normalize away tone marks, diacritics, dot-below characters, dialect information, or original orthography.
3. **Local authority matters.** Community knowledge is authoritative input. User-contributed content must support verification and peer confirmation.
4. **Offline resilience.** Important user actions should work without network connectivity whenever technically possible. Contributions are saved locally and synchronized later.
5. **No generic SaaS aesthetic.** Avoid generic blue AI interfaces, excessive gradients, glassmorphism, corporate dashboard aesthetics, unnecessary rounded cards everywhere, and robotic AI language. Use Ogbifọ's dark editorial visual language.

## Brand system

Primary:

- Clay: `#121413`
- Ochre: `#D49B41`
- Bone: `#FAF9F6`
- Charcoal: `#1A1C1B`
- Forest: `#1B2E24`
- Ash: `#8A8D8A`
- Card background: `#161817`

Typography:

- Fraunces: wordmark, editorial statements, language content
- Space Grotesk: interface, labels, metadata, controls
- Plus Jakarta Sans: body/interface copy

The Royal Seal consists of a radial waveform boundary, ochre inner loop(s), and a central ochre fulcrum/dot. It represents the convergence of two domains and the Ogbifọ as the trusted center. See `docs/OPEN_CONFLICTS.md` #3: a single-loop candidate exists (`docs/brand/royal-seal-candidate.svg`) but is not yet confirmed.

## Engineering principles

Prefer: TypeScript, strict typing, small composable modules, accessible semantic HTML, progressive enhancement, offline-first architecture, deterministic domain logic, testable services.

Avoid: giant components, duplicated business logic, hidden state, hardcoded API assumptions, coupling UI directly to persistence, destructive migrations, silently changing product terminology.

## Terminology

Use these product terms consistently:

- Ogbifọ — the interpreter / platform identity
- Reading Room — primary interaction experience
- Deck — collection of language artifacts
- Card — individual learning/reading artifact
- Sovereign — progression/status concept
- Resonance Score — reading/speech result
- Community — contribution and verification area
- Archive — accumulated cultural/language corpus
- Royal Seal — visual identity
- Language Map — language discovery view

## Implementation rule

Before implementing a feature:

1. Read the relevant document in `/docs`.
2. Identify acceptance criteria.
3. Identify domain entities affected.
4. Identify API/persistence implications.
5. Implement tests.
6. Implement UI.
7. Verify responsive behavior.
8. Run the relevant test suite.
9. Do not invent unsupported product behavior.

When requirements conflict, preserve the most recently defined product behavior and flag the conflict rather than silently choosing. Known conflicts are tracked in `docs/OPEN_CONFLICTS.md`; add to it rather than resolving them in code.

## Definition of done

A feature is not complete until:

- functionality works
- loading state exists
- empty state exists
- error state exists
- offline behavior is defined where relevant
- accessibility has been considered
- mobile layout works
- keyboard interaction works where applicable
- tests exist for business logic
- terminology follows Ogbifọ conventions
- visual implementation follows the brand system

## Product decisions

Ogbifọ is a consumer language and cultural archive/interpreter product, not a data-engine business. No dataset-selling model in the MVP; contributions serve the Archive and Community; peer verification is community trust, not dataset certification; consent and licensing still apply. Read `docs/PRODUCT_DECISIONS.md` before any work touching contributions, verification or storage.

## Separate project in this repo

- `bench/` — Python tone-restoration benchmark (Yorùbá lyrics).
- `audit/` — yearly audit of Yorùbá lyrics online and the demand test.
- `docs/reference/ogbifo-architecture.md` — B2B pipeline architecture.

These belong to a separate project (kept, or to be dropped, at the owner's discretion). They do not drive Ogbifọ's direction. Do not modify them as part of app work. The repository is public and lyrics are copyrighted: never commit line sheets, lyrics, verifier exports or reports (see `.gitignore`).
