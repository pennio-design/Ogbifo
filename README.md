# Ogbifọ

Ogbifọ is a consumer language and cultural archive/interpreter product for African languages: a Reading Room for learning and interpretation, and a community Archive for preservation. See [`docs/PRODUCT_DECISIONS.md`](docs/PRODUCT_DECISIONS.md).

`bench/` and `audit/` below are a separate project (Yorùbá tone restoration for lyrics, reels and films) that lives in this repository for now. They do not drive Ogbifọ's roadmap.

## Contents

- [`bench/`](bench/): the tone-restoration benchmark. It measures the model's error rate on lyrics, times verifiers line by line, and turns both into a cost per verified line. This is the Week 1 test in the project plan.
- [`CLAUDE.md`](CLAUDE.md) and [`docs/`](docs/): the product specification package for the Ogbifọ app (PRD, UX, data model, API, offline-first, verification, brand). Start with [`docs/PRODUCT_DECISIONS.md`](docs/PRODUCT_DECISIONS.md) and [`docs/OPEN_CONFLICTS.md`](docs/OPEN_CONFLICTS.md).
- [`apps/web/`](apps/web/): the Ogbifọ web app (Next.js).
- [`packages/`](packages/): `domain` (entities, services, repositories, SQL migrations), `ui` (design tokens, Royal Seal, components), `config` (shared TypeScript config).
- [`audit/`](audit/): the yearly audit of Yorùbá lyrics online, plus the demand test. It draws a reproducible sample, generates the data-entry workbook, and reports headline numbers with confidence intervals (Workstream 1).

## Develop

```
npm install
npm run dev         # http://localhost:3000
npm test            # domain + ui tests (includes SQL migrations run in embedded Postgres)
npm run typecheck
npm run lint
npm run build
```
