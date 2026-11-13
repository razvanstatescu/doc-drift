#!/usr/bin/env bash
# Exact-time section fetch. yt-dlp --download-sections with stream copy snaps to a cluster/keyframe before the
# requested start (the files came back 45 s and 42 s long for 40 s and 32 s requests), so the source offset of
# each sample is unknown. Here ffmpeg seeks the stream URL with accurate seek (-ss before -i, then decodes), so
# sample 0 of each output is exactly at the requested source time. Audio is decoded to PCM (no extra lossy
# generation); video is re-encoded once at high quality for the cut.
# Usage: tools/plates/clips-fetch-exact.sh <download-root> <yt-dlp-python-path>
set -euo pipefail
ROOT="$1"; YTP="$2"
yt() { PYTHONPATH="$YTP" python3 -m yt_dlp --no-update --no-playlist --js-runtimes node "$@"; }
grab() { # name url vfmt afmt start end
  local name="$1" url="$2" vf="$3" af="$4" ss="$5" to="$6"
  local dir="$ROOT/$name-exact"; mkdir -p "$dir"
  local aurl vurl
  aurl=$(yt -f "$af" -g "$url" 2>/dev/null | tail -1)
  vurl=$(yt -f "$vf" -g "$url" 2>/dev/null | tail -1)
  ffmpeg -nostdin -hide_banner -loglevel error -y -ss "$ss" -to "$to" -i "$aurl" -map 0:a:0 -c:a pcm_s24le -ar 48000 "$dir/$name-audio.wav"
  ffmpeg -nostdin -hide_banner -loglevel error -y -ss "$ss" -to "$to" -i "$vurl" -map 0:v:0 -c:v libx264 -preset slow -crf 14 -pix_fmt yuv420p "$dir/$name-video.mp4"
  echo "$name: audio + video from $ss to $to"
}
[ -n "${SKIP_ARIEL:-}" ] || grab ariel  "https://www.youtube.com/watch?v=Rq98-audaEc" 137 251 965 1005   # 16:05-16:45
grab osmani "https://www.youtube.com/watch?v=zMM5zqesL1g" 137 251-9 820 852   # 13:40-14:12 (end of video 14:12.18). This video carries auto-dubbed tracks: 251-9 is the original English, non-DRC
# FOSDEM file: one MP4 with AAC mono 48 kHz; decode audio to PCM and re-encode video, both from 10:25.
F="https://video.fosdem.org/2025/k3401/fosdem-2025-6023-multiview-decoding-in-libavcodec-and-ffmpeg-cli.mp4"
mkdir -p "$ROOT/khirnov-exact"
ffmpeg -nostdin -hide_banner -loglevel error -y -ss 625 -to 660 -i "$F" -map 0:a:0 -c:a pcm_s24le -ar 48000 "$ROOT/khirnov-exact/khirnov-audio.wav"
ffmpeg -nostdin -hide_banner -loglevel error -y -ss 625 -to 660 -i "$F" -map 0:v:0 -c:v libx264 -preset slow -crf 14 -pix_fmt yuv420p "$ROOT/khirnov-exact/khirnov-video.mp4"
echo "khirnov: audio + video from 625 to 660"
