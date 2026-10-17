# Ogbifọ — Offline-First Specification

## Principle

Ogbifọ should remain useful when connectivity is poor. This is especially important for community contributions and language preservation.

## Local-first contribution

When a user contributes:

1. Validate locally
2. Generate `clientId`
3. Write to IndexedDB
4. Immediately update UI
5. Mark queued
6. Attempt synchronization

Never make the user wait for the network before seeing their contribution.

## Sync states

`queued`, `syncing`, `synced`, `failed`, `retrying`

## Verification state

Separate synchronization state from verification state.

```json
{
  "syncState": "synced",
  "verification": {
    "status": "pending_review",
    "peerConfirmations": 0,
    "peerThreshold": 5
  }
}
```

## Idempotency

The backend must treat `clientId` as an idempotency key. Repeated requests must not create duplicate contributions.

## Retry

Use exponential backoff. Suggested: 5s, 15s, 30s, 60s, 5m, 15m.

Cap retries and allow manual retry.

## Conflict handling

Server is authoritative for: canonical ID, moderation state, verification state, timestamps.

Client is authoritative for unsynced local drafts.

## UX

- Offline banner: *Offline — your archive contributions are saved and will sync automatically.*
- Successful sync: *Saved to the archive queue.*
- Failed sync: *Still waiting to sync. Your contribution is safe on this device.*
