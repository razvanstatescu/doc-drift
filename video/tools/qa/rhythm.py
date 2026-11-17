#!/usr/bin/env python3
"""Rhythm gates for v5 (video/V5.md section 4, R6 sections 1 and 6.8), from R6's measure6.py and analyze6.py
(out/v5/r6/scripts/), in one CLI for a whole film or a scene render. OCR (type measures) is left out.

Definitions (30 fps), as R6:
  Transition event: a cluster of frames where 25% or more of the pixels change (continuing while 10% or more do);
    1 to 2 frames = a hard cut, 3 or more = a moving transition (whip, push, wipe, morph, grow reveal, fast move).
  Shot: the span between transition events (hard cuts at their first frame, moving transitions at their middle).
  Interrupt: a RISE in novelty (share of 16x9 blocks new against 0.2 s earlier) of 0.08 or more over the calm of the
    0.5 s before, at least doubling it; peaks within 9 frames merge. Major >= 0.35 (a third of the frame is new: a cut,
    a transition, a big camera move), medium 0.15 to 0.35 (a card, a panel, big type), minor 0.08 to 0.15.
  Sound onset: a spectral-flux peak with a robust z-score against the +-1 s around it; "hit" z >= 6.
  Sync: a picture event is "on a hit" when a strong hit (z >= 6) lies within +-2 frames; lift = observed / chance
    (the same events shifted by random 0.5 to 5 s offsets, 400 draws).

Usage:
  python3 tools/qa/rhythm.py out/doc-drift-v5.mp4                 # the film: the body starts after PROBLEM
  python3 tools/qa/rhythm.py out/v5/loop/LOOP.mp4 --scene LOOP     # a scene render: all of it is body
  python3 tools/qa/rhythm.py film.mp4 --body-from 13.2 --json out/v5/qa/rhythm.json
Checked: on out/doc-drift-v4.mp4 with --body-from 13.2 it gives R6's v4 numbers (body median shot 1.53 s, moving
transitions 20.7 a minute, major interrupts 30.4 a minute, all 50.3, longest gap 5.7 s, gaps over 4 s 11.6%).
"""
import argparse
import json
import os
import random
import statistics as st
import subprocess
import sys

import numpy as np

FPS = 30
W, H = 480, 270
BX, BY = 16, 9
SR, NFFT, HOP = 22050, 1024, 256
HERE = os.path.dirname(os.path.abspath(__file__))
TIMELINE = os.path.normpath(os.path.join(HERE, "..", "..", "src", "data", "timeline.json"))


# ---------------------------------------------------------------------------------------------------------------------
# Measure (R6 measure6.py)
# ---------------------------------------------------------------------------------------------------------------------

def picture(src):
    cmd = ["ffmpeg", "-v", "error", "-i", src, "-vf", f"fps={FPS},scale={W}:{H}:flags=area,format=gray", "-f", "rawvideo", "-"]
    p = subprocess.Popen(cmd, stdout=subprocess.PIPE)
    size = W * H
    ring = []
    moving, nov = [], []
    bh, bw = H // BY, W // BX
    while True:
        buf = p.stdout.read(size)
        if len(buf) < size:
            break
        f = np.frombuffer(buf, dtype=np.uint8).astype(np.int16).reshape(H, W)
        if ring:
            d1 = np.abs(f - ring[-1])
            moving.append(float((d1 > 6).mean()))
            d6 = np.abs(f - ring[0])
            b6 = d6[: bh * BY, : bw * BX].reshape(BY, bh, BX, bw).mean(axis=(1, 3))
            nov.append(float((b6 > 8.0).mean()))
        else:
            moving.append(0.0)
            nov.append(0.0)
        ring.append(f)
        if len(ring) > 6:
            ring.pop(0)
    p.wait()
    return moving, nov


