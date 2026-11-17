#!/usr/bin/env bash
# Master render for the Doc Drift Sentinel film (adapted from Satchel's marketing/tools/render-master.sh).
#
#   bash tools/render-master.sh v1          -> out/doc-drift-v1.mp4
#
# What it does: typecheck; render A0 (the cold open: the WebGL barrage needs --gl=angle) and Body (everything after A0,
# rendered WITHOUT --gl=angle, which changes edge anti-aliasing in DOM scenes); join them frame- and sample-exact
# (video stream-copied, audio decoded per part); then a fixed gain and a 4x-oversampled peak limiter to -14 LUFS / -1.5 dBTP,
# AAC 320k, faststart; then the WCAG 2.3.1 flash screen on the A0 part.
#
# Environment:
#   PORT=3500         bundle server port (3500-3599; never 3000)
#   SINGLE=1          render Main in one pass instead (with --gl=angle, since A0 needs it), then master it
#   SKIP_RENDER=1     reuse out/doc-drift-<tag>-a0.mp4 and -body.mp4, only join and master again
#   FRAMES=0-59       pass --frames to every render (a short test; each part renders that range of itself)
#   CONCURRENCY=8     browser tabs per render
#   NAME=doc-drift    output name prefix
# Only the director runs full renders (BRIEF section 4).
set -euo pipefail

# Node 24 only (Forge-era nvm default is 22). nvm.sh is not safe under `set -u`, so relax it while it loads.
if [[ -s "$HOME/.nvm/nvm.sh" ]]; then
  set +u
  # shellcheck disable=SC1091
  source "$HOME/.nvm/nvm.sh"
  nvm use 24 >/dev/null
  set -u
fi

TAG="${1:?usage: bash tools/render-master.sh <tag>}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)" # video/
cd "$ROOT"

NAME="${NAME:-doc-drift}"
PORT="${PORT:-3500}"
CONCURRENCY="${CONCURRENCY:-8}"
OUTDIR="$ROOT/out"
mkdir -p "$OUTDIR"
RAW="$OUTDIR/$NAME-$TAG-raw.mp4"
OUT="$OUTDIR/$NAME-$TAG.mp4"
A0RAW="$OUTDIR/$NAME-$TAG-a0.mp4"
BODYRAW="$OUTDIR/$NAME-$TAG-body.mp4"
LIST="$OUTDIR/$NAME-$TAG-parts.txt"
VCAT="$OUTDIR/$NAME-$TAG-video.mp4"
ENTRY="src/index.ts"
FPS=30

# --enforce-audio-track: a part with no sound yet (A0 before its bed exists) still gets a silent track to join.
RENDER_FLAGS=(--codec=h264 --crf=16 --x264-preset=slow --color-space=bt709 --audio-codec=aac --audio-bitrate=320k
  --enforce-audio-track --concurrency="$CONCURRENCY" --port="$PORT")
if [[ -n "${FRAMES:-}" ]]; then RENDER_FLAGS+=(--frames="$FRAMES"); fi

echo "== typecheck"
npx tsc --noEmit

# v5 (D41) has no A0 and no WebGL: render Main in one pass, without --gl=angle (DOM anti-aliasing throughout).
if ! grep -q '"id": "A0"' src/data/timeline.json; then NOGL=1; fi
if [[ -n "${NOGL:-}" ]]; then
  echo "== render Main in one pass (no --gl=angle)"
  npx remotion render "$ENTRY" Main "$RAW" "${RENDER_FLAGS[@]}"
elif [[ -n "${SINGLE:-}" ]]; then
  echo "== render Main in one pass"
  npx remotion render "$ENTRY" Main "$RAW" "${RENDER_FLAGS[@]}" --gl=angle
