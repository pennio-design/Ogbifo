# Ogbifọ — Community Verification System

## Purpose

Language knowledge should not be validated exclusively by an algorithm. Community members must be able to participate in establishing whether submitted material is appropriate and accurate.

## States

`pending_review`, `peer_verified`, `flagged`, `rejected`

## Default threshold

MVP: **5 peer confirmations**.

## Rules

- A user cannot confirm their own contribution.
- A user may confirm a contribution only once.
- Confirmation must be idempotent.
- A contribution becomes `peer_verified` when the configured threshold is reached.

## Future

Verification may eventually incorporate: trusted speaker status, dialect expertise, geographic/community context, curator review, multiple independent confirmations.

Do not implement these until requirements are explicitly defined.

## What verification is not

Verification supports community trust and archive quality. It is not dataset certification, and `peer_verified` must never be exported or described as gold or certified.

## Trust principle

Verification is not a popularity metric. Five confirmations should not imply universal linguistic truth. It means the submission has passed the platform's current community-verification threshold.

> Known weakness: no sybil resistance, and no rule for who may confirm. See `OPEN_CONFLICTS.md` #4.
