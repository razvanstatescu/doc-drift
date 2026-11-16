#!/usr/bin/env python3
"""Motion gate for the film (V4.md section 3, M1), ported from R1's measure.py (out/research-v4/r1/scripts/).

Decodes the video at 30 fps, 480x270 grey (area scaling), and compares each frame with the previous one:
  - a pixel CHANGED when its value moved by more than 6 levels (--level; R1's "loose" threshold; 12 = strict),
  - a frame MOVES when 0.2% or more of its pixels changed (--share; about 260 px, a single changing digit stays below),
  - a FROZEN HOLD is a run of 30 or more consecutive non-moving frames (--hold seconds),
  - a FROZEN SECOND has 28 or more non-moving frames.
It prints the moving-frame share, the frozen-second share, every frozen hold of 1 s or more with its timestamps,
runs over 12 static frames (M1), and, with --scenes, the share per scene from src/data/timeline.json.

Usage:
  python3 tools/qa/motion.py out/doc-drift-v3.mp4
  python3 tools/qa/motion.py out/v4/kit/demo.mp4 --from 2 --to 8
  python3 tools/qa/motion.py out/v4/p2/P2.mp4 --scene P2           # a scene render: film frames from the scene start
  python3 tools/qa/motion.py out/master.mp4 --scenes --json out/v4/qa/motion.json
Gates (printed as PASS / FAIL): film 75% or more moving, every scene 70% or more, frozen holds of 1 s or more
5 s or less in total outside the exempt film frames (default 180-194, the true black, when the video starts at film
frame 0). The JSON holds per-frame values and the summary.
"""
import argparse
import json
import os
import subprocess
import sys

import numpy as np

W, H, FPS = 480, 270, 30
HERE = os.path.dirname(os.path.abspath(__file__))
TIMELINE = os.path.normpath(os.path.join(HERE, "..", "..", "src", "data", "timeline.json"))


def decode(src, start=None, end=None):
    """Yield 480x270 grey frames (int16) at 30 fps, optionally from start to end seconds."""
    cmd = ["ffmpeg", "-v", "error"]
    if start is not None:
        cmd += ["-ss", f"{start:.3f}"]
    cmd += ["-i", src]
    if end is not None:
        cmd += ["-t", f"{max(0.0, end - (start or 0.0)):.3f}"]
    cmd += ["-vf", f"fps={FPS},scale={W}:{H}:flags=area,format=gray", "-f", "rawvideo", "-"]
    p = subprocess.Popen(cmd, stdout=subprocess.PIPE)
    size = W * H
    while True:
        buf = p.stdout.read(size)
        if len(buf) < size:
            break
        yield np.frombuffer(buf, dtype=np.uint8).astype(np.int16).reshape(H, W)
    p.wait()
    if p.returncode not in (0, None):
        sys.exit(f"ffmpeg failed on {src}")


def runs_of(flags):
    """[(start, length)] of consecutive True values."""
    out, start = [], None
    for i, f in enumerate(list(flags) + [False]):
        if f and start is None:
            start = i
        elif not f and start is not None:
            out.append((start, i - start))
            start = None
    return out


