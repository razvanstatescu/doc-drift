#!/usr/bin/env python3
"""Cut each voice clip from its exact-time section (see clips-fetch-exact.sh) and measure it.

Usage: python3 -I tools/plates/clips-cut.py <download-root> <video-root>
  <download-root>/<name>-exact/<name>-audio.wav  (PCM, sample 0 = sectionStart in the source)
  <download-root>/<name>-exact/<name>-video.mp4  (same start)
Writes <video-root>/public/clips/<name>.wav (48 kHz, source channels, 24-bit) and <name>.mp4, and prints
measurements as JSON for clips.json. In/out points were chosen from Scribe word times plus a 5 ms energy scan
(see clips.json notes). Fades are only the short ramps at the cut points; nothing else is processed.
"""
import json, subprocess, sys
import numpy as np

root, vroot = sys.argv[1], sys.argv[2]
SR = 48000

CLIPS = [
    # in/out are source seconds. fade = (in ms, out ms).
    dict(name='ariel', sectionStart=965.0, cutIn=983.16, cutOut=987.935, fade=(10, 25), fps=25),
    dict(name='osmani', sectionStart=820.0, cutIn=835.36, cutOut=839.56, fade=(10, 10), fps=30),
    dict(name='khirnov', sectionStart=625.0, cutIn=639.47, cutOut=648.06, fade=(10, 10), fps=30),
]


def run(args, **kw):
    return subprocess.run(args, check=True, capture_output=True, **kw)


def load(path, mono=False):
    ch = int(run(['ffprobe', '-v', 'error', '-show_entries', 'stream=channels', '-of', 'csv=p=0', path], text=True).stdout.strip())
    raw = run(['ffmpeg', '-v', 'error', '-i', path, '-f', 'f32le', '-acodec', 'pcm_f32le'] + (['-ac', '1'] if mono else []) + ['-']).stdout
    a = np.frombuffer(raw, dtype=np.float32)
    return a.reshape(-1, 1 if mono else ch)


def rms_db(x):
    return float(20 * np.log10(np.sqrt(np.mean(np.square(x, dtype=np.float64))) + 1e-12))


def windows_db(x, win=0.05):
    w = int(win * SR)
    n = len(x) // w
    r = np.sqrt((x[: n * w].reshape(n, w).astype(np.float64) ** 2).mean(axis=1))
    return 20 * np.log10(r + 1e-12)


def ebur128(path):
    p = subprocess.run(['ffmpeg', '-nostats', '-hide_banner', '-i', path, '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True)
    txt = p.stderr[p.stderr.rfind('Summary:'):]
    def grab(label):
        import re
        m = re.search(label + r'\s*:?\s*(-?[\d.]+|-inf)', txt)
        return float(m.group(1)) if m and m.group(1) != '-inf' else None
    return {'integratedLufs': grab(r'I'), 'lraLu': grab(r'LRA'), 'truePeakDbtp': grab(r'Peak')}


out = []
for c in CLIPS:
    n = c['name']
    sec_wav = f"{root}/{n}-exact/{n}-audio.wav"
    sec_mp4 = f"{root}/{n}-exact/{n}-video.mp4"
    a, b = c['cutIn'] - c['sectionStart'], c['cutOut'] - c['sectionStart']
    fi, fo = c['fade'][0] / 1000, c['fade'][1] / 1000
    dur = b - a
    wav = f"{vroot}/public/clips/{n}.wav"
    mp4 = f"{vroot}/public/clips/{n}.mp4"
    af = f"atrim=start={a:.6f}:end={b:.6f},asetpts=PTS-STARTPTS,afade=t=in:st=0:d={fi},afade=t=out:st={dur - fo:.6f}:d={fo}"
    run(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-i', sec_wav, '-af', af, '-c:a', 'pcm_s24le', '-ar', str(SR), wav])
    vf = f"trim=start={a:.6f}:end={b:.6f},setpts=PTS-STARTPTS"
    run(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-i', sec_mp4, '-i', wav, '-filter_complex', f"[0:v]{vf}[v]", '-map', '[v]', '-map', '1:a',
         '-c:v', 'libx264', '-preset', 'slow', '-crf', '16', '-pix_fmt', 'yuv420p', '-r', str(c['fps']), '-c:a', 'aac', '-b:a', '256k', '-ar', str(SR),
         '-movflags', '+faststart', '-shortest', mp4])
    # Measurements
    sec = load(sec_wav, mono=True)[:, 0]
    cut = load(wav, mono=True)[:, 0]
    full = load(wav)
    stereo_note = None
    if full.shape[1] == 2:
        corr = float(np.corrcoef(full[:, 0], full[:, 1])[0, 1])
        stereo_note = f"2 channels, L/R correlation {corr:.6f} (effectively dual mono)"
    wdb = windows_db(sec)
    loud = ebur128(wav)
    pre = cut[: int(0.08 * SR)]
    post = cut[-int(0.08 * SR):]
    speech = windows_db(cut)
    # bandwidth: frequency below which 99.5% of the clip's spectral energy lies
    spec = np.abs(np.fft.rfft(cut * np.hanning(len(cut)))) ** 2
    freqs = np.fft.rfftfreq(len(cut), 1 / SR)
    cum = np.cumsum(spec) / spec.sum()
    bw = float(freqs[np.searchsorted(cum, 0.995)])
    peak = float(np.max(np.abs(full)))
    clipped = int(np.sum(np.abs(full) >= 0.999))
    m = dict(
        name=n,
        file=f"clips/{n}.wav",
        video=f"clips/{n}.mp4",
        sourceIn=c['cutIn'], sourceOut=c['cutOut'], durationSeconds=round(dur, 3),
        fadesMs=list(c['fade']),
        loudness=loud,
        samplePeakDbfs=round(20 * np.log10(peak + 1e-12), 2),
        clippedSamples=clipped,
        noiseFloorDbfs=dict(sectionP5=round(float(np.percentile(wdb, 5)), 1), sectionP10=round(float(np.percentile(wdb, 10)), 1),
                            first80msOfCut=round(rms_db(pre), 1), last80msOfCut=round(rms_db(post), 1)),
        speechLevelDbfs=dict(p50=round(float(np.percentile(speech, 50)), 1), p90=round(float(np.percentile(speech, 90)), 1)),
        bandwidth995Hz=round(bw),
        channels=stereo_note or f"{full.shape[1]} channel",
    )
    out.append(m)
print(json.dumps(out, indent=1))
