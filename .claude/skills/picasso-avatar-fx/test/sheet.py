"""contact sheet: one row per prefix, one column per frame name.
usage: python3 sheet.py out.jpg <dir> <names csv> <prefix> [<prefix> ...]
   e.g. python3 sheet.py kv9/zk.jpg kv9/out idle,hov,t000,t030,t090,t200,tilt,zoff r_zhongkai_d r_zhongkai_s151"""
import sys, os
from PIL import Image, ImageDraw
out, d, names, pres = sys.argv[1], sys.argv[2], sys.argv[3].split(','), sys.argv[4:]
rows = []
for p in pres:
    ims = []
    for n in names:
        f = None
        for ext in ('png', 'jpg'):
            c = f'{d}/{p}_{n}.{ext}'
            if os.path.exists(c): f = c; break
        ims.append(Image.open(f).convert('RGB') if f else None)
    rows.append((p, ims))
cw = max(im.size[0] for _, ims in rows for im in ims if im)
ch = max(im.size[1] for _, ims in rows for im in ims if im)
S = Image.new('RGB', (len(names) * (cw + 6) + 6, len(rows) * (ch + 22) + 22), '#888')
g = ImageDraw.Draw(S)
for j, n in enumerate(names): g.text((6 + j * (cw + 6) + 3, 4), n, fill=(0, 0, 0))
for i, (p, ims) in enumerate(rows):
    y = 22 + i * (ch + 22)
    g.text((6, y + 2), p, fill=(0, 0, 0))
    for j, im in enumerate(ims):
        if im: S.paste(im, (6 + j * (cw + 6), y + 18))
S.save(out, quality=82)
print(out, S.size)
