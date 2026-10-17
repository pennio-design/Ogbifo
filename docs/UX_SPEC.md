# Ogbifọ — UX Specification

## Experience hierarchy

Ogbifọ has four major modes:

1. Discover
2. Read
3. Interpret
4. Contribute

## Primary navigation

Recommended: Home, Reading Room, Decks, Language Map, Community, Profile.

## Reading Room

### Header

Display `Deck: Proverb House`, then: progress, score, Live / Studio, target language.

### Card

```
YORUBA · TIER 2 · PROVERB

Ẹni tó bá fẹ́ jẹun tó dára,
kò gbọdọ̀ jẹkí ojúkòkòrò mú un.

────────────────────

One who wants to eat well
must not let greed consume them.
```

### Interaction states

Card states: `idle`, `preparing`, `listening`, `recording`, `interpreting`, `completed`, `error`.

### Mobile

- header becomes compact
- controls move below card
- target language becomes full-width
- waveform controls remain thumb accessible
- no horizontal overflow

## Contribution UX

Contribution should feel like adding something to an archive rather than posting to social media.

Use: *Add to the archive*, *Preserve this expression*, *Add dialect context*, *Submit for verification*.

Avoid: Post, Go viral, Likes, Followers.

## Verification UX

Show `Pending community review`, then `3 / 5 confirmations`, finally `Peer verified`. The process should be transparent.

## Error language

Prefer:

> We couldn't reach the archive. Your contribution is safe locally and will sync when you're connected.

Avoid: "Error 500."

## Empty states

Empty states should explain what is missing and invite meaningful action.

Example:

> This language is waiting for its first Sovereign.
