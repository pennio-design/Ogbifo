# Ogbifọ — Brand System

## Brand idea

The Ogbifọ was historically positioned between sovereign courts and foreign delegates and possessed dual literacy: not merely vocabulary, but the ability to reconcile different realities. The digital product inherits this role.

## Royal Seal

The seal represents: protection, convergence, interpretation, speech, trust, continuity.

The brand system describes the radial waveform as replacing a rigid static boundary and balancing classical protection with active telemetry.

### Geometry

The seal uses a 100 × 100 construction grid. Components:

1. radial waveform (16 rounded spokes, stroke 3, `currentColor`)
2. one ochre loop (stroke 4.5, `#D49B41`)
3. central fulcrum (r = 5, `#D49B41`)

The seal is a single loop (`PRODUCT_DECISIONS.md` D-007). Canonical file: [`brand/royal-seal.svg`](brand/royal-seal.svg). Spokes use `currentColor`: Bone on Clay, Clay on Bone. The loop and fulcrum are always Ochre.

**Proposed meaning (unconfirmed):** the waveform is the voice; the loop is the passage meaning moves through; the fulcrum is the Ogbifọ, the trusted center. This replaces the retired two-domains reading.

Production SVG:

```svg
<svg viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
  <g stroke="currentColor" stroke-width="3" stroke-linecap="round">
    <line x1="83" y1="50" x2="88" y2="50" />
    <line x1="80.5" y1="61.5" x2="85" y2="63" />
    <line x1="72.5" y1="72.5" x2="77.5" y2="77.5" />
    <line x1="61.5" y1="80.5" x2="63" y2="85" />
    <line x1="50" y1="83" x2="50" y2="88" />
    <line x1="38.5" y1="80.5" x2="37" y2="85" />
    <line x1="27.5" y1="72.5" x2="22.5" y2="77.5" />
    <line x1="19.5" y1="61.5" x2="15" y2="63" />
    <line x1="17" y1="50" x2="12" y2="50" />
    <line x1="19.5" y1="38.5" x2="15" y2="37" />
    <line x1="27.5" y1="27.5" x2="22.5" y2="22.5" />
    <line x1="38.5" y1="19.5" x2="37" y2="15" />
    <line x1="50" y1="17" x2="50" y2="12" />
    <line x1="61.5" y1="19.5" x2="63" y2="15" />
    <line x1="72.5" y1="27.5" x2="77.5" y2="22.5" />
    <line x1="80.5" y1="38.5" x2="85" y2="37" />
  </g>
  <path d="M 32 50 C 32 36, 68 36, 68 50 C 68 64, 32 64, 32 50 Z" stroke="#D49B41" stroke-width="4.5"/>
  <circle cx="50" cy="50" r="5" fill="#D49B41"/>
</svg>
```

## Colors

| Token | Hex |
|---|---|
| Clay | `#121413` |
| Ochre | `#D49B41` |
| Bone | `#FAF9F6` |
| Charcoal | `#1A1C1B` |
| Forest | `#1B2E24` |
| Ash | `#8A8D8A` |
| Card | `#161817` |

## Typography

- **Fraunces** — Ogbifọ wordmark, editorial headlines, quotations in English.
- **Noto Serif** — language artifacts (Card text, Archive entries, any Yorùbá, Igbo or Hausa passage). Deviation from the original guidelines, which assigned this role to Fraunces: see `OPEN_CONFLICTS.md` #11. Noto Sans is the fallback for missing glyphs.
- **Space Grotesk** — controls, metadata, labels, telemetry, navigation.
- **Plus Jakarta Sans** — body copy, descriptions, supporting interface text.

Every face must render tone marks and dot-belows without clipping. Verify with: `Ogbifọ̀ Àmì Ẹ̀kọ́ ọ ẹ ṣ à á` and with stacked marks such as `fẹ́ gbọdọ̀`.

Measured, Sprint 1 (Chromium): Fraunces and Space Grotesk detach and shift a tone mark stacked on a dot-below letter. Noto Serif and Plus Jakarta Sans stack correctly. None of Fraunces, Space Grotesk or Plus Jakarta Sans contains Hausa `ɓ ɗ ƙ ƴ`; Noto supplies them. Fraunces also lacks `ṅ` and `ǹ`.

## Motion

Motion should feel organic, restrained, rhythmic, alive. The seal may pulse in response to speech. Avoid excessive animation.

Respect `@media (prefers-reduced-motion: reduce)`.
