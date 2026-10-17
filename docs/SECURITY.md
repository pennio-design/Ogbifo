# Ogbifọ — Security and Privacy

**Status: stub.** Requirements already stated elsewhere (`API_SPEC.md`, `AUDIO_SPEECH.md`, `OFFLINE_FIRST.md`):

- Never expose internal stack traces to clients.
- Confirmations are idempotent per user/contribution pair; users cannot confirm their own contributions.
- `clientId` is an idempotency key; repeated requests must not create duplicates.
- Request microphone permission only when necessary.
- Audio is not retained indefinitely by default; processing, upload, storage, reuse and deletion must be disclosed to the user.
- Authentication sits behind an abstraction layer.

To define before Phase 3 (see `OPEN_CONFLICTS.md` #4, #5): consent and license capture, retention periods, data-subject deletion, rate limiting and abuse controls on `/contribute` and `/verification/:id/confirm`, sybil resistance, media upload scanning, and storage of locally-queued contributions on shared devices.
