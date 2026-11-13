#!/usr/bin/env python3
"""Write public/clips/clips.json from the cut measurements (cache/clips-measure.json), Scribe word timings of
the finished cuts (cache/stt-<id>-cut.json), the licence re-read (cache/licence-read.json) and the facts below.
Usage: python3 -I tools/plates/clips-json.py <video-root>
"""
import json, os, sys

root = sys.argv[1]
cache = os.path.join(root, 'tools/plates/cache')
measure = {m['name']: m for m in json.load(open(os.path.join(cache, 'clips-measure.json')))}
lic = json.load(open(os.path.join(cache, 'licence-read.json'))) if os.path.exists(os.path.join(cache, 'licence-read.json')) else {}


def ts(s):
    m, sec = divmod(s, 60)
    return f"{int(m):02d}:{sec:06.3f}"


FACTS = {
    'ariel': dict(
        speaker='Mikey Ariel', title="Docs or it didn't happen!", event='foss-north 2019 (Gothenburg)', channel='foss-north',
        uploaded='2019-04-19', url='https://www.youtube.com/watch?v=Rq98-audaEc',
        text='Bad documentation or outdated documentation is worse than no documentation.',
        audioSource='YouTube format 251 (Opus, 48 kHz, about 114 kb/s), section 16:05-16:45 decoded to PCM with an accurate seek; no processing besides the trim and the fades',
        videoSource='YouTube format 137 (H.264 1080p, 25 fps), same section, re-encoded once (x264 CRF 16)',
        speechOnOff=[0.25, 4.75],
        quality='Clear conference audio: -29.0 LUFS (needs about +13 dB to sit near -16), room tone -59 to -64 dBFS (about 30-35 dB under speech peaks), no clipping, speech bandwidth about 6 kHz. She runs straight on into "I will say this now" with no pause, so the out point sits in the brief voiced dip before it (about -44 dBFS in a 5 ms window) with a 25 ms fade; Scribe hears no trailing word in the cut.',
        picture='Wide stage shot: the speaker small at the left beside a projected slide ("EXAMPLES"). Usable only cropped to her and stylised.',
        alternates=['With her tag line, 16:23.16 to 16:29.97: "... I will say this now, and I will stand by it." (clean pause after "it.", next word at 16:30.12). Not cut: too long for the barrage.'],
    ),
    'osmani': dict(
        speaker='Addy Osmani', title='Stop Wasting Tokens: The Art of Context Engineering', event='talk recording on his own channel', channel='Addy Osmani',
        uploaded='2025-09-11', url='https://www.youtube.com/watch?v=zMM5zqesL1g',
        text='Quality context determines if agents succeed or fail.',
        audioSource='YouTube format 251-9 (Opus, 48 kHz, about 104 kb/s, the original English track; the video also carries auto-dubbed tracks), section 13:40-14:12 decoded to PCM; no processing besides the trim and the fades',
        videoSource='YouTube format 137 (H.264 1080p, 30 fps), same section, re-encoded once (x264 CRF 16)',
        speechOnOff=[0.25, 4.05],
        quality='Studio-clean: -20.5 LUFS, true peak -2.1 dBTP, gated silence at -86 dBFS, clean 0.25 s lead-in and 0.15 s tail (a breath starts 20 ms after the out point). The cleanest of the three.',
        picture='A slide ("IT\'S NOT THE PROMPT, IT\'S THE CONTEXT", his site, two book covers, an illustration) with his webcam inset top right. Book covers and the illustration are third-party: crop to the webcam inset or do not use the picture.',
        alternates=['With the lead-in, 13:50.77 to 13:59.56: "So in conclusion, remember, it\'s not the prompt, it\'s the context. Quality context determines if agents succeed or fail." (not cut)'],
    ),
    'khirnov': dict(
        speaker='Anton Khirnov', title='Multiview decoding in libavcodec and ffmpeg CLI', event='FOSDEM 2025, Open Media devroom (room K.3.401), 2 February 2025', channel='FOSDEM video archive',
        uploaded='2025-02-02', url='https://video.fosdem.org/2025/k3401/fosdem-2025-6023-multiview-decoding-in-libavcodec-and-ffmpeg-cli.mp4',
        pageUrl='https://archive.fosdem.org/2025/schedule/event/fosdem-2025-6023-multiview-decoding-in-libavcodec-and-ffmpeg-cli/',
        text="Of course, nobody ever documents things, and if you do it, uh, it will get out of date eventually because somebody updates the code and doesn't update the documentation.",
        audioSource='FOSDEM MP4 (AAC mono 48 kHz), section 10:25-11:00 decoded to PCM; no processing besides the trim and the fades',
        videoSource='FOSDEM MP4 (H.264 1080p), same section, re-encoded once (x264 CRF 16)',
        speechOnOff=[0.2, 8.3],
        quality='Room microphone: -23.0 LUFS, noise floor -54 to -58 dBFS (about 26 dB under median speech), narrow bandwidth (99.5% of energy under 3.9 kHz), an "uh" mid-sentence and 8.6 s long. Usable only as a stylised alternate.',
        picture='Slides with the FOSDEM 25 frame and a small camera inset of the speaker bottom right.',
        alternates=['Scribe hears "updates the code" where the research transcript guessed "changes the code".', 'No clean shorter cut: "out of date eventually" runs straight into "because" with no pause.'],
    ),
}

