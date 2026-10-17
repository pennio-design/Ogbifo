---
description: Run the project's checks and report honestly
---

Run lint, typecheck and the test suites that cover the changed files (for `bench/` and `audit/`: `python -m pytest bench/tests`). Report the exact commands and results. If anything fails or was skipped, say so; do not describe it as passing.

Then confirm a Unicode round-trip for any text path touched: `Ogbifọ̀ Àmì Ẹ̀kọ́ ọ ẹ ṣ à á` must survive input, storage, sync and render unchanged.
