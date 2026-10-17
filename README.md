# Ogbifọ

Ogbifọ is a consumer language and cultural archive/interpreter product for Yorùbá: a Reading Room for learning and interpretation, and a community Archive for preservation. See [`docs/PRODUCT_DECISIONS.md`](docs/PRODUCT_DECISIONS.md).

## Contents

- [`CLAUDE.md`](CLAUDE.md) and [`docs/`](docs/): the product specification package for the Ogbifọ app (PRD, UX, data model, API, offline-first, verification, brand). Start with [`docs/PRODUCT_DECISIONS.md`](docs/PRODUCT_DECISIONS.md) and [`docs/OPEN_CONFLICTS.md`](docs/OPEN_CONFLICTS.md).
- [`apps/web/`](apps/web/): the Ogbifọ web app (Next.js).
- [`packages/`](packages/): `domain` (entities, services, repositories, SQL migrations), `ui` (design tokens, Royal Seal, components), `speech` (syllable rules, pitch tracking, alignment and the Tone and Rhythm scoring core), `config` (shared TypeScript config).

## Develop

```
npm install
npm run dev         # http://localhost:3000
npm test            # domain + ui tests (includes SQL migrations run in embedded Postgres)
npm run typecheck
npm run lint
npm run build
```

Developer seed Cards are unreviewed, so they show only under `next dev` or with `OGBIFO_ALLOW_UNREVIEWED=1` (see `apps/web/.env.example`). A production build without the flag shows no Cards, by design (D-012).

Browser checks for the recording flow and the reviewer tool are in `apps/web/e2e` (`npm run e2e`, `e2e:annotate` and `e2e:community` in `apps/web`; they need a running app and a Chromium binary, see each file's header). `OGBIFO_ENABLE_REVIEWER_TOOLS=1` switches on `/reviewer/annotate`; `NEXT_PUBLIC_SHOW_RESONANCE_NUMBER=1` shows the score number in Live. Sign-in is by emailed link; with `OGBIFO_DEV_EMAIL=1` on a localhost site the sign-in page shows the link instead of emailing it, and without a configured email provider sign-in stays closed (see `apps/web/.env.example`).
