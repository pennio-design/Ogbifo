# Ogbifọ — Product Decisions

Decisions that override or constrain other documents. Newest definition wins (see `CLAUDE.md`).

## D-001 Product category

Ogbifọ is a consumer language and cultural archive/interpreter product. It is not a data-engine business.

## D-002 No dataset-selling business model in the MVP

The Ogbifọ MVP has no dataset-selling, data-licensing or training-data revenue model. Do not build export, licensing, buyer-facing or "dataset" features, and do not design schemas, UI copy or consent flows around that purpose.

## D-003 Purpose of the Reading Room and contributions

The Reading Room exists for language learning, interpretation, preservation and cultural participation. Contributions are primarily for the Ogbifọ Archive and Community, not commercial dataset production.

## D-004 Meaning of verification

Peer verification supports community trust and archive quality. It is not dataset certification. `peer_verified` must never be presented, exported or described as gold, certified or authoritative linguistic truth.

## D-005 Consent and licensing still apply

Users may contribute recordings, media, lyrics and cultural material, so consent, license and rights capture are required before any contribution is stored (`OPEN_CONFLICTS.md` #5). The grant covers Archive display, community verification and the contributor's own use. Any other use needs new, explicit consent and a new decision in this file.

## D-006 The benchmark project

`bench/`, `audit/`, `docs/reference/ogbifo-architecture.md` and the pitch deck belong to a separate project. They do not drive Ogbifọ's roadmap. They stay in this repository until the owner moves or drops them. App work does not modify them.

## D-007 Royal Seal

One loop. The canonical seal is `brand/royal-seal.svg`: a 16-spoke radial waveform (`currentColor`), a single Ochre loop, and a central Ochre fulcrum. Do not redraw it or add a loop. The earlier "two intersecting loops" wording is retired, and an eye-shaped candidate was rejected because it reads as an eye, against the brand's rejection of surveillance aesthetics.

## D-008 Canonical sources

`docs/` is the single source of truth. The brand guidelines palette and typography (Clay / Ochre / Bone; Fraunces / Space Grotesk / Plus Jakarta Sans) are canonical. `DATA_MODEL.md` is the canonical data model. No earlier prototype, deck or pipeline document is a source.

## D-009 No leaderboards

No leaderboards or competitive ranking in the MVP.

## D-010 Yorùbá only

Ogbifọ is a Yorùbá product, not a Nigerian or African multi-language product. The MVP's content, Decks, Archive, translation, speech scoring, copy and fonts cover Yorùbá only. Hausa, Igbo, Pidgin and every other language are out of scope. The data model keeps `languageId` so the schema does not need rewriting later, but nothing is built, seeded or designed for a second language, and adding one needs a new decision here.
