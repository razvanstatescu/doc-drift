#!/usr/bin/env python3
"""Arrange a raw music take onto the film (bar-aligned splices, gain dips, filter sweeps, synthesized hits and risers).

    python3 -I tools/audio/arrange.py tools/audio/arrangements/<name>.json

Copied from the Satchel film (tools/audio-v3/arrange.py) and adapted: 48 kHz, 16-bit WAV out (TPDF dither), paths
relative to video/, optional peak target. Needs numpy + ffmpeg only. Splice seams sit 5 ms before the beat with a
30 ms equal-power crossfade, so downbeat transients are never smeared. Times in the edit list are on the grid clock:
dest file time = grid time + beatOffset (the source's first-beat offset), so beats in the file sit where the take's did.
"""
import json, os, subprocess, sys
import numpy as np

SR = 48000
HERE = os.path.dirname(os.path.abspath(__file__))
MKT = os.path.abspath(os.path.join(HERE, '..', '..'))  # video/


def load(path):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-ac', '2', '-ar', str(SR), '-f', 'f32le', '-'],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, dtype=np.float32).reshape(-1, 2).astype(np.float64)


def save_wav(y, path):
    """48 kHz 16-bit stereo WAV with TPDF dither."""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    rng = np.random.default_rng(1)
    d = (rng.random(y.shape) - rng.random(y.shape)) / 32768.0
    q = np.clip(np.round((y + d) * 32767.0), -32768, 32767).astype('<i2')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 's16le', '-ar', str(SR), '-ac', '2', '-i', '-',
                    '-c:a', 'pcm_s16le', path], input=q.tobytes(), check=True)


def splice(x, segs, off, dur, xf=0.030, pre=0.005):
    """Place source spans on the dest timeline. Seam = beat - pre; outgoing (cos) and incoming (sin) fade over [seam - xf, seam]."""
    n = int(round(dur * SR))
    k = int(round(xf * SR))
    fin, fout = np.sin(np.linspace(0, np.pi / 2, k)), np.cos(np.linspace(0, np.pi / 2, k))
    y = np.zeros((n, 2))
    seam = lambda t: int(round((t + off - pre) * SR))
    for i, s in enumerate(segs):
        first, last = i == 0, i == len(segs) - 1
        a = 0 if first else seam(s['t0']) - k
        b = n if last else seam(s['t1'])
        seg = np.zeros((b - a, 2))
        if not s.get('silence'):
            shift = int(round((s['s0'] - s['t0']) * SR))  # source index = dest index + shift
            lo, hi = max(0, a + shift), min(len(x), b + shift)
            if hi > lo:
                seg[lo - (a + shift):hi - (a + shift)] = x[lo:hi]
        if not first:
            seg[:k] *= fin[:, None]
        if not last:
            seg[-k:] *= fout[:, None]
        y[a:b] += seg
    return y


def gain_env(n, gains, off, ramp=0.02):
    g = np.ones(n)
    for e in gains:
        a, b = int(round((e['t0'] + off) * SR)), min(n, int(round((e['t1'] + off) * SR)))
        lin = 10 ** (e['db'] / 20)
        if e.get('ramp') and e.get('curve') == 'db':
            g[a:b] = 10 ** (np.linspace(20 * np.log10(max(g[a - 1], 1e-6)), e['db'], b - a) / 20)
        elif e.get('ramp'):
            g[a:b] = np.linspace(g[a - 1], lin, b - a)
        else:
            g[a:b] = lin
    # smooth hard steps (5 ms)
    k = int(0.005 * SR)
    return np.convolve(g, np.ones(k) / k, mode='same')


