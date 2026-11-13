#!/usr/bin/env bash
# Downloads only a section around each candidate voice line (audio + matching video), each into its own empty folder.
# Usage: tools/plates/clips-fetch.sh <download-root> [<yt-dlp-python-path>]
# The system yt-dlp (2026.02.21) only saw a 360p muxed format (SABR); a current yt-dlp in a scratch folder
# (pip install --target <dir> "yt-dlp[default]") sees the DASH formats. Pass that folder as $2.
set -euo pipefail
ROOT="$1"; YTP="${2:-}"
yt() { if [ -n "$YTP" ]; then PYTHONPATH="$YTP" python3 -m yt_dlp "$@"; else yt-dlp "$@"; fi; }
mkdir -p "$ROOT/ariel" "$ROOT/osmani" "$ROOT/khirnov"
# Mikey Ariel, "Docs or it didn't happen!", foss-north 2019. Line at about 16:22.5-16:27.5.
yt --no-update --no-playlist --js-runtimes node -f "137+251/bv*[height<=1080]+ba" \
  --download-sections "*16:05-16:45" --merge-output-format mkv \
  -o "$ROOT/ariel/ariel-1605-1645.%(ext)s" "https://www.youtube.com/watch?v=Rq98-audaEc"
# Addy Osmani, "Stop Wasting Tokens: The Art of Context Engineering". Line at about 13:55-13:59.5.
yt --no-update --no-playlist --js-runtimes node -f "bv*[height<=1080]+251/bv*[height<=1080]+ba" \
  --download-sections "*13:40-14:12" --merge-output-format mkv \
  -o "$ROOT/osmani/osmani-1340-1412.%(ext)s" "https://www.youtube.com/watch?v=zMM5zqesL1g"
# Anton Khirnov, FOSDEM 2025 (direct file). Line at about 10:39-10:48.
ffmpeg -nostdin -hide_banner -loglevel warning -y -ss 10:25 -to 11:00 \
  -i "https://video.fosdem.org/2025/k3401/fosdem-2025-6023-multiview-decoding-in-libavcodec-and-ffmpeg-cli.mp4" \
  -c copy "$ROOT/khirnov/khirnov-1025-1100.mkv"
echo done