else
  if [[ -z "${SKIP_RENDER:-}" ]]; then
    echo "== render A0 (--gl=angle)"
    npx remotion render "$ENTRY" A0 "$A0RAW" "${RENDER_FLAGS[@]}" --gl=angle
    echo "== render Body"
    npx remotion render "$ENTRY" Body "$BODYRAW" "${RENDER_FLAGS[@]}"
  fi
  [[ -f "$A0RAW" && -f "$BODYRAW" ]] || { echo "ERROR: missing $A0RAW or $BODYRAW"; exit 1; }

  echo "== join"
  # A0's exact length from its frame count: its AAC track runs past the last frame (padding to whole AAC frames), so
  # both the concat list and the audio trim use the picture's length, not the file's.
  A0DUR=$(ffprobe -v error -select_streams v:0 -count_packets -show_entries stream=nb_read_packets -of csv=p=0 "$A0RAW" |
    python3 -I -c "import sys; print(int(sys.stdin.read().strip().rstrip(',')) / $FPS)")
  printf "file '%s'\nduration %s\nfile '%s'\n" "$A0RAW" "$A0DUR" "$BODYRAW" >"$LIST"
  ffmpeg -v error -y -f concat -safe 0 -i "$LIST" -map 0:v -c:v copy "$VCAT"
  # The concat demuxer drops the first part's edit list, so the joined video's first frame sits at its B-frame delay
  # while decoded audio starts at 0. Re-reading the joined video as a file drops that offset (Satchel QA v5, N1); the
  # check below fails the build if picture and sound would not start together.
  ffmpeg -v error -y -i "$VCAT" -i "$A0RAW" -i "$BODYRAW" \
    -filter_complex "[1:a]aresample=48000,atrim=end=${A0DUR},asetpts=PTS-STARTPTS[a1];[2:a]aresample=48000[a2];[a1][a2]concat=n=2:v=0:a=1[a]" \
    -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 320k "$RAW"
  V0=$(ffprobe -v error -select_streams v:0 -show_entries frame=pts_time -read_intervals %+#1 -of default=nw=1:nk=1 "$RAW" | head -1 | tr -d ', ')
  python3 -I -c "import sys; sys.exit(0 if abs(float('$V0')) < 0.001 else 1)" ||
    { echo "ERROR: the joined video starts at ${V0} s, not 0: sound and picture would be out of sync"; exit 1; }
  rm -f "$VCAT" "$LIST"
fi

echo "== master: linear gain + 4x-oversampled peak limiter to -14 LUFS, true peak at most -1.5 dBTP after AAC"
# v4 QA (2026-11-16): the old pre-limiter + loudnorm chain could not apply its gain linearly (the limiter's inter-sample
# overs left too little headroom), so loudnorm fell back to dynamic mode: it rode the gain 3 to 6 dB and the AAC encode
# overshot to -0.76 dBTP. Now: one fixed gain, then a limiter run at 192 kHz (so it catches inter-sample peaks), at
# -2.5 dBFS; measured after the AAC encode, with one correction pass if the loudness misses -14 by more than 0.15 LU.
LIMIT="0.75"
measure() { ffmpeg -hide_banner -i "$1" -af ebur128=peak=true -f null - 2>&1 | python3 -I -c "
import sys,re
t=sys.stdin.read().split('Summary:')[-1]
i=re.search(r'I:\s+(-?[0-9.]+|-inf) LUFS',t); p=re.search(r'Peak:\s+(-?[0-9.]+|-inf) dBFS',t)
print(i.group(1) if i else '-inf', p.group(1) if p else '-inf')"; }
master() { ffmpeg -v error -y -i "$RAW" -c:v copy \
    -af "volume=${1}dB,aresample=192000,alimiter=limit=${LIMIT}:attack=2:release=80:level=disabled,aresample=48000" \
    -c:a aac -b:a 320k -movflags +faststart "$OUT"; }
read -r I0 TP0 < <(measure "$RAW")
echo "raw mix: I=${I0} LUFS, true peak ${TP0} dBTP"
if [[ "$I0" == "-inf" ]]; then
  # A silent render (no voice or score yet): nothing to measure, so keep the audio as it is.
  echo "WARNING: the mix is silent; skipping the master"
  ffmpeg -v error -y -i "$RAW" -c copy -movflags +faststart "$OUT"
else
  G=$(python3 -I -c "print(round(-14 - (${I0}) + 0.8, 2))") # +0.8: what the limiter takes back (v4 measure)
  master "$G"
  read -r I1 TP1 < <(measure "$OUT")
  echo "pass 1: gain ${G} dB -> I=${I1} LUFS, true peak ${TP1} dBTP"
  if python3 -I -c "import sys; sys.exit(0 if abs(-14 - (${I1})) > 0.15 else 1)"; then
    G=$(python3 -I -c "print(round(${G} + (-14 - (${I1})), 2))")
    master "$G"
    read -r I1 TP1 < <(measure "$OUT")
    echo "pass 2: gain ${G} dB -> I=${I1} LUFS, true peak ${TP1} dBTP"
  fi
  python3 -I -c "import sys; sys.exit(0 if (${TP1}) <= -1.0 else 1)" || echo "WARNING: true peak ${TP1} dBTP is above -1 dBTP"
fi

FLASH_SRC="$OUT" # the whole master (v4 QA: the body has transitions too, not only A0)
if [[ -f "$FLASH_SRC" ]]; then
  echo "== flash screen (WCAG 2.3.1) on $(basename "$FLASH_SRC")"
  python3 -I "$ROOT/tools/qa/flashcheck.py" "$FLASH_SRC" || echo "WARNING: failed the flash screen (WCAG 2.3.1)"
fi
ls -la "$OUT"