def sweeps(y, sws, off, N=2048, H=512):
    """Time-varying 2nd-order-ish low/high-pass via STFT magnitude masks (sqrt-Hann, 75% overlap, exact OLA)."""
    if not sws:
        return y
    win = np.sqrt(np.hanning(N + 1)[:N])
    freqs = np.fft.rfftfreq(N, 1 / SR)
    out = y.copy()
    for sw in sws:
        a = max(0, int((sw['t0'] + off - 0.2) * SR))  # a sweep at the very start must not wrap to the end
        b = min(len(y), int((sw['t1'] + off + 0.2) * SR))
        seg = out[a:b]  # read the running result, so adjacent sweeps compose (the Satchel copy re-read y here)
        L = len(seg)
        pad = np.zeros((L + 2 * N, 2))
        pad[N:N + L] = seg
        acc = np.zeros_like(pad)
        norm = np.zeros(len(pad))
        for start in range(0, len(pad) - N, H):
            tc = (a + start - N + N / 2) / SR - off  # frame centre on the grid timeline
            fr = pad[start:start + N] * win[:, None]
            F = np.fft.rfft(fr, axis=0)
            if sw['t0'] <= tc < sw['t1'] - N / 2 / SR:  # never touch the frame holding the next downbeat
                f1 = np.maximum(freqs, 1)
                if sw['type'] == 'strip':
                    # "the band drops to bass and tick": low-pass + a quiet high band, faded in/out over `ramp` s
                    m = 1 / np.sqrt(1 + (f1 / sw['bassHz']) ** 4) + sw.get('tickGain', 0.3) / np.sqrt(1 + (sw['tickHz'] / f1) ** 4)
                    ramp = sw.get('ramp', 0.15)
                    w = min(1.0, (tc - sw['t0']) / ramp, (sw['t1'] - tc) / ramp)
                    m = (1 - w) + w * np.minimum(1.0, m)
                else:
                    p = (tc - sw['t0']) / (sw['t1'] - sw['t0'])
                    fc = sw['fromHz'] * (sw['toHz'] / sw['fromHz']) ** p
                    r = f1 / fc
                    m = 1 / np.sqrt(1 + r ** 4) if sw['type'] == 'lowpass' else 1 / np.sqrt(1 + (1 / r) ** 4)
                F *= m[:, None]
            acc[start:start + N] += np.fft.irfft(F, n=N, axis=0) * win[:, None]
            norm[start:start + N] += win ** 2
        rec = acc[N:N + L] / np.maximum(norm[N:N + L], 1e-9)[:, None]
        # crossfade the processed region back in over 20 ms at both ends (it is identical there anyway)
        out[a:b] = rec
    return out


def thud(level_db, dur=0.6):
    """A dull, short low thud (a felt mallet on a box): sine 95 -> 48 Hz, fast decay, a little body noise."""
    t = np.arange(int(dur * SR)) / SR
    f = 48 + (95 - 48) * np.exp(-t / 0.03)
    s = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.12) * np.minimum(1, t / 0.002)
    rng = np.random.default_rng(7)
    n = rng.standard_normal(len(t)) * np.exp(-t / 0.015) * 0.15
    k = int(0.004 * SR)
    n = np.convolve(n, np.ones(k) / k, mode='same')  # dull it down
    s = s + n
    return s / np.max(np.abs(s)) * 10 ** (level_db / 20)


def heartbeat(level_db):
    """One lub-dub: two soft low thumps 0.22 s apart, the second 4 dB softer."""
    def thump(dur=0.28, f0=62, f1=42):
        t = np.arange(int(dur * SR)) / SR
        f = f1 + (f0 - f1) * np.exp(-t / 0.05)
        return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.07) * np.minimum(1, t / 0.006)
    a = thump(); b = thump() * 10 ** (-4 / 20)
    out = np.zeros(int(0.22 * SR) + len(b))
    out[:len(a)] += a
    out[int(0.22 * SR):] += b
    return out / np.max(np.abs(out)) * 10 ** (level_db / 20)


def tick(level_db, seed=0):
    """A quiet closed hi-hat tick: high-passed noise, 25 ms decay."""
    rng = np.random.default_rng(seed)
    t = np.arange(int(0.06 * SR)) / SR
    n = rng.standard_normal(len(t))
    n = np.diff(np.diff(n, prepend=0), prepend=0)  # tilt up (2nd difference)
    s = n * np.exp(-t / 0.025)
    return s / np.max(np.abs(s)) * 10 ** (level_db / 20)


def riser(dur, level_db, f0=180.0, f1=2400.0, seed=3):
    """A synth riser that ends on its top: an exponential saturated-sine glide plus noise whose low-pass opens
    (800 Hz -> 12 kHz), with an accelerating crescendo (-24 dB -> 0 dB). It is meant to be cut dead by a hard stop."""
    t = np.arange(int(dur * SR)) / SR
    p = t / dur
    f = f0 * (f1 / f0) ** p
    ph = 2 * np.pi * np.cumsum(f) / SR
    tone = 0.5 * np.tanh(2.5 * np.sin(ph)) + 0.25 * np.sin(2 * ph)
    rng = np.random.default_rng(seed)
    n = rng.standard_normal(len(t))
    a = np.exp(-2 * np.pi * (800 * (12000 / 800) ** p) / SR)
    y = np.empty_like(n)
    acc = 0.0
    for i in range(len(n)):
        acc = a[i] * acc + (1 - a[i]) * n[i]
        y[i] = acc
    y /= np.std(y) + 1e-9
    env = 10 ** ((-24 + 24 * p ** 2) / 20) * np.minimum(1, t / 0.02)
    s = (0.6 * tone + 0.25 * y) * env
    return s / np.max(np.abs(s)) * 10 ** (level_db / 20)


