#!/usr/bin/env bash
# Compose a labeled side-by-side BEFORE/AFTER comparison image.
# Usage: compose.sh <before.png> <after.png> <title> <out.png>
set -euo pipefail

BEFORE="${1:?usage: compose.sh <before.png> <after.png> <title> <out.png>}"
AFTER="${2:?missing after.png}"
TITLE="${3:?missing title}"
OUT="${4:?missing out.png}"

BEFORE_ABS="$(cd "$(dirname "$BEFORE")" && pwd)/$(basename "$BEFORE")"
AFTER_ABS="$(cd "$(dirname "$AFTER")" && pwd)/$(basename "$AFTER")"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

cat > "$TMP/compose.html" <<EOF
<!doctype html><html><head><meta charset="utf-8"><style>
  * { margin:0; box-sizing:border-box; }
  body { background:#0f1117; font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif; padding:28px; }
  h1 { color:#e8eaf0; font-size:22px; font-weight:700; letter-spacing:-.01em; margin-bottom:18px; }
  .row { display:flex; gap:24px; align-items:flex-start; }
  .col { flex:1; min-width:0; }
  .chip { display:inline-block; font-size:13px; font-weight:800; letter-spacing:.12em;
          padding:6px 14px; border-radius:999px; margin-bottom:10px; color:#fff; }
  .before .chip { background:#dc2626; }
  .after  .chip { background:#16a34a; }
  img { width:100%; display:block; border-radius:8px; box-shadow:0 8px 32px rgba(0,0,0,.5); }
</style></head><body>
  <h1>$TITLE</h1>
  <div class="row">
    <div class="col before"><span class="chip">BEFORE</span><img src="file://$BEFORE_ABS"></div>
    <div class="col after"><span class="chip">AFTER</span><img src="file://$AFTER_ABS"></div>
  </div>
</body></html>
EOF

PW="${PLAYWRIGHT_BIN:-playwright}"
"$PW" screenshot --browser=chromium --viewport-size=2200,1000 --full-page \
  --wait-for-timeout=800 "file://$TMP/compose.html" "$OUT"
echo "composed: $OUT"
