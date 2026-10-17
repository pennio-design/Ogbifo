# Engineering rules

- TypeScript, strict. Small composable modules. Deterministic, testable domain logic.
- Layering: UI → application service → domain service → repository → database. UI never touches persistence.
- Offline-first: write locally, render immediately, sync later. `clientId` is the idempotency key. Keep sync state separate from verification state.
- Unicode: never truncate by bytes or code units; count and cut by grapheme. Store `originalText` as submitted; normalize only into `normalizedText`.
- Errors: structured `{ error: { code, message } }`; never leak stack traces.
- No destructive migrations. No hardcoded API assumptions.
- Never commit lyrics, line sheets, verifier exports or reports; the repo is public (see `.gitignore`).
