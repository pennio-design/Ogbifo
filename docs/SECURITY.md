# Ogbifọ — Security and Privacy

**Status: stub.** Requirements already stated elsewhere (`API_SPEC.md`, `AUDIO_SPEECH.md`, `OFFLINE_FIRST.md`):

- Never expose internal stack traces to clients.
- Confirmations are idempotent per user/contribution pair; users cannot confirm their own contributions.
- `clientId` is an idempotency key; repeated requests must not create duplicates.
- Request microphone permission only when necessary.
- Audio is not retained indefinitely by default; processing, upload, storage, reuse and deletion must be disclosed to the user.
- Authentication sits behind an abstraction layer.

Ogbifọ does not sell or license contributed material (`PRODUCT_DECISIONS.md` D-002). Consent covers Archive display, community verification and the contributor's own use only; anything broader needs new consent.

Analytics (`PRODUCT_DECISIONS.md` D-028): off until consent; never receive audio, pitch data or typed language text; replay masks the recording UI and contribution form.

Built and tested: the microphone is requested only when Record is pressed; learner audio stays in memory and is dropped after analysis; progress stores scores and markers, never audio. The reviewer tool is off unless `OGBIFO_ENABLE_REVIEWER_TOOLS=1`, which is per deployment because there are no accounts yet (D-022). It must not be switched on for a public site.

To define before Phase 3 (see `OPEN_CONFLICTS.md` #4, #5): consent and license capture, retention periods, data-subject deletion, rate limiting and abuse controls on `/contribute` and `/verification/:id/confirm`, sybil resistance, media upload scanning, and storage of locally-queued contributions on shared devices.
