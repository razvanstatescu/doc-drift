#!/usr/bin/env python3
"""Turn raw captures into plates: crop (CSS rect x DSF), blur private identities (and, where a headline sits on an
article photo, blur the photo around the words), convert key-phrase boxes to plate pixels.

Usage: python3 -I tools/plates/process.py <video-root> [id ...]
Reads  tools/plates/cache/rec-<id>.json and public/plates/raw/<id>.png
Writes public/plates/<id>.png and tools/plates/cache/geom-<id>.json
Words are never touched: blur boxes come from the DOM boxes of names, handles and avatars only.
"""
import glob, json, math, os, sys
from PIL import Image, ImageDraw, ImageFilter

root = sys.argv[1]
only = set(sys.argv[2:])
cache = os.path.join(root, 'tools/plates/cache')
out_dir = os.path.join(root, 'public/plates')


def dev(r, s):
    return (math.floor(r['x'] * s), math.floor(r['y'] * s), math.ceil((r['x'] + r['w']) * s), math.ceil((r['y'] + r['h']) * s))


def to_plate(r, crop, s, c0):
    x0 = round((r['x'] - crop['x']) * s)
    y0 = round((r['y'] - crop['y']) * s)
    return [x0, y0, round(r['w'] * s), round(r['h'] * s)]


def anonymise(img, box):
    """Pixelate then blur a box in place (unrecoverable at any zoom)."""
    x0, y0, x1, y1 = box
    x0, y0 = max(0, x0), max(0, y0)
    x1, y1 = min(img.width, x1), min(img.height, y1)
    if x1 - x0 < 2 or y1 - y0 < 2:
        return
    reg = img.crop((x0, y0, x1, y1))
    h = y1 - y0
    block = max(6, h // 3)
    small = reg.resize((max(1, (x1 - x0) // block), max(1, (y1 - y0) // block)), Image.BILINEAR)
    reg = small.resize(reg.size, Image.NEAREST).filter(ImageFilter.GaussianBlur(max(4, h / 4)))
    img.paste(reg, (x0, y0))


summary = []
for path in sorted(glob.glob(os.path.join(cache, 'rec-*.json'))):
    rec = json.load(open(path))
    pid = rec['id']
    if only and pid not in only:
        continue
    if not rec.get('ok'):
        print(pid, 'SKIP (capture failed):', rec.get('error'))
        continue
    s = rec['dsf']
    raw = Image.open(os.path.join(root, rec['raw'])).convert('RGB')
    crop = dict(rec['crop'])
    warn = []
    # clamp crop to the viewport
    vw, vh = raw.width / s, raw.height / s
    if crop['x'] < 0 or crop['y'] < 0 or crop['x'] + crop['w'] > vw + 0.5 or crop['y'] + crop['h'] > vh + 0.5:
        warn.append(f"crop clamped to viewport (was {crop})")
        x1 = min(vw, crop['x'] + crop['w']); y1 = min(vh, crop['y'] + crop['h'])
        crop['x'] = max(0, crop['x']); crop['y'] = max(0, crop['y'])
        crop['w'] = x1 - crop['x']; crop['h'] = y1 - crop['y']
    cx0, cy0, cx1, cy1 = dev(crop, s)
    img = raw.copy()
    blurred_list = []
    # Photo behind a headline: blur the area except the text lines (feathered mask).
    be = rec.get('blurExcept')
    if be:
        area = dev(be['area'], s)
        big = img.filter(ImageFilter.GaussianBlur(28 * s / 3))
        mask = Image.new('L', img.size, 0)
        d = ImageDraw.Draw(mask)
        d.rectangle(area, fill=255)
        for k in be['keep']:
            if not k:
                continue
            kx0, ky0, kx1, ky1 = dev(k, s)
            d.rectangle((kx0 - 8, ky0 - 6, kx1 + 8, ky1 + 6), fill=0)
        mask = mask.filter(ImageFilter.GaussianBlur(5))
        img = Image.composite(big, img, mask)
        blurred_list.append({'what': be.get('why', 'photo'), 'box': to_plate(be['area'], crop, s, None), 'method': 'gaussian blur except the text lines'})
    for b in rec.get('blurs') or []:
        bx = dev(b, s)
        if bx[2] < cx0 or bx[0] > cx1 or bx[3] < cy0 or bx[1] > cy1:
            continue  # outside the plate
        anonymise(img, bx)
        blurred_list.append({'what': b.get('why', 'identity'), 'box': to_plate(b, crop, s, None), 'method': 'pixelate + blur'})
    plate = img.crop((cx0, cy0, cx1, cy1))
    if plate.width < 1600:
        warn.append(f'plate only {plate.width} px wide')
    os.makedirs(out_dir, exist_ok=True)
    plate.save(os.path.join(out_dir, f'{pid}.png'), optimize=True)
    phrases = []
    for p in rec.get('phrases') or []:
        if p.get('missing'):
            warn.append(f"phrase not in crop: {p['text']}")
            continue
        phrases.append({'text': p['text'], 'exact': p['exact'], 'box': to_plate(p['union'], crop, s, None), 'lines': [to_plate(r, crop, s, None) for r in p['rects']]})
    regions = {}
    for k, r in (rec.get('regions') or {}).items():
        if r:
            regions[k] = to_plate(r, crop, s, None)
    geom = {'id': pid, 'file': f'plates/{pid}.png', 'width': plate.width, 'height': plate.height, 'keyPhrases': phrases, 'blurred': blurred_list, 'regions': regions,
            'cropCss': crop, 'viewport': rec['viewport'], 'warnings': warn}
    json.dump(geom, open(os.path.join(cache, f'geom-{pid}.json'), 'w'), indent=1)
    summary.append((pid, plate.width, plate.height, len(blurred_list), warn))
    print(pid, f'{plate.width}x{plate.height}', f'blurs={len(blurred_list)}', ('WARN ' + '; '.join(warn)) if warn else '')
