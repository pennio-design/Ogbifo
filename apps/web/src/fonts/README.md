# Fonts

Subsetted from Google Fonts static TTFs (SIL Open Font License 1.1):
Fraunces, Space Grotesk, Plus Jakarta Sans, and Noto Serif / Noto Sans as the fallback.

Each face is one woff2 holding Latin, Latin Extended, combining marks and Naira. Do not split by script:
a base letter and its tone mark in different files cannot attach, and Yorùbá renders wrongly.

Fraunces lacks Yorùbá ǹ and the combining dot-below. Noto supplies them as a fallback.

Rebuild with `scripts/subset-fonts.sh` (it also checks coverage). Copyright notices are in each family's
upstream repository: undercasetype/Fraunces, floriankarsten/space-grotesk, tokotype/PlusJakartaSans, notofonts.
