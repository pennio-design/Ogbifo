# Ogbifọ — Accessibility

**Status: stub.** Requirements already stated elsewhere, collected here (`PRD.md` §5, `BRAND_SYSTEM.md`, `CLAUDE.md`):

- Keyboard navigation for every interactive control.
- Semantic HTML controls; visible focus.
- Sufficient contrast (verified in `packages/ui/test/tokens.test.ts`: Bone, Ash and Ochre on Clay and Card, and Clay on Ochre, all pass WCAG AA for normal text).
- Screen-reader labels, including for the recording state machine and the waveform.
- Reduced-motion mode: respect `prefers-reduced-motion: reduce`; the seal pulse must have a static fallback.

Built in Sprint 2 and checked in Chromium: skip link; mode switch as pressed buttons; progress as a labelled progressbar plus a polite live region announcing "Card n of N"; Left and Right arrow keys move between Cards (ignored inside form fields); 48px minimum touch targets; the disabled Record control is announced as unavailable. Not yet checked: a screen reader pass, and 200% zoom.

Built in Sprint 3 part 2, checked in Chromium only: recorder states announced in a polite live region; the contour chart has a text alternative and every syllable marker is stated in words, not colour alone; the annotation tool's boundaries can be set from a keyboard-accessible table as well as by dragging; the stop and cancel controls are real buttons with 48px targets. Not yet checked: any screen reader, 200% zoom, and reduced-motion (nothing animates yet).

To define: target conformance level (suggest WCAG 2.2 AA), a screen-reader strategy for tone-marked text (pronunciation of Yorùbá by default TTS is poor, so do not rely on it), non-audio alternatives for the Reading Room, and captions for any audio/video artifact.
