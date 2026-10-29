#!/usr/bin/env bash
# Render a template and master its audio: ONE gain measured on the full mix (lands at -14.5 LUFS) plus a limiter at about
# -2.4 dBFS (AAC adds ~1.5 dB of inter-sample overs). Video is copied untouched. Always deliver this file, never a silent cut.
#   npm run master -- <CompositionId> <out.mp4> [--target=-14.5] [--crf=18]
# Several versions of one video (e.g. with/without music) should share the SAME gain: master the full mix first, note the
# gain it prints, and pass --gain=<dB> to the others.
set -euo pipefail
cd "$(dirname "$0")/../.."
ID="${1:?usage: master.sh <CompositionId> <out.mp4> [--target=-14.5] [--crf=18] [--gain=dB]}"
OUT="${2:?usage: master.sh <CompositionId> <out.mp4>}"
shift 2
TARGET=-14.5; CRF=18; GAIN=""
for a in "$@"; do
  case "$a" in
    --target=*) TARGET="${a#*=}" ;;
    --crf=*) CRF="${a#*=}" ;;
    --gain=*) GAIN="${a#*=}" ;;
  esac
done
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
mkdir -p "$(dirname "$OUT")"
npx remotion render src/index.ts "$ID" "$TMP/raw.mp4" --codec=h264 --audio-codec=aac --crf="$CRF" --log=error
npx remotion render src/index.ts "$ID" "$TMP/mix.wav" --codec=wav --log=error
if [ -z "$GAIN" ]; then
  I=$(ffmpeg -nostats -i "$TMP/mix.wav" -af ebur128 -f null - 2>&1 | awk '/Summary/{s=1} s&&/I:/{print $2; exit}')
  GAIN=$(python3 -c "print(round($TARGET - ($I), 1))")
  echo "mix I=${I} LUFS -> gain ${GAIN} dB (target ${TARGET})"
fi
ffmpeg -loglevel error -y -i "$TMP/raw.mp4" -i "$TMP/mix.wav" -map 0:v -map 1:a -c:v copy \
  -af "volume=${GAIN}dB,alimiter=limit=0.76:attack=5:release=60:level=false" -c:a aac -b:a 192k -ar 48000 -shortest -movflags +faststart "$OUT"
echo "wrote $OUT (gain ${GAIN} dB)"
