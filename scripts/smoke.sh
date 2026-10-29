#!/usr/bin/env bash
# Smoke test of the whole toolchain on this machine. Exit code 0 = ready to make videos.
#   scripts/smoke.sh            typecheck + tests + audio + short render of every template + ffprobe checks (~5 min)
#   scripts/smoke.sh --quick    typecheck + audio + one still per template (~1 min)
#   scripts/smoke.sh --tour     also capture + lint + render the screen tour and add audio (needs network + Playwright Chromium)
# Uses the placeholder voice, so it needs no API key and spends nothing.
set -uo pipefail
cd "$(dirname "$0")/.."
QUICK=0; TOUR=0
for a in "$@"; do [ "$a" = "--quick" ] && QUICK=1; [ "$a" = "--tour" ] && TOUR=1; done
OUT="$PWD/templates/out/smoke"; mkdir -p "$OUT"
FAILS=0
ok()   { printf '  ok    %s\n' "$1"; }
fail() { printf '  FAIL  %s\n' "$1"; FAILS=$((FAILS+1)); }
step() { printf '\n== %s\n' "$1"; }
check() { local name="$1"; shift; if "$@" >"$OUT/last.log" 2>&1; then ok "$name"; else fail "$name (see $OUT/last.log)"; tail -15 "$OUT/last.log"; fi; }

step "tools"
for t in node npm ffmpeg ffprobe python3; do command -v "$t" >/dev/null && ok "$t $($t --version 2>&1 | head -1)" || fail "$t missing"; done
[ -d node_modules ] && ok "node_modules" || fail "run npm install first"
if command -v rhubarb >/dev/null || [ -n "${RHUBARB:-}" ]; then ok "rhubarb found (lip-sync)"; else echo "  note  rhubarb not found: sketch lip-sync falls back to uniform (docs/RHUBARB.md)"; fi
[ "$FAILS" -gt 0 ] && { echo; echo "SMOKE FAILED: fix the tools first"; exit 1; }

step "typecheck (all workspaces)"
check "tsc" npm run typecheck --silent
if [ "$QUICK" = 0 ]; then
  step "tests"
  check "character-kit tests" npm test --silent -w @eliseo-arevalo/character-kit
fi

step "audio (placeholder voice)"
( cd templates && check "audio all --voice=placeholder" node scripts/audio/build.mjs all --voice=placeholder --lipsync=uniform )

step "renders with audio"
cd templates
for id in PromoVertical ReelProblemSolution SketchCharacters EndCardDemo; do
  if [ "$QUICK" = 1 ]; then
    check "still $id" npx remotion still src/index.ts "$id" "$OUT/$id.png" --frame=60 --log=error
  else
    f="$OUT/$id.mp4"
    check "render $id (frames 0-89)" npx remotion render src/index.ts "$id" "$f" --frames=0-89 --codec=h264 --audio-codec=aac --log=error
    info=$(ffprobe -v error -show_entries stream=codec_type,codec_name,width,height -of csv=p=0 "$f" 2>/dev/null)
    if echo "$info" | grep -q "^h264,video,1080,1920" && echo "$info" | grep -q "^aac,audio"; then ok "ffprobe $id: h264 1080x1920 + aac"; else fail "ffprobe $id: expected h264 1080x1920 and an aac stream, got: $info"; fi
  fi
done
cd ..

if [ "$TOUR" = 1 ]; then
  step "screen tour"
  ( cd examples/demo-usability
    check "capture" npm run capture --silent
    check "lint" npm run lint --silent
    check "render" npm run render --silent -- --out="$OUT/tour-silent.mp4" )
  if [ -f "$OUT/tour-silent.mp4" ]; then
    check "add audio" bash templates/scripts/audio/add-audio.sh "$OUT/tour-silent.mp4" "$OUT/tour.mp4"
    ffprobe -v error -select_streams a -show_entries stream=codec_name -of csv=p=0 "$OUT/tour.mp4" 2>/dev/null | grep -q aac && ok "ffprobe tour: aac" || fail "tour has no audio"
  fi
fi

echo
if [ "$FAILS" = 0 ]; then echo "SMOKE OK (outputs in $OUT)"; else echo "SMOKE FAILED: $FAILS check(s)"; exit 1; fi
