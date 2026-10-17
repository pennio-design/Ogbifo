#!/usr/bin/env bash
# Builds ONE woff2 per face covering Latin, Latin Extended, Vietnamese-range
# letters, combining marks (tone marks, dot-below) and Naira, with all layout
# features kept. Do not split by script: a base letter and its tone mark in
# different files cannot attach, and Yorùbá renders wrongly.
#
# The brand faces lack Hausa ɓ ɗ ƙ ƴ, Igbo ṅ and Yorùbá ǹ. Noto is the fallback
# that supplies them (OFL licensed, see src/fonts/README.md).
#
# Usage: subset-fonts.sh <dir containing node_modules/@expo-google-fonts/...>
# Needs: pip install fonttools brotli; npm i @expo-google-fonts/{fraunces,space-grotesk,plus-jakarta-sans,noto-serif,noto-sans}
set -euo pipefail
SRC="${1:?pass the folder where the @expo-google-fonts packages are installed}/node_modules/@expo-google-fonts"
OUT="$(cd "$(dirname "$0")/.." && pwd)/src/fonts"
RANGE="U+0000-024F,U+0250-02AF,U+02B0-02FF,U+0300-036F,U+1E00-1EFF,U+2010-2027,U+2030-205E,U+20A6,U+20AC,U+2190-2193,U+2212"
face() { # family-dir face-dir file-stem out-name
  pyftsubset "$SRC/$1/$2/$3.ttf" --unicodes="$RANGE" --layout-features='*' --flavor=woff2 \
    --no-hinting --drop-tables+=DSIG --output-file="$OUT/$4.woff2"
}
face fraunces 400Regular Fraunces_400Regular fraunces-400
face fraunces 600SemiBold Fraunces_600SemiBold fraunces-600
face fraunces 600SemiBold_Italic Fraunces_600SemiBold_Italic fraunces-600-italic
for w in 400Regular:400 500Medium:500 600SemiBold:600; do
  face space-grotesk "${w%%:*}" "SpaceGrotesk_${w%%:*}" "space-grotesk-${w##*:}"
  face plus-jakarta-sans "${w%%:*}" "PlusJakartaSans_${w%%:*}" "plus-jakarta-sans-${w##*:}"
done
face noto-serif 400Regular NotoSerif_400Regular noto-serif-400
face noto-serif 600SemiBold NotoSerif_600SemiBold noto-serif-600
face noto-serif 600SemiBold_Italic NotoSerif_600SemiBold_Italic noto-serif-600-italic
for w in 400Regular:400 500Medium:500 600SemiBold:600; do
  face noto-sans "${w%%:*}" "NotoSans_${w%%:*}" "noto-sans-${w##*:}"
done

# Coverage guard: every Yorùbá, Igbo and Hausa letter must resolve in the brand
# face or its Noto fallback, within a single file.
python3 - "$OUT" <<'PY'
import sys, glob
from fontTools.ttLib import TTFont
need = set("ẹẸọỌṣṢàáèéìíòóùúǹńịỊụỤṅṄɓƁɗƊƙƘƴƳ") | {"\u0300", "\u0301", "\u0304"}
pairs = [("fraunces", "noto-serif"), ("space-grotesk", "noto-sans"), ("plus-jakarta-sans", "noto-sans")]
bad = False
for brand, fallback in pairs:
    for w in ("400", "600"):
        have = set()
        for fam in (brand, fallback):
            for f in glob.glob(f"{sys.argv[1]}/{fam}-{w}.woff2"):
                have |= {chr(c) for c in TTFont(f).getBestCmap()}
        missing = sorted(need - have)
        if missing:
            bad = True
            print(f"MISSING {brand}+{fallback} {w}: {missing}")
sys.exit(1 if bad else 0)
PY
echo "font coverage OK"