def sub_hit(level_db, dur=2.6):
    t = np.arange(int(dur * SR)) / SR
    f = 36 + (78 - 36) * np.exp(-t / 0.09)
    ph = 2 * np.pi * np.cumsum(f) / SR
    env = np.exp(-t / 0.65) * np.minimum(1, t / 0.004)
    env[-int(0.3 * SR):] *= np.linspace(1, 0, int(0.3 * SR))
    s = np.sin(ph) * env
    s += 0.25 * np.tanh(3 * s)  # a little harmonic weight so it reads on laptop speakers
    s /= np.max(np.abs(s))
    return s * 10 ** (level_db / 20)


def main():
    cfg_path = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, 'arrangement.json')
    cfg = json.load(open(cfg_path))
    off, dur = cfg['beatOffset'], cfg['durationSec']
    x = load(os.path.join(MKT, cfg['source']))
    r = cfg.get('tempoRatio', 1.0)
    if r != 1.0:
        # band-limited FFT resample: plays the take r times faster (tempo * r, pitch + 1200*log2(r) cents)
        n2 = int(round(len(x) / r))
        X = np.fft.rfft(x, axis=0)
        x = np.fft.irfft(X[:n2 // 2 + 1], n=n2, axis=0) * (n2 / len(x))
    y = splice(x, cfg['segments'], off, dur)
    y = sweeps(y, cfg.get('sweeps', []), off)
    y *= gain_env(len(y), cfg.get('gain', []), off)[:, None]
    def add(sig, t, stereo=None):
        a = int(round((t + off) * SR))
        b = min(len(y), a + len(sig))
        if b > a:
            y[a:b] += sig[:b - a, None] if stereo is None else sig[:b - a]
    for e in cfg.get('synth', []):
        if e['type'] == 'thud':
            add(thud(e['db']), e['t'])
        elif e['type'] == 'heartbeat':
            t = e['t0']
            while t < e['t1'] - 1e-9:
                add(heartbeat(e['db']), t); t += e['every']
        elif e['type'] == 'riser':
            add(riser(e['t1'] - e['t0'], e['db'], e.get('fromHz', 180.0), e.get('toHz', 2400.0)), e['t0'])
        elif e['type'] == 'ticks':
            t, k = e['t0'], 0
            while t < e['t1'] - 1e-9:
                add(tick(e['db'] - (3 if k % 2 else 0), seed=k), t); t += e['every']; k += 1
    for h in cfg.get('subHits', []):
        s = sub_hit(h['db'])
        a = int(round((h['t'] + off - 0.004) * SR))
        b = min(len(y), a + len(s))
        y[a:b] += s[:b - a, None]
    # end: make sure the last endFadeMs (default 50 ms) ramp to zero (a hard stop uses a few ms: no click, still a stop)
    k = max(1, int(cfg.get('endFadeMs', 50) / 1000 * SR))
    y[-k:] *= np.linspace(1, 0, k)[:, None]
    peak = np.max(np.abs(y))
    # soft-knee clip above 0.9 only (touches just the few samples where a sub hit stacks on a kick)
    th = 0.9
    over = np.abs(y) > th
    y[over] = np.sign(y[over]) * (th + (0.99 - th) * np.tanh((np.abs(y[over]) - th) / (0.99 - th)))
    print(json.dumps({'samplesSoftClipped': int(over.sum())}))
    # stem headroom: sample peak at cfg['peakDb'] (default -3 dBFS); the master limiter sets the final level
    y *= 10 ** (cfg.get('peakDb', -3) / 20) / max(1e-9, float(np.max(np.abs(y))))
    out = os.path.join(MKT, cfg['out'])
    save_wav(y, out)
    print(json.dumps({'out': out, 'seconds': len(y) / SR, 'peakBefore': round(float(peak), 3), 'segments': len(cfg['segments'])}))


if __name__ == '__main__':
    main()
