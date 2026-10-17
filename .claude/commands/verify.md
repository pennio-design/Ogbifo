---
description: Run the project's checks and report honestly
---

Run lint, typecheck and the test suites that cover the changed files. Report the exact commands and results. If anything fails or was skipped, say so; do not describe it as passing.

Then confirm a Unicode round-trip for any text path touched: `Ogbifọ̀ Àmì Ẹ̀kọ́ ọ ẹ ṣ à á` must survive input, storage, sync and render unchanged.

For any change to the Reading Room, recording or reviewer tool, also run the browser checks in `apps/web/e2e` (`recording`, `annotation`, `community`; see the header of each file for the command), with the app built using `OGBIFO_ALLOW_UNREVIEWED=1`. They use a fake microphone and need a Chromium binary.