def sound(src):
    cmd = ["ffmpeg", "-v", "error", "-i", src, "-vn", "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"]
    raw = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL).stdout  # a silent render has no audio
    x = np.frombuffer(raw, dtype=np.float32)
    if x.size < NFFT:
        return None
    win = np.hanning(NFFT).astype(np.float32)
    n = 1 + (x.size - NFFT) // HOP
    idx = np.arange(NFFT)[None, :] + HOP * np.arange(n)[:, None]
    mag = np.abs(np.fft.rfft(x[idx] * win, axis=1))
    L = np.log1p(100.0 * mag)
    dL = np.maximum(0.0, np.diff(L, axis=0, prepend=L[:1]))
    return {"hop_s": HOP / SR, "t0_s": NFFT / 2 / SR, "flux": dL.sum(axis=1)}


# ---------------------------------------------------------------------------------------------------------------------
# Analyse (R6 analyze6.py)
# ---------------------------------------------------------------------------------------------------------------------

def transition_events(moving):
    ev, i, n = [], 1, len(moving)
    while i < n:
        if moving[i] >= 0.25:
            j = i
            while j + 1 < n and moving[j + 1] >= 0.10:
                j += 1
            ev.append((i, j))
            i = j + 1
        else:
            i += 1
    return ev


def interrupts(nov):
    nov = np.asarray(nov)
    n = len(nov)
    cands = []
    for t in range(1, n):
        a, b = max(0, t - 4), min(n, t + 5)
        if nov[t] < nov[a:b].max() or nov[t] <= 0:
            continue
        base = nov[max(0, t - 15): t].min() if t > 0 else 0.0
        rise = nov[t] - base
        if rise >= 0.08 and nov[t] >= 2 * base:
            cands.append((t, float(rise)))
    out = []
    for c in cands:
        if out and c[0] - out[-1][0] < 9:
            if c[1] > out[-1][1]:
                out[-1] = c
            continue
        out.append(c)
    cls = lambda r: "major" if r >= 0.35 else "medium" if r >= 0.15 else "minor"
    return [{"f": t, "rise": round(r, 3), "cls": cls(r)} for t, r in out]


def sliding_median(x, half):
    pad = np.pad(np.asarray(x, dtype=float), half, mode="edge")
    return np.median(np.lib.stride_tricks.sliding_window_view(pad, 2 * half + 1), axis=1)


def onsets(audio):
    f = np.asarray(audio["flux"], dtype=float)
    hop, t0 = audio["hop_s"], audio["t0_s"]
    half = int(round(1.0 / hop))
    med = sliding_median(f, half)
    mad = sliding_median(np.abs(f - med), half)
    z = (f - med) / (1.4826 * mad + 1e-6)
    pk = int(round(0.046 / hop))
    out, n = [], len(f)
    for i in range(n):
        if z[i] < 3:
            continue
        a, b = max(0, i - pk), min(n, i + pk + 1)
        if f[i] < f[a:b].max():
            continue
        out.append({"f": (t0 + i * hop) * FPS, "z": float(z[i])})
    return out


def sync(visual, audio, n_frames, tol=2.0, draws=400, seed=7):
    if not visual or not audio:
        return None
    A = np.array(sorted(audio))

    def share(vs):
        hits = 0
        for v in vs:
            k = np.searchsorted(A, v)
            if any(abs(A[j] - v) <= tol for j in (k - 1, k) if 0 <= j < len(A)):
                hits += 1
        return hits / len(vs)

    obs = share(visual)
    rnd = random.Random(seed)
    ch = st.mean(share([(v + rnd.choice([-1, 1]) * rnd.uniform(15, 150)) % n_frames for v in visual]) for _ in range(draws))
    return {"events": len(visual), "hit_share": round(obs, 3), "chance": round(ch, 3), "lift": round(obs / ch, 2) if ch > 0 else None}


