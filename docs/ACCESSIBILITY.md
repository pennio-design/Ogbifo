# Ogbifọ — Accessibility

**Status: stub.** Requirements already stated elsewhere, collected here (`PRD.md` §5, `BRAND_SYSTEM.md`, `CLAUDE.md`):

- Keyboard navigation for every interactive control.
- Semantic HTML controls; visible focus.
- Sufficient contrast (verify Ash `#8A8D8A` on Clay `#121413` for body-size text before using it for anything but metadata).
- Screen-reader labels, including for the recording state machine and the waveform.
- Reduced-motion mode: respect `prefers-reduced-motion: reduce`; the seal pulse must have a static fallback.

To define: target conformance level (suggest WCAG 2.2 AA), a screen-reader strategy for tone-marked text (pronunciation of Yorùbá by default TTS is poor, so do not rely on it), non-audio alternatives for the Reading Room, and captions for any audio/video artifact.
