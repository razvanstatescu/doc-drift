#!/usr/bin/env python3
"""WCAG 2.3.1 flash screen for a rendered clip: the whole frame, every 25 %-of-a-10°-field window, and saturated red.

Usage (from marketing/video):
    python3 -I src2/scenes/H0/qa/flashcheck.py out/x.mp4 [--fps 30] [--target 2] [--json report.json]

What it measures (a SCREEN, not a sign-off: run PEAT or a Harding test on the master before publishing):
  * Relative luminance from decoded sRGB (IEC 61966-2-1), per frame, for the whole frame and for a sliding grid of
    341×256 px windows at 1080p (25 % of a 10° field at 1024×768, scaled by the frame height; stride half a window).
  * A transition is one leg of the zigzag of that series: a move of ≥ 0.1 between a local minimum and a local maximum
    (hysteresis 0.1), counted only when the darker side is < 0.8. A flash is a pair of opposing transitions.
  * Saturated red (WCAG "red flash"): per pixel, R / (R + G + B) ≥ 0.8 in linear light; its value is
    (R − G − B) × 320, averaged over the window; transitions of ≥ 20 in that value count as red transitions.
  * Each 1 s window (fps frames) counts the transitions that END inside it. More than 6 (3 flashes) fails WCAG 2.3.1;
    `--target` (default 2 flashes = 4 transitions) is the margin we ask for.
Exit code 0 when everything is within WCAG (3 flashes), 1 otherwise.
"""
import argparse
import json
import subprocess
import sys

import numpy as np

ap = argparse.ArgumentParser()
ap.add_argument("clip")
ap.add_argument("--fps", type=int, default=30)
ap.add_argument("--target", type=float, default=2.0, help="flashes per second we aim to stay under (WCAG: 3)")
ap.add_argument("--json", default=None)
args = ap.parse_args()