def fmt_t(sec):
    m = int(sec // 60)
    return f"{m}:{sec - 60 * m:05.2f}"


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("video")
    ap.add_argument("--from", dest="t0", type=float, default=None, help="start, seconds into the video")
    ap.add_argument("--to", dest="t1", type=float, default=None, help="end, seconds into the video")
    ap.add_argument("--level", type=int, default=6, help="grey levels a pixel must change by (default 6; 12 = strict)")
    ap.add_argument("--share", type=float, default=0.002, help="share of changed pixels that makes a frame move (0.002)")
    ap.add_argument("--hold", type=float, default=1.0, help="frozen hold length, seconds (default 1)")
    ap.add_argument("--offset", type=int, default=None, help="film frame of the video's first frame (default 0)")
    ap.add_argument("--scene", default=None, help="the video is this scene's render (sets --offset, checks the 70%% gate)")
    ap.add_argument("--scenes", action="store_true", help="per-scene shares from timeline.json (film or Body renders)")
    ap.add_argument("--exempt", default=None, help="film frames exempt from the hold gate, a-b[,c-d] (default 180-194)")
    ap.add_argument("--json", dest="out", default=None, help="write per-frame data and the summary here")
    ap.add_argument("--quiet", action="store_true", help="summary lines only")
    a = ap.parse_args()

    timeline = None
    if os.path.exists(TIMELINE):
        with open(TIMELINE) as fh:
            timeline = json.load(fh)
    scenes = sorted((timeline or {}).get("scenes", []), key=lambda s: s["from"])
    offset = a.offset
    if a.scene:
        sc = next((s for s in scenes if s["id"] == a.scene), None)
        if sc is None:
            sys.exit(f"scene {a.scene} not in {TIMELINE}")
        if offset is None:
            offset = sc["from"]
    if offset is None:
        offset = 0
    first = offset + int(round((a.t0 or 0.0) * FPS))  # film frame of the first analysed frame

    mad, moving, strict, lum = [], [], [], []
    prev = None
    for f in decode(a.video, a.t0, a.t1):
        lum.append(float(f.mean()))
        if prev is None:
            mad.append(0.0)
            moving.append(1.0)  # the first frame counts as a change (it is a cut from whatever came before)
            strict.append(1.0)
        else:
            d = np.abs(f - prev)
            mad.append(float(d.mean()))
            moving.append(float((d > a.level).mean()))
            strict.append(float((d > 12).mean()))
        prev = f
    n = len(moving)
    if n < 2:
        sys.exit(f"{a.video}: fewer than 2 frames decoded")

    still = [m < a.share for m in moving]
    # film-frame exemption (the true black): only meaningful when the video covers it
    exempt = set()
    spec = a.exempt if a.exempt is not None else "180-194"
    for part in filter(None, spec.split(",")):
        lo, hi = (int(x) for x in part.split("-"))
        for ff in range(lo, hi + 1):
            exempt.add(ff - first)
    hold_frames = int(round(a.hold * FPS))
    holds = [(s, l) for s, l in runs_of(still) if l >= hold_frames]
    # a hold that lies inside the exemption does not count; one that overlaps it counts only its outside part
    def outside(s, l):
        return sum(1 for i in range(s, s + l) if i not in exempt)
    hold_total = sum(outside(s, l) for s, l in holds) / FPS
    m1 = [(s, l) for s, l in runs_of(still) if l > 12 and outside(s, l) > 12]

    pct_moving = 100.0 * (1 - sum(still) / n)
    pct_strict = 100.0 * sum(1 for m in strict if m >= a.share) / n
    secs = []
    for s in range(0, (n + FPS - 1) // FPS):
        lo, hi = s * FPS, min(n, (s + 1) * FPS)
        secs.append(sum(still[lo:hi]) >= min(28, hi - lo - 2))
    pct_frozen_secs = 100.0 * sum(secs) / max(1, len(secs))
    longest = max((l for _, l in runs_of(still)), default=0)

    t0 = (a.t0 or 0.0)
    def ts(i):
        return t0 + i / FPS

    print(f"{a.video}: {n} frames ({n / FPS:.1f} s) from {fmt_t(t0)}, film frame {first}")
    print(f"  moving frames      {pct_moving:5.1f}%   (strict, 12 levels: {pct_strict:.1f}%)")
    print(f"  frozen seconds     {pct_frozen_secs:5.1f}%")
    print(f"  frozen holds >= {a.hold:g} s: {len(holds)}, {sum(l for _, l in holds) / FPS:.1f} s in total"
          f" ({hold_total:.1f} s outside the exempt frames), longest {longest / FPS:.2f} s")
    if not a.quiet:
        for s, l in holds:
            print(f"    {fmt_t(ts(s))} to {fmt_t(ts(s + l))}  {l / FPS:5.2f} s   film frames {first + s} to {first + s + l - 1}")
        if m1:
            print(f"  M1: {len(m1)} runs of more than 12 static frames"
                  + (": " + ", ".join(f"{first + s} ({l} f)" for s, l in m1[:40]) + (" ..." if len(m1) > 40 else "")))

    per_scene = []
    if (a.scenes or a.scene) and scenes:
        for sc in scenes:
            lo = max(0, sc["from"] - first)
            hi = min(n, sc["from"] + sc["durationInFrames"] - first)
            if hi - lo < FPS:
                continue
            seg = still[lo:hi]
            share = 100.0 * (1 - sum(seg) / len(seg))
            sh = [(s, l) for s, l in runs_of(seg) if l >= hold_frames]
            per_scene.append({"id": sc["id"], "moving": round(share, 1), "holds": len(sh),
                              "hold_s": round(sum(l for _, l in sh) / FPS, 1), "frames": hi - lo})
        print("  per scene:")
        for r in per_scene:
            flag = "PASS" if r["moving"] >= 70 else "FAIL"
            print(f"    {r['id']:<4} {r['moving']:5.1f}% moving, {r['holds']} holds ({r['hold_s']} s)   {flag} (70%)")

    gates = {
        "moving>=75": pct_moving >= 75.0,
        "holds<=5s": hold_total <= 5.0,
    }
    if per_scene:
        gates["scenes>=70"] = all(r["moving"] >= 70 for r in per_scene)
    print("  gates: " + ", ".join(f"{k} {'PASS' if v else 'FAIL'}" for k, v in gates.items()))

    if a.out:
        os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
        with open(a.out, "w") as fh:
            json.dump({
                "src": a.video, "fps": FPS, "frames": n, "firstFilmFrame": first, "level": a.level, "share": a.share,
                "summary": {"movingPct": round(pct_moving, 2), "strictPct": round(pct_strict, 2),
                            "frozenSecondsPct": round(pct_frozen_secs, 2), "holds": len(holds),
                            "holdSeconds": round(sum(l for _, l in holds) / FPS, 2),
                            "holdSecondsOutsideExempt": round(hold_total, 2), "longestStaticS": round(longest / FPS, 2),
                            "gates": gates},
                "holdList": [{"start": round(ts(s), 3), "end": round(ts(s + l), 3), "seconds": round(l / FPS, 2),
                              "filmFrom": first + s, "filmTo": first + s + l - 1} for s, l in holds],
                "m1Runs": [{"filmFrom": first + s, "frames": l} for s, l in m1],
                "scenes": per_scene,
                "mad": [round(x, 3) for x in mad], "moving": [round(x, 4) for x in moving], "lum": [round(x, 1) for x in lum],
            }, fh)
        print(f"  wrote {a.out}")


if __name__ == "__main__":
    main()
