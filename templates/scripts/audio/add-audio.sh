#!/usr/bin/env bash
# Add a music bed and optional voice lines to a video that has none (for example a screen-kit tour).
#   scripts/audio/add-audio.sh <in.mp4> <out.mp4> [--music=bed.wav] [--vo=line.wav@2.5 ...] [--target=-14.5]
# Music defaults to a synthetic bed (see docs/AUDIO.md). `--vo=file@seconds` places a voice line at that time; music is ducked under it.
set -euo pipefail
IN="${1:?usage: add-audio.sh <in.mp4> <out.mp4> [--music=…] [--vo=file@sec …]}"
OUT="${2:?usage: add-audio.sh <in.mp4> <out.mp4>}"
shift 2
MUSIC=""; TARGET=-14.5; VOS=()
for a in "$@"; do
  case "$a" in
    --music=*) MUSIC="${a#*=}" ;;
    --target=*) TARGET="${a#*=}" ;;
    --vo=*) VOS+=("${a#*=}") ;;
  esac
done
DUR=$(ffprobe -v error -show_entries format=duration -of csv=p=0 "$IN")
HERE="$(cd "$(dirname "$0")" && pwd)"
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
if [ -z "$MUSIC" ]; then
  node -e "import('$HERE/synth.mjs').then(m=>m.synthMusic(Math.ceil($DUR)+1,'$TMP/bed.wav'))"
  MUSIC="$TMP/bed.wav"
fi
INPUTS=(-i "$IN" -stream_loop -1 -i "$MUSIC")
FILTER="[1:a]atrim=0:${DUR},asetpts=PTS-STARTPTS,volume=0.8[bed]"
MIX="[bed]"; N=0
for v in "${VOS[@]:-}"; do
  [ -z "$v" ] && continue
  F="${v%@*}"; AT="${v#*@}"; N=$((N+1))
  INPUTS+=(-i "$F")
  MS=$(python3 -c "print(int(float('$AT')*1000))")
  FILTER="$FILTER;[$((N+1)):a]adelay=${MS}|${MS}[v$N]"
  MIX="$MIX[v$N]"
done
if [ "$N" -gt 0 ]; then
  VOMIX=""; for i in $(seq 1 $N); do VOMIX="$VOMIX[v$i]"; done
  # Duck the bed under the voice (sidechain), then mix.
  FILTER="$FILTER;${VOMIX}amix=inputs=$N:normalize=0[vo];[vo]asplit[vo1][vo2];[bed][vo1]sidechaincompress=threshold=0.03:ratio=8:attack=20:release=400[duck];[duck][vo2]amix=inputs=2:normalize=0[mix]"
else
  FILTER="$FILTER;[bed]anull[mix]"
fi
ffmpeg -loglevel error -y "${INPUTS[@]}" -filter_complex "$FILTER" -map 0:v -map "[mix]" -c:v copy -t "$DUR" "$TMP/pre.mp4"
ffmpeg -loglevel error -y -i "$TMP/pre.mp4" -vn -f wav "$TMP/pre.wav"
I=$(ffmpeg -nostats -i "$TMP/pre.wav" -af ebur128 -f null - 2>&1 | awk '/Summary/{s=1} s&&/I:/{print $2; exit}')
GAIN=$(python3 -c "print(round($TARGET - ($I), 1))")
ffmpeg -loglevel error -y -i "$TMP/pre.mp4" -map 0:v -map 0:a -c:v copy -af "volume=${GAIN}dB,alimiter=limit=0.76:attack=5:release=60:level=false" -c:a aac -b:a 192k -ar 48000 -movflags +faststart "$OUT"
echo "wrote $OUT (gain ${GAIN} dB)"
