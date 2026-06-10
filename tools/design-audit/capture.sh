#!/usr/bin/env bash
# Capture design-audit screenshots of a URL or local HTML file.
# Usage: capture.sh <url-or-file> <outdir> <name>
# Produces <outdir>/<name>-hero.png (1440x900 viewport crop),
#          <outdir>/<name>-full.png (1440 full page),
#          <outdir>/<name>-mobile.png (390x844 full page).
set -euo pipefail

TARGET="${1:?usage: capture.sh <url-or-file> <outdir> <name>}"
OUTDIR="${2:?missing outdir}"
NAME="${3:?missing name}"

if [[ -f "$TARGET" ]]; then
  TARGET="file://$(cd "$(dirname "$TARGET")" && pwd)/$(basename "$TARGET")"
fi

mkdir -p "$OUTDIR"
PW="${PLAYWRIGHT_BIN:-playwright}"

"$PW" screenshot --browser=chromium --viewport-size=1440,900 \
  --wait-for-timeout=1500 "$TARGET" "$OUTDIR/$NAME-hero.png"
"$PW" screenshot --browser=chromium --viewport-size=1440,900 --full-page \
  --wait-for-timeout=1500 "$TARGET" "$OUTDIR/$NAME-full.png"
"$PW" screenshot --browser=chromium --viewport-size=390,844 --full-page \
  --wait-for-timeout=1500 --device="iPhone 13" "$TARGET" "$OUTDIR/$NAME-mobile.png" 2>/dev/null || \
"$PW" screenshot --browser=chromium --viewport-size=390,844 --full-page \
  --wait-for-timeout=1500 "$TARGET" "$OUTDIR/$NAME-mobile.png"

echo "captured: $OUTDIR/$NAME-{hero,full,mobile}.png"
