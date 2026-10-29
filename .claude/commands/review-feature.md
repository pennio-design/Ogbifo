---
description: Review a feature against the Ogbifọ definition of done
argument-hint: <branch, path or feature>
---

Review: $ARGUMENTS

Check against `CLAUDE.md` "Definition of done" and report each item as pass, fail or not applicable, with file references:

- loading, empty, error and offline states
- accessibility and keyboard interaction
- mobile layout without horizontal overflow
- business-logic tests exist and pass
- terminology matches CLAUDE.md
- brand: palette, type roles, no gradients or glassmorphism, reduced motion respected
- orthography: tone marks and dot-belows preserved end to end; `originalText` never overwritten
- copy: no "Post", "Like", "Followers"; scores framed as guidance
- anything that silently resolves an item in `docs/OPEN_CONFLICTS.md`