def dist(xs):
    if not xs:
        return {"n": 0}
    s = sorted(xs)
    q = lambda p: s[min(len(s) - 1, int(round((len(s) - 1) * p)))]
    return {"n": len(xs), "median": round(st.median(xs), 2), "mean": round(st.mean(xs), 2), "p10": round(q(0.1), 2), "p90": round(q(0.9), 2), "max": round(max(xs), 2)}


def gaps(frames, start, end):
    fs = [start] + sorted(frames) + [end]
    return [(b - a) / FPS for a, b in zip(fs, fs[1:]) if b > a]


# ---------------------------------------------------------------------------------------------------------------------

def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    ap.add_argument("video")
    ap.add_argument("--body-from", type=float, default=None, help="seconds where the body starts (default: after the first scene for the film, 0 otherwise)")
    ap.add_argument("--scene", default=None, help="the video is this scene's render (all of it is body)")
    ap.add_argument("--json", dest="out", default=None)
    a = ap.parse_args()

    moving, nov = picture(a.video)
    n = len(moving)
    if n < 30:
        sys.exit(f"{a.video}: too short ({n} frames)")
    body_from = a.body_from
    if body_from is None:
        body_from = 0.0
        if not a.scene and os.path.exists(TIMELINE):
            tl = json.load(open(TIMELINE))
            sc = sorted(tl.get("scenes", []), key=lambda s: s["from"])
            if sc and abs(n - tl.get("totalFrames", 0)) <= 2:
                body_from = (sc[0]["from"] + sc[0]["durationInFrames"]) / FPS
    body0 = int(round(body_from * FPS))
    body_dur = (n - body0) / FPS
    per_min = lambda k: round(k / (body_dur / 60), 1)

    ev = transition_events(moving)
    hard = [x for x, y in ev if y - x + 1 <= 2]
    moves = [(x, y) for x, y in ev if y - x + 1 >= 3]
    bounds = sorted(set(hard + [(x + y) // 2 for x, y in moves]))
    edges = [0] + bounds + [n]
    shots = [(edges[i], edges[i + 1]) for i in range(len(edges) - 1) if edges[i + 1] - edges[i] >= 2]
    body_shots = [(y - x) / FPS for x, y in shots if x >= body0]
    long_time = sum(s for s in body_shots if s >= 4.0)
    ints = [x for x in interrupts(nov) if x["f"] >= body0]
    maj = [x["f"] for x in ints if x["cls"] == "major"]
    big = [x["f"] for x in ints if x["cls"] in ("major", "medium")]
    g_all = gaps([x["f"] for x in ints], body0, n)
    g_big = gaps(big, body0, n)
    dead = sum(g for g in g_big if g > 4.0)

    snd = sound(a.video)
    ons = onsets(snd) if snd else []
    hits = [o["f"] for o in ons if o["z"] >= 6]
    cut_frames = [x for x in hard if x >= body0]
    move_frames = [x for x, y in moves if x >= body0]
    res = {
        "src": a.video,
        "frames": n,
        "body_from_s": round(body_from, 2),
        "shots": {
            "body": dist(body_shots),
            "eight_s_or_more": sum(1 for s in body_shots if s >= 8.0),
            "body_time_in_shots_4s_or_more": round(long_time / body_dur, 3) if body_dur > 0 else None,
            "under_1s_share": round(sum(1 for s in body_shots if s < 1.0) / len(body_shots), 3) if body_shots else None,
        },
        "transitions": {"hard_per_min": per_min(len(cut_frames)), "moving_per_min": per_min(len(move_frames)), "hard_cuts": len(cut_frames), "moving": len(move_frames)},
        "interrupts": {
            "all_per_min": per_min(len(ints)),
            "major_per_min": per_min(len(maj)),
            "medium_per_min": per_min(sum(1 for x in ints if x["cls"] == "medium")),
            "minor_per_min": per_min(sum(1 for x in ints if x["cls"] == "minor")),
            "inside_composition_share": round(1 - len(maj) / len(ints), 3) if ints else None,
            "longest_gap_any_s": round(max(g_all), 2) if g_all else None,
            "gaps_any_over_3s": [round(g, 2) for g in sorted(g_all, reverse=True) if g > 3.0][:6],
            "longest_gap_major_medium_s": round(max(g_big), 2) if g_big else None,
            "body_time_in_major_medium_gaps_over_4s": round(dead / body_dur, 3) if body_dur > 0 else None,
        },
        "sound": {
            "hits_per_min": per_min(sum(1 for h in hits if h >= body0)),
            "hard_cuts_on_a_hit": sync(cut_frames, hits, n),
            "moving_transitions_on_a_hit": sync(move_frames, hits, n),
            "cuts_and_moves_on_a_hit": sync(sorted(cut_frames + move_frames), hits, n),
        },
        "lists": {"hard_cuts": cut_frames, "moving_transitions": [[x, y] for x, y in moves if x >= body0], "major_interrupts": maj},
    }
    s = res["shots"]
    t = res["transitions"]
    i = res["interrupts"]
    c = res["sound"]["cuts_and_moves_on_a_hit"]
    print(f"{a.video}: {n} frames ({n / FPS:.1f} s), body from {body_from:.1f} s")
    print(f"  shots (body): median {s['body'].get('median')} s, n {s['body'].get('n')}, 8 s or more {s['eight_s_or_more']}, "
          f"time in shots of 4 s or more {100 * (s['body_time_in_shots_4s_or_more'] or 0):.0f}%, under 1 s {100 * (s['under_1s_share'] or 0):.0f}%")
    print(f"  transitions: moving {t['moving_per_min']}/min, hard {t['hard_per_min']}/min")
    print(f"  interrupts: all {i['all_per_min']}/min, major {i['major_per_min']}/min, inside a composition {100 * (i['inside_composition_share'] or 0):.0f}%, "
          f"longest gap {i['longest_gap_any_s']} s, major/medium gaps over 4 s {100 * (i['body_time_in_major_medium_gaps_over_4s'] or 0):.0f}% of the body")
    hc = res["sound"]["hard_cuts_on_a_hit"]
    if not snd:
        print("  sound: none (a silent render: the sync gate needs the film's sound)")
    elif c:
        print(f"  sound: hits {res['sound']['hits_per_min']}/min; cuts and moves on a strong hit (+-2 f) {100 * c['hit_share']:.0f}%, lift {c['lift']}"
              + (f"; hard cuts alone {100 * hc['hit_share']:.0f}%, lift {hc['lift']}" if hc else ""))
    gates = {
        "median shot 3-4.5 s": s["body"].get("median") is not None and 3.0 <= s["body"]["median"] <= 4.5,
        "time in 4 s+ shots >= 70%": (s["body_time_in_shots_4s_or_more"] or 0) >= 0.70,
        "moving 8-10/min": 8 <= t["moving_per_min"] <= 10,
        "major 15-20/min": 15 <= i["major_per_min"] <= 20,
        "all 40-50/min": 40 <= i["all_per_min"] <= 50,
        "longest gap <= 4 s": (i["longest_gap_any_s"] or 0) <= 4.0,
        "gaps over 4 s 15-25%": 0.15 <= (i["body_time_in_major_medium_gaps_over_4s"] or 0) <= 0.25,
        "cuts on a hit >= 60%, lift >= 2": bool(c) and c["hit_share"] >= 0.6 and (c["lift"] or 0) >= 2,
    }
    if not a.scene:
        gates["shots of 8 s+ >= 3"] = s["eight_s_or_more"] >= 3
    res["gates"] = gates
    print("  gates: " + ", ".join(f"{k} {'PASS' if v else 'FAIL'}" for k, v in gates.items()))
    if a.out:
        os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
        json.dump(res, open(a.out, "w"), indent=1)
        print(f"  wrote {a.out}")


if __name__ == "__main__":
    main()
