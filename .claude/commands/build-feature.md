---
description: Build a feature from the Ogbifọ specs, following the implementation rule in CLAUDE.md
argument-hint: <feature or user-story id, e.g. US-010 or "Reading Room">
---

Build: $ARGUMENTS

1. Read `CLAUDE.md` and the relevant docs in `docs/`. Read `docs/OPEN_CONFLICTS.md` and stop to ask if the feature depends on an unresolved item.
2. State the acceptance criteria, the domain entities affected, and the API and persistence implications.
3. Write tests for the business logic first.
4. Implement domain and application services, then UI. UI never touches persistence directly.
5. Cover loading, empty, error and offline states; mobile layout; keyboard use.
6. Run the relevant test suite and report the actual result.
7. Do not invent behavior the specs do not state. List any gaps you hit.
