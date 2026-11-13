#!/usr/bin/env python3
"""Add a dated caption strip below a screenshot (outside the page area).
Usage: caption.py <in.png> <out.png> <text> [x,y,w,h crop in image px]"""
import sys
from PIL import Image, ImageDraw, ImageFont

src, dst, text = sys.argv[1], sys.argv[2], sys.argv[3]
im = Image.open(src).convert('RGB')
if len(sys.argv) > 4 and sys.argv[4]:
    x, y, w, h = [int(v) for v in sys.argv[4].split(',')]
    im = im.crop((x, y, min(im.width, x + w), min(im.height, y + h)))
if im.height > 6000:  # keep full-page captures reasonable
    im = im.crop((0, 0, im.width, 6000))
size = max(22, im.width // 70)
try:
    font = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf', size)
except Exception:
    font = ImageFont.load_default()
# wrap the caption to the image width
words, lines, cur = text.split(' '), [], ''
d0 = ImageDraw.Draw(im)
for w in words:
    t = (cur + ' ' + w).strip()
    if d0.textlength(t, font=font) > im.width - 2 * size:
        lines.append(cur)
        cur = w
    else:
        cur = t
lines.append(cur)
strip_h = int(size * 1.5 * len(lines) + size)
out = Image.new('RGB', (im.width, im.height + strip_h), (20, 20, 20))
out.paste(im, (0, 0))
d = ImageDraw.Draw(out)
y = im.height + size // 2
for ln in lines:
    d.text((size, y), ln, fill=(255, 255, 255), font=font)
    y += int(size * 1.5)
out.save(dst, optimize=True)
print(dst, out.size)
