#!/usr/bin/env python3
"""Amber gate (V4.md section 3, L4), ported from R1's accent.py (out/research-v4/r1/scripts/).

Samples the video at 1 fps (--fps), 384x216 RGB, the way R1 did (ffmpeg JPEG frames read with PIL; `--method raw`
reads the decode directly, which counts a few more small amber areas: v3 24 of 142 raw against R1's 18 of 142), and
counts a second as AMBER when pixels near the beacon (#FFB224:
|R-255| < 35, |G-178| < 40, |B-36| < 50, R1's box) cover 0.05% or more of the frame. It prints the share of amber
seconds after --after (default: A2's start, film frame 1057, when the video starts at film frame 0) against the 40%
gate, and flags samples with more than one separate amber blob (a heuristic for "one amber element per shot": a
badge's text and pill merge into one blob; two badges far apart do not). Real captures are exempt by rule, so read
the flags against the picture.

Usage:
  python3 tools/qa/amber.py out/master.mp4                    # the film: from A2 on
  python3 tools/qa/amber.py out/v4/p2/P2.mp4 --scene P2       # a scene render (film frames from the scene start)
  python3 tools/qa/amber.py film.mp4 --after 0 --json out.json
"""
import argparse
import glob
import json
import os
import shutil
import subprocess
import sys
import tempfile

import numpy as np

W, H = 384, 216
HERE = os.path.dirname(os.path.abspath(__file__))
TIMELINE = os.path.normpath(os.path.join(HERE, "..", "..", "src", "data", "timeline.json"))
BEACON = (255, 178, 36)


def blobs(mask, min_px=6, gap=6):
    """Separate amber blobs: the mask dilated by `gap` px (pieces of one element merge), 4-connected labels."""
    m = mask.copy()
    for _ in range(gap):  # cheap dilation with shifts
        d = m.copy()
        d[1:, :] |= m[:-1, :]
        d[:-1, :] |= m[1:, :]
        d[:, 1:] |= m[:, :-1]
        d[:, :-1] |= m[:, 1:]
        m = d
    seen = np.zeros_like(m, dtype=bool)
    out = []
    ys, xs = np.nonzero(m)
    for y0, x0 in zip(ys, xs):
        if seen[y0, x0]:
            continue
        stack = [(y0, x0)]
        seen[y0, x0] = True
        pts = []
        while stack:
            y, x = stack.pop()
            pts.append((y, x))
            for ny, nx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
                if 0 <= ny < m.shape[0] and 0 <= nx < m.shape[1] and m[ny, nx] and not seen[ny, nx]:
                    seen[ny, nx] = True
                    stack.append((ny, nx))
        py = np.array([p[0] for p in pts])
        px = np.array([p[1] for p in pts])
        real = int(mask[py, px].sum())  # undilated amber pixels in this blob
        if real >= min_px:
            out.append({"px": real, "box": [int(px.min()), int(py.min()), int(px.max() - px.min() + 1), int(py.max() - py.min() + 1)]})
    return out


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("video")
    ap.add_argument("--fps", type=float, default=1.0, help="samples per second (default 1, as R1)")
    ap.add_argument("--after", type=float, default=None, help="count from this second of the video (default: A2's start)")
    ap.add_argument("--offset", type=int, default=0, help="film frame of the video's first frame")
    ap.add_argument("--scene", default=None, help="the video is this scene's render (sets --offset)")
    ap.add_argument("--json", dest="out", default=None)
    ap.add_argument("--method", choices=["r1", "raw"], default="r1", help="r1: JPEG frames as R1 (default); raw: the decode")
    a = ap.parse_args()

    offset = a.offset
    scenes = []
    if os.path.exists(TIMELINE):
        with open(TIMELINE) as fh:
            scenes = json.load(fh).get("scenes", [])
    if a.scene:
        sc = next((s for s in scenes if s["id"] == a.scene), None)
        if sc is None:
            sys.exit(f"scene {a.scene} not in {TIMELINE}")
        offset = sc["from"]
    a2 = next((s["from"] for s in scenes if s["id"] == "A2"), 1057)
    after = a.after if a.after is not None else max(0.0, (a2 - offset) / 30.0)

    frames = []
    if a.method == "r1":
        from PIL import Image  # R1's path: ffmpeg's JPEG frames, read with PIL

        tmp = tempfile.mkdtemp(prefix="amber-")
        try:
            subprocess.run(["ffmpeg", "-v", "error", "-i", a.video, "-vf", f"fps={a.fps}:round=down,scale={W}:{H}", os.path.join(tmp, "f%05d.jpg")], check=True)
            for fn in sorted(glob.glob(os.path.join(tmp, "f*.jpg"))):
                frames.append(np.asarray(Image.open(fn).convert("RGB")).astype(int))
        finally:
            shutil.rmtree(tmp, ignore_errors=True)
    else:
        out = subprocess.run(["ffmpeg", "-v", "error", "-i", a.video, "-vf", f"fps={a.fps}:round=down,scale={W}:{H},format=rgb24", "-f", "rawvideo", "-"],
                             capture_output=True, check=True).stdout
        n = len(out) // (W * H * 3)
        frames = list(np.frombuffer(out[: n * W * H * 3], np.uint8).astype(int).reshape(n, H, W, 3))
    rows = []
    for i, f in enumerate(frames):
        m = (abs(f[:, :, 0] - BEACON[0]) < 35) & (abs(f[:, :, 1] - BEACON[1]) < 40) & (abs(f[:, :, 2] - BEACON[2]) < 50)
        share = float(m.mean())
        t = i / a.fps
        bl = blobs(m) if share >= 0.0005 else []
        rows.append({"t": round(t, 2), "filmFrame": offset + int(round(t * 30)), "share": round(share, 5), "amber": share >= 0.0005, "blobs": bl})
    counted = [r for r in rows if r["t"] >= after]
    hits = [r for r in counted if r["amber"]]
    pct = 100.0 * len(hits) / max(1, len(counted))
    multi = [r for r in counted if len(r["blobs"]) > 1]
    print(f"{a.video}: {len(rows)} samples at {a.fps:g} fps; counted from {after:.1f} s")
    print(f"  amber seconds   {len(hits)} of {len(counted)} ({pct:.1f}%)   gate 40%: {'PASS' if pct >= 40 else 'FAIL'}")
    print(f"  samples with more than one amber blob: {len(multi)}" + (": " + ", ".join(f"{r['t']:.0f} s (f{r['filmFrame']}, {len(r['blobs'])})" for r in multi[:30]) if multi else ""))
    if a.out:
        os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
        with open(a.out, "w") as fh:
            json.dump({"src": a.video, "fps": a.fps, "after": after, "pct": round(pct, 2), "samples": rows}, fh)
        print(f"  wrote {a.out}")


if __name__ == "__main__":
    main()