clips = []
for cid in ['ariel', 'osmani', 'khirnov']:
    m, f = measure[cid], FACTS[cid]
    stt = json.load(open(os.path.join(cache, f'stt-{cid}-cut.json')))
    words = [{'text': w['text'], 'start': round(w['start'], 3), 'end': round(w['end'], 3)} for w in stt['result']['words'] if w['type'] == 'word']
    L = lic.get(cid, {})
    clips.append({
        'id': cid,
        'speaker': f['speaker'],
        'title': f['title'],
        'event': f['event'],
        'channel': f['channel'],
        'published': f['uploaded'],
        'url': f['url'],
        **({'pageUrl': f['pageUrl']} if 'pageUrl' in f else {}),
        'licence': ((L.get('read') or {}).get('licence') or 'see licenceEvidence').replace('Licence Creative', 'Creative'),
        'licenceAsShown': 'YouTube watch page, Video details › Licence (en-GB interface)' if 'youtube' in f['url'] else 'FOSDEM talk page footer, next to a CC BY badge',
        'licenceReadAt': L.get('readAt'),
        'licenceEvidence': L.get('file'),
        'file': m['file'],
        'video': m['video'],
        'sourceIn': ts(m['sourceIn']),
        'sourceOut': ts(m['sourceOut']),
        'sourceInSeconds': m['sourceIn'],
        'sourceOutSeconds': m['sourceOut'],
        'durationSeconds': m['durationSeconds'],
        'text': f['text'],
        'words': words,
        'wordsNote': 'Scribe (scribe_v3) on the finished cut; seconds from the start of the file. Scribe word starts run up to about 70 ms late against the waveform.',
        'speechOnsetSeconds': f['speechOnOff'][0],
        'speechEndSeconds': f['speechOnOff'][1],
        'fadesMs': m['fadesMs'],
        'format': {'sampleRate': 48000, 'bitDepth': 24, 'channels': m['channels']},
        'loudness': m['loudness'],
        'samplePeakDbfs': m['samplePeakDbfs'],
        'clippedSamples': m['clippedSamples'],
        'noiseFloorDbfs': m['noiseFloorDbfs'],
        'speechLevelDbfs': m['speechLevelDbfs'],
        'bandwidth995Hz': m['bandwidth995Hz'],
        'audioSource': f['audioSource'],
        'videoSource': f['videoSource'],
        'picture': f['picture'],
        'quality': f['quality'],
        'alternates': f['alternates'],
        'changes': 'audio trimmed (short fades at the cut points only); picture to be cropped and stylised in the edit',
        'endorsement': 'Use does not imply endorsement.',
    })

doc = {
    'generated': '2026-11-13',
    'by': 'evidence agent (tools/plates/clips-*.{sh,mjs,py})',
    'recommended': 'ariel',
    'recommendation': 'Mikey Ariel (Decision 4): the exact line, 4.8 s, clean lead-in. It is quieter and roomier than Osmani, so lift it about +13 dB and keep nothing else under her words. Osmani is the clean fallback; Khirnov only if the code-change wording matters more than sound.',
    'nobodyListened': 'Measurements only: nobody has listened to these cuts yet. Listen before locking.',
    'clips': clips,
}
out = os.path.join(root, 'public/clips/clips.json')
json.dump(doc, open(out, 'w'), indent=1, ensure_ascii=False)
print('wrote', out)
