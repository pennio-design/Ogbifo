# Ogbifọ — API Specification

## Base

`/api/v1`

## Languages

```
GET /languages
GET /languages/:id
GET /languages/:id/decks
GET /languages/:id/cards
```

## Decks

```
GET /decks
GET /decks/:id
```

## Cards

```
GET /cards/:id
GET /cards/:id/context
```

## Translation

`POST /translate`

Request:

```json
{
  "sourceLanguage": "yo",
  "targetLanguage": "en",
  "text": "..."
}
```

Response:

```json
{
  "translation": "...",
  "confidence": 0.91,
  "sourceLanguage": "yo",
  "targetLanguage": "en"
}
```

## Reading

```
POST /reading-sessions
POST /reading-sessions/:id/audio
POST /reading-sessions/:id/complete
GET  /reading-sessions/:id
```

## Contributions

```
POST /contribute
GET  /community/feed
GET  /contributions/:id
```

The contribution API must accept a client-generated idempotency identifier.

```json
{
  "clientId": "uuid",
  "type": "text",
  "language": "yo",
  "dialect": "optional",
  "content_text": "...",
  "content_url": null,
  "context_tags": []
}
```

## Verification

```
POST /verification/:id/confirm
GET  /verification/:id
```

A confirmation must be idempotent per user/contribution pair.

## Progression

```
GET /me/progress
GET /me/rank
GET /me/achievements
```

## Error format

```json
{
  "error": {
    "code": "CONTRIBUTION_NOT_FOUND",
    "message": "Contribution could not be found."
  }
}
```

Never expose internal stack traces to clients.
