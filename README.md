# Ogbifọ

Ogbifọ makes Yorùbá text correctly tone-marked, translated and verified, starting with songs, reels and films.

## Contents

- [`bench/`](bench/): the tone-restoration benchmark. It measures the model's error rate on lyrics, times verifiers line by line, and turns both into a cost per verified line. This is the Week 1 test in the project plan.
- [`CLAUDE.md`](CLAUDE.md) and [`docs/`](docs/): the product specification package for the Ogbifọ app (PRD, UX, data model, API, offline-first, verification, brand). Start with [`docs/PRODUCT_DECISIONS.md`](docs/PRODUCT_DECISIONS.md) and [`docs/OPEN_CONFLICTS.md`](docs/OPEN_CONFLICTS.md).
- [`audit/`](audit/): the yearly audit of Yorùbá lyrics online, plus the demand test. It draws a reproducible sample, generates the data-entry workbook, and reports headline numbers with confidence intervals (Workstream 1).
