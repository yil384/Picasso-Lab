"""usage: python3 fx4_scale.py <scene> : compares each frame of the 151 x 161 and 163 x 174 runs with the
266 x 284 run, both resampled to the same photo size (a mis-scaled prop or letter shows as a jump over the
hover baseline). Also writes fx4_sc_<scene>.jpg: desktop | 151 (resampled) | diff, per frame."""
import sys, glob, os
import numpy as np
from PIL import Image
scene = sys.argv[1]
N = 360                                  # common size of the (hovered, 1.05 x) photo box, device px
def crop(pre, n, TW, TH):
    D = min(200, TW - 16, TH - 16)
    cx, cy = 1 + 8 + D / 2, 1 + 8 + D / 2 - 2
    R = D / 2 * 1.05 + 4
    im = Image.open(f'shots/{pre}_{n}.jpg').convert('RGB')
    return np.asarray(im.crop((round((cx - R) * 2), round((cy - R) * 2), round((cx + R) * 2), round((cy + R) * 2))).resize((N, N), Image.LANCZOS)).astype(np.int16)
yy, xx = np.mgrid[0:N, 0:N]
mask = np.hypot(xx - N / 2 + 0.5, yy - N / 2 + 0.5) < N / 2 * (105 / 109) - 3
names = [os.path.basename(f)[len(f'fx4r_{scene}_d_'):-4] for f in sorted(glob.glob(f'shots/fx4r_{scene}_d_t*.jpg'))] + ['x030']
rows = []
for small, TW, TH in [('s151', 151, 161), ('s163', 163, 174)]:
    base = None
    out = []
    for n in ['hov'] + names:
        a = crop(f'fx4r_{scene}_d', n, 266, 284); b = crop(f'fx4r_{scene}_{small}', n, TW, TH)
        d = np.abs(a - b).max(axis=2)
        m = d[mask].mean()
        if base is None: base = m
        out.append(f'{n}:{m:.1f}')
        if small == 's151' and n != 'hov': rows.append((n, a, b, d))
    print(scene, small, 'mean diff vs desktop (hov = baseline):', ' '.join(out))
# sheet of the three worst frames
rows.sort(key=lambda r: -r[3][mask].mean())
sheet = Image.new('RGB', (N * 3, N * min(3, len(rows))), 'white')
for i, (n, a, b, d) in enumerate(rows[:3]):
    sheet.paste(Image.fromarray(a.astype('uint8')), (0, i * N)); sheet.paste(Image.fromarray(b.astype('uint8')), (N, i * N))
    sheet.paste(Image.fromarray(np.clip(d * 3, 0, 255).astype('uint8')), (2 * N, i * N))
sheet.save(f'fx4_sc_{scene}.jpg', quality=85)
print('  worst frames (sheet):', [r[0] for r in rows[:3]])
