# usage: python3 fx4_sheet.py <out.jpg> <prefix>... : one row per prefix (hov, t*, tilt, x*, zoff), scaled to the same height
import sys, glob
from PIL import Image, ImageDraw
out, pres = sys.argv[1], sys.argv[2:]
rows = []
for pre in pres:
    fs = [f'shots/{pre}_hov.jpg'] + sorted(glob.glob(f'shots/{pre}_t*.jpg')) + [f'shots/{pre}_tilt.jpg'] + sorted(glob.glob(f'shots/{pre}_x*.jpg')) + [f'shots/{pre}_zoff.jpg']
    rows.append((pre, fs))
H = int(__import__("os").environ.get("SH", 300))
ims = []
for pre, fs in rows:
    r = []
    for f in fs:
        im = Image.open(f); w, h = im.size
        r.append((f.split(pre + '_')[-1][:-4], im.resize((round(w * H / h), H))))
    ims.append((pre, r))
W = max(sum(im.width + 4 for _, im in r) for _, r in ims)
c = Image.new('RGB', (W, len(ims) * (H + 16)), '#888')
d = ImageDraw.Draw(c)
for j, (pre, r) in enumerate(ims):
    x = 0
    for n, im in r:
        c.paste(im, (x, j * (H + 16) + 16)); d.text((x + 2, j * (H + 16) + 2), pre[5:] + ' ' + n, fill=(0, 0, 0)); x += im.width + 4
c.save(out, quality=82)
