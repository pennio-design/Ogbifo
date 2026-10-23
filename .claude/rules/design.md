# Design rules

- Palette: Clay `#121413`, Ochre `#D49B41`, Bone `#FAF9F6`, Charcoal `#1A1C1B`, Forest `#1B2E24`, Ash `#8A8D8A`, Card `#161817`. Define as tokens; no stray hex values in components.
- Fraunces for wordmark and language content. Space Grotesk for UI, labels, metadata. Plus Jakarta Sans for body.
- No gradients as decoration, glassmorphism, glow orbs, custom cursors, or card-on-card rounding.
- Motion is restrained; honor `prefers-reduced-motion: reduce` with a static fallback.
- Mobile first: no horizontal overflow, thumb-reachable controls.
- Royal Seal: use `docs/brand/royal-seal.svg` exactly (single loop, `currentColor` spokes). Do not redraw it or add a second loop.
