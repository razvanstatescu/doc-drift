#!/usr/bin/env python3
"""Merge meta.json (source facts) with the measured geometry (cache/geom-*.json) and capture records
(cache/rec-*.json) into src/data/plates.json, and draw the contact sheet public/plates/contact.png.

Usage: python3 -I tools/plates/build-json.py <video-root>
"""
import glob, json, os, sys
from PIL import Image, ImageDraw, ImageFont

root = sys.argv[1]
here = os.path.join(root, 'tools/plates')
cache = os.path.join(here, 'cache')
meta = json.load(open(os.path.join(here, 'meta.json')))
ORDER = ['A2-01', 'D1-02', 'D1-04', 'D1-11', 'D1-21', 'D1-12',
         'D1-06', 'D1-07', 'D2-03', 'D1-03', 'D2-04', 'D2-01', 'D1-01', 'D1-05', 'D2-02',
         'A1-06', 'A4-02', 'A1-07', 'A1-13', 'R3', 'R3-title', 'A2-02', 'A1-01', 'A1-03', 'A1-05', 'A2-05', 'A3-01', 'A4-01-title', 'A4-01']
DROPPED = json.load(open(os.path.join(here, 'dropped.json'))) if os.path.exists(os.path.join(here, 'dropped.json')) else []

plates = []
for pid in ORDER:
    gp = os.path.join(cache, f'geom-{pid}.json')
    rp = os.path.join(cache, f'rec-{pid}.json')
    if not (os.path.exists(gp) and os.path.exists(rp)):
        continue
    g, r, m = json.load(open(gp)), json.load(open(rp)), meta[pid]
    notes = list(m.get('notes', [])) + list(r.get('notes', []))
    notes.append(f"Captured {r['capturedAt'][:16].replace('T', ' ')} UTC in Chrome at {r['viewport']['w']}x{r['viewport']['h']} CSS px, deviceScaleFactor {r['dsf']}, light scheme; full viewport in public/plates/raw/{pid}.png (unblurred, not for the film).")
    if r.get('consent'):
        notes.append('Consent notice dismissed: ' + ', '.join(r['consent']))
    plates.append({
        'id': pid,
        'bar': r['bar'],
        'kind': 'real',
        'companionOf': r.get('of'),
        'file': g['file'],
        'width': g['width'],
        'height': g['height'],
        'source': m['source'],
        'label': m['label'],
        'url': r['url'],
        'finalUrl': r.get('finalUrl'),
        'date': m['date'],
        'dateNote': m.get('dateNote'),
        'readOn': r['capturedAt'][:10],
        'text': m['text'],
        'exactOnPage': r['key']['exact'],
        'keyPhrases': [{'text': p['text'], 'box': p['box'], 'lines': p['lines']} for p in g['keyPhrases']],
        'regions': g.get('regions') or {},
        'licence': m['licence'],
        'rightsBasis': m.get('tier'),
        'blurred': g['blurred'],
        'notes': notes,
        'warnings': g.get('warnings', []),
    })

doc = {
    'generated': '2026-11-13',
    'by': 'evidence agent (tools/plates/: capture.mjs, process.py, build-json.py)',
    'units': 'pixels in the plate PNG, [x, y, w, h] from the top-left; plates are captured at deviceScaleFactor 3',
    'readOn': '2026-11-13',
    'rules': 'Words are never changed. Blurs cover private names, handles, avatars, and one article photo behind a headline (A1-05). CSS was used only to hide consent notices, ads, promos and sidebar chrome.',
    'balance': [
        'Rovo appears in three plates (A1-06, A1-07, A4-02). Research 6.3 allows at most two that put Rovo in a bad light: pick two, keep A1-06 and A4-02 apart, and give the last word to A4-01.',
        'Wikimedia appears twice (D1-06, D1-07) and Hacker News twice (D1-04, D1-21); the source appendix suggests one Wikimedia item.',
        'Microsoft or Copilot appears three times (D1-05, A1-01, A1-03).',
        'Companions R3-title and A4-01-title are optional extra plates of the same pages (title and date).',
        'Grade every third-party plate the same way (research 6.3: about 25% desaturated, light pages to about 0.6 brightness). A3-01 carries orange in the site graphic and D1-03 a red masthead: grade them so no amber reads before the reveal.',
    ],
    'plates': plates,
    'dropped': DROPPED,
}
out = os.path.join(root, 'src/data/plates.json')
json.dump(doc, open(out, 'w'), indent=1, ensure_ascii=False)
print('wrote', out, len(plates), 'plates')

# Contact sheet: 4 columns, each plate scaled into a 880x560 box, key phrases outlined green, blurs magenta.
COLS, CW, CH, PAD, LAB = 4, 880, 560, 24, 54
rows = (len(plates) + COLS - 1) // COLS
sheet = Image.new('RGB', (COLS * (CW + PAD) + PAD, rows * (CH + LAB + PAD) + PAD), (24, 26, 30))
d = ImageDraw.Draw(sheet)
try:
    font = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf', 22)
except Exception:
    font = ImageFont.load_default()
for i, p in enumerate(plates):
    im = Image.open(os.path.join(root, 'public', p['file'])).convert('RGB')
    sc = min(CW / im.width, CH / im.height)
    tw, th = max(1, int(im.width * sc)), max(1, int(im.height * sc))
    im = im.resize((tw, th), Image.LANCZOS)
    dd = ImageDraw.Draw(im)
    for kp in p['keyPhrases']:
        for (x, y, w, h) in kp['lines']:
            dd.rectangle([x * sc, y * sc, (x + w) * sc, (y + h) * sc], outline=(40, 220, 90), width=2)
    for b in p['blurred']:
        x, y, w, h = b['box']
        dd.rectangle([x * sc, y * sc, (x + w) * sc, (y + h) * sc], outline=(230, 40, 200), width=2)
    c, rr = i % COLS, i // COLS
    x0 = PAD + c * (CW + PAD)
    y0 = PAD + rr * (CH + LAB + PAD)
    d.text((x0, y0), f"{p['id']}  bar {p['bar']}  {p['width']}x{p['height']}", fill=(235, 235, 235), font=font)
    d.text((x0, y0 + 26), p['label'][:70], fill=(160, 170, 180), font=font)
    sheet.paste(im, (x0, y0 + LAB))
sheet.save(os.path.join(root, 'public/plates/contact.png'), optimize=True)
print('contact sheet', sheet.size)
