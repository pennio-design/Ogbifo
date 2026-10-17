# Ogbifọ — Technical Architecture

## Recommended stack

**Frontend:** Next.js, TypeScript, React, Tailwind CSS, Web Audio APIs, IndexedDB.

**Backend:** TypeScript, Node.js, PostgreSQL, object storage for audio/media, REST API initially.

**Authentication:** Use an abstraction layer so the authentication provider can change without affecting domain logic.

> Speech analysis runs in TypeScript on the device (D-019, `SCORING_SPEC.md`). Any server-side speech or translation worker is undecided.

## Architecture

```
                 ┌──────────────────┐
                 │   Ogbifọ Web App │
                 └────────┬─────────┘
                          │
              ┌───────────┴───────────┐
              │                       │
        Local Store              API Client
        IndexedDB                    │
              │                       │
              └───────────┬───────────┘
                          │
                    ┌─────▼─────┐
                    │ API Layer │
                    └─────┬─────┘
                          │
       ┌──────────────────┼──────────────────┐
       │                  │                  │
   Content Service    Speech Service    Community Service
       │                  │                  │
       └──────────────────┼──────────────────┘
                          │
                    ┌─────▼─────┐
                    │ PostgreSQL│
                    └─────┬─────┘
                          │
                    ┌─────▼─────┐
                    │   Media   │
                    │  Storage  │
                    └───────────┘
```

## Domain boundaries

- **Content** — cards, decks, languages, dialects, categories, translations
- **Speech** — recording sessions, transcripts, speech metrics, resonance scores
- **Community** — contributions, verification, peer confirmations, moderation
- **Progression** — sessions, scores, tokens, ranks, achievements
- **Identity** — users, profiles, preferences

## Important architectural rule

The UI must never directly manipulate database models.

```
UI
 ↓
Application service
 ↓
Domain service
 ↓
Repository
 ↓
Database
```

This keeps Ogbifọ's business rules testable.
