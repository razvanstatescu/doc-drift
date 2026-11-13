#!/usr/bin/env python3
"""Voicing and formant track of a speech file (numpy + ffmpeg only). Used to check pronunciations without listening.

    python3 -I tools/audio/voicing.py file.wav [--from 1.3 --to 2.7] [--formants]

Prints voiced segments (autocorrelation pitch, 70-400 Hz) and, with --formants, F1/F2 per voiced 20 ms frame (LPC order
12 on a 10 kHz resample, roots of the predictor polynomial).
"""
import json, subprocess, sys
import numpy as np

def load(path, sr):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-ac', '1', '-ar', str(sr), '-f', 'f32le', '-'], capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).astype(np.float64)

def voicing(x, sr, hop=0.01, win=0.04):
    H, W = int(hop * sr), int(win * sr)
    out = []
    lo, hi = int(sr / 400), int(sr / 70)
    peak = np.max(np.abs(x)) + 1e-9
    for s in range(0, len(x) - W, H):
        f = x[s:s + W] * np.hanning(W)
        e = np.sqrt(np.mean(f ** 2))
        ac = np.correlate(f, f, 'full')[W - 1:]
        if ac[0] <= 0:
            out.append((s / sr, 0.0, 0.0, -120)); continue
        ac = ac / ac[0]
        seg = ac[lo:hi]
        kmax = int(np.argmax(seg))
        # first local peak within 85% of the best one (avoids octave-down errors)
        k = kmax
        for j in range(1, len(seg) - 1):
            if seg[j] >= 0.85 * seg[kmax] and seg[j] >= seg[j - 1] and seg[j] >= seg[j + 1]:
                k = j; break
        k += lo
        out.append((s / sr + win / 2, float(ac[k]), sr / k, 20 * np.log10(e / peak + 1e-12)))
    return out

def lpc_formants(frame, sr, order=12):
    frame = frame * np.hamming(len(frame))
    frame = np.append(frame[0], frame[1:] - 0.63 * frame[:-1])
    r = np.correlate(frame, frame, 'full')[len(frame) - 1:len(frame) + order]
    if r[0] <= 0: return []
    a = np.zeros(order + 1); a[0] = 1.0; e = r[0]
    for i in range(1, order + 1):
        acc = r[i] + np.dot(a[1:i], r[i - 1:0:-1])
        k = -acc / e
        a[1:i] = a[1:i] + k * a[i - 1:0:-1]
        a[i] = k
        e *= (1 - k * k)
    roots = [z for z in np.roots(a) if np.imag(z) >= 0.01]
    fr = sorted((np.angle(z) * sr / (2 * np.pi), -0.5 * sr / np.pi * np.log(np.abs(z))) for z in roots)
    return [round(f) for f, bw in fr if 90 < f < 4000 and bw < 400]

def yin(x, sr, hop=0.01, W=480, fmin=60, fmax=350, thr=0.12):
    """YIN pitch (de Cheveigne & Kawahara 2002): cumulative-mean-normalised difference, absolute threshold."""
    tmin, tmax = int(sr / fmax), int(sr / fmin)
    H = int(hop * sr)
    peak = np.max(np.abs(x)) + 1e-9
    out = []
    for s in range(0, len(x) - W - tmax, H):
        fr = x[s:s + W + tmax]
        e = 20 * np.log10(np.sqrt(np.mean(fr[:W] ** 2)) / peak + 1e-12)
        d = np.array([np.sum((fr[:W] - fr[t:t + W]) ** 2) for t in range(tmax + 1)])
        cm = np.ones_like(d)
        cs = np.cumsum(d[1:])
        cm[1:] = d[1:] * np.arange(1, tmax + 1) / np.maximum(cs, 1e-12)
        cand = np.where(cm[tmin:] < thr)[0]
        if len(cand) == 0 or e < -30:
            out.append((s / sr, None, e)); continue
        t = tmin + cand[0]
        while t + 1 <= tmax and cm[t + 1] < cm[t]: t += 1
        # parabolic interpolation
        if 1 <= t < tmax:
            a, b, c = cm[t - 1], cm[t], cm[t + 1]
            den = a - 2 * b + c
            t = t + (0.5 * (a - c) / den if den != 0 else 0)
        out.append((s / sr, sr / t, e))
    return out

def pitch_stats(path, t0=0.0, t1=1e9):
    sr = 16000
    x = load(path, sr)
    f0 = np.array([f for t, f, e in yin(x, sr) if f is not None and t0 <= t <= t1])
    if len(f0) < 5: return {'voicedFrames': int(len(f0))}
    st = 12 * np.log2(f0 / np.median(f0))
    return {'f0MedianHz': round(float(np.median(f0)), 1), 'f0RangeSt10to90': round(float(np.percentile(st, 90) - np.percentile(st, 10)), 2),
            'f0IqrSt': round(float(np.percentile(st, 75) - np.percentile(st, 25)), 2),
            'f0StdSt': round(float(np.std(st)), 2), 'voicedFrames': int(len(f0))}

def main():
    a = sys.argv[1:]
    path = a[0]
    if '--pitch-json' in a:
        print(json.dumps(pitch_stats(path))); return
    t0 = float(a[a.index('--from') + 1]) if '--from' in a else 0.0
    t1 = float(a[a.index('--to') + 1]) if '--to' in a else 1e9
    sr = 16000
    x = load(path, sr)
    v = [f for f in voicing(x, sr) if t0 <= f[0] <= t1]
    segs, cur = [], None
    for t, c, f0, edb in v:
        voiced = c > 0.55 and edb > -35
        if voiced and cur is None: cur = [t, t, [f0]]
        elif voiced: cur[1] = t; cur[2].append(f0)
        elif cur is not None: segs.append(cur); cur = None
    if cur: segs.append(cur)
    print('voiced segments:', [(round(s, 2), round(e, 2), int(np.median(f))) for s, e, f in segs])
    # energy runs (speech or fricative) above -35 dB
    runs, cur = [], None
    for t, c, f0, edb in v:
        on = edb > -35
        if on and cur is None: cur = [t, t]
        elif on: cur[1] = t
        elif cur is not None: runs.append(cur); cur = None
    if cur: runs.append(cur)
    print('energy runs  :', [(round(s, 2), round(e, 2)) for s, e in runs])
    if '--formants' in a:
        sr2 = 10000
        y = load(path, sr2)
        rows = []
        for s, e, _ in segs:
            t = s
            while t <= e:
                i = int(t * sr2); fr = y[max(0, i - 100):i + 100]
                fm = lpc_formants(fr, sr2) if len(fr) == 200 else []
                rows.append((round(t, 2), fm[:3]))
                t += 0.02
        for r in rows: print(r)

if __name__ == '__main__':
    main()