W, H = 480, 270  # analysis size: 1/4 of 1080p (a 341×256 window is 85×64 here)
SRC_H = 1080
win_w = round(341 * H / SRC_H)
win_h = round(256 * H / SRC_H)
step_x, step_y = max(1, win_w // 2), max(1, win_h // 2)

raw = subprocess.run(
    ["ffmpeg", "-loglevel", "error", "-i", args.clip, "-vf", f"scale={W}:{H}:flags=area,format=rgb24", "-f", "rawvideo", "-"],
    check=True,
    capture_output=True,
).stdout
frames = np.frombuffer(raw, dtype=np.uint8).reshape(-1, H, W, 3)
n = len(frames)

lut = np.arange(256) / 255.0
lut = np.where(lut <= 0.04045, lut / 12.92, ((lut + 0.055) / 1.055) ** 2.4).astype(np.float32)


def box_means(img):
    """Mean of img over every window position (integral image)."""
    ii = np.pad(img.cumsum(0).cumsum(1), ((1, 0), (1, 0)))
    ys = np.arange(0, H - win_h + 1, step_y)
    xs = np.arange(0, W - win_w + 1, step_x)
    # The stride can stop short of the frame's bottom and right edges (by ~56 / ~68 px at 1080p): always add the window
    # that sits flush with each edge, so no strip of the frame goes unchecked (QA v5, verify-h0.md re-check).
    if ys[-1] != H - win_h:
        ys = np.append(ys, H - win_h)
    if xs[-1] != W - win_w:
        xs = np.append(xs, W - win_w)
    y0, x0 = np.meshgrid(ys, xs, indexing="ij")
    s = ii[y0 + win_h, x0 + win_w] - ii[y0, x0 + win_w] - ii[y0 + win_h, x0] + ii[y0, x0]
    return s / (win_w * win_h)


lum_full = np.empty(n, np.float32)
red_full = np.empty(n, np.float32)
lum_win = None
red_win = None
for t in range(n):
    rgb = lut[frames[t]]
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
    tot = r + g + b
    sat = (tot > 1e-6) & (r >= 0.8 * tot)
    red = np.where(sat, np.maximum(0.0, r - g - b) * 320.0, 0.0).astype(np.float32)
    lum_full[t] = lum.mean()
    red_full[t] = red.mean()
    lw, rw = box_means(lum), box_means(red)
    if lum_win is None:
        lum_win = np.empty((n,) + lw.shape, np.float32)
        red_win = np.empty((n,) + rw.shape, np.float32)
    lum_win[t] = lw
    red_win[t] = rw


def legs(s, thr, dark_lt=None):
    """Zigzag legs (start, end) of size ≥ thr; with dark_lt, keep legs whose darker side is below it."""
    if len(s) < 2:
        return []
    lo = hi = 0
    k = 1
    while k < len(s):
        if s[k] < s[lo]:
            lo = k
        if s[k] > s[hi]:
            hi = k
        if s[hi] - s[lo] >= thr:
            break
        k += 1
    else:
        return []
    pivot, cand, d = (lo, hi, 1) if lo < hi else (hi, lo, -1)
    out = []
    for i in range(cand + 1, len(s)):
        v = s[i]
        if d > 0:
            if v > s[cand]:
                cand = i
            elif s[cand] - v >= thr:
                out.append((pivot, cand))
                pivot, cand, d = cand, i, -1
        else:
            if v < s[cand]:
                cand = i
            elif v - s[cand] >= thr:
                out.append((pivot, cand))
                pivot, cand, d = cand, i, 1
    if abs(s[cand] - s[pivot]) >= thr:
        out.append((pivot, cand))
    if dark_lt is not None:
        out = [(a, b) for a, b in out if min(s[a], s[b]) < dark_lt]
    return out


def worst_window(ends):
    """Most transitions ending inside any fps-frame window, and the window's first frame."""
    if not ends:
        return 0, None
    ends = np.sort(np.asarray(ends))
    best, at = 0, None
    for w in range(0, max(1, n - args.fps + 1)):
        c = int(((ends >= w) & (ends < w + args.fps)).sum())
        if c > best:
            best, at = c, w
    return best, at


report = {"clip": args.clip, "frames": n, "fps": args.fps, "window_px_1080p": [341, 256]}
fail = False
target_t = int(round(2 * args.target))

full_legs = legs(lum_full, 0.1, 0.8)
full_red = legs(red_full, 20.0)
fw, fat = worst_window([b for _, b in full_legs])
rw_, rat = worst_window([b for _, b in full_red])
report["whole_frame"] = {"transitions": [[int(a), int(b), round(float(lum_full[b] - lum_full[a]), 3)] for a, b in full_legs], "max_in_1s": fw, "at": fat, "red_max_in_1s": rw_, "red_at": rat}

ny, nx = lum_win.shape[1:]
grid_worst = np.zeros((ny, nx), int)
grid_red = np.zeros((ny, nx), int)
worst_cell = (0, None, None)
worst_red_cell = (0, None, None)
for j in range(ny):
    for i in range(nx):
        lw = legs(lum_win[:, j, i], 0.1, 0.8)
        c, at = worst_window([b for _, b in lw])
        grid_worst[j, i] = c
        if c > worst_cell[0]:
            worst_cell = (c, (int(i * step_x * SRC_H / H), int(j * step_y * SRC_H / H)), at)
        rl = legs(red_win[:, j, i], 20.0)
        rc, rat2 = worst_window([b for _, b in rl])
        grid_red[j, i] = rc
        if rc > worst_red_cell[0]:
            worst_red_cell = (rc, (int(i * step_x * SRC_H / H), int(j * step_y * SRC_H / H)), rat2)

report["local"] = {
    "windows": int(nx * ny),
    "max_in_1s": int(worst_cell[0]),
    "worst_window_xy_1080p": worst_cell[1],
    "worst_from_frame": worst_cell[2],
    "windows_over_wcag": int((grid_worst > 6).sum()),
    "windows_over_target": int((grid_worst > target_t).sum()),
    "red_max_in_1s": int(worst_red_cell[0]),
    "red_worst_xy_1080p": worst_red_cell[1],
    "red_worst_from_frame": worst_red_cell[2],
}

for name, c in [("whole frame", fw), ("whole frame, red", rw_), ("local 341x256", worst_cell[0]), ("local, red", worst_red_cell[0])]:
    verdict = "FAIL (WCAG 2.3.1)" if c > 6 else ("over target" if c > target_t else "ok")
    fail = fail or c > 6
    print(f"{name:18s} max transitions in any 1 s: {c:2d}  ({c / 2:.1f} flashes)  {verdict}")
print(f"whole-frame transitions (start, end, Δ): {report['whole_frame']['transitions']}")
print(f"worst local window at {worst_cell[1]} (1080p px), 1 s from f{worst_cell[2]}; windows over WCAG: {report['local']['windows_over_wcag']} of {nx * ny}; over the {args.target:g}-flash target: {report['local']['windows_over_target']}")
print(f"RESULT: {'FAIL' if fail else 'PASS'} (screen only; target ≤ {args.target:g} flashes/s: {'met' if max(fw, rw_, worst_cell[0], worst_red_cell[0]) <= target_t else 'NOT met'})")
if args.json:
    with open(args.json, "w") as fh:
        json.dump(report, fh, indent=1)
sys.exit(1 if fail else 0)
