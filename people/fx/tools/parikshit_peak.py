#!/usr/bin/env python3
"""Make the far snow peak for people/fx/parikshit.js: Chaukhamba by moonlight, 3 a.m.

    people/static/fx/parikshit-peak.webp   Chaukhamba from Chopta, sky keyed out, graded to moonlight and
                                           scaled for the V between the near ridges of Parikshit's photo
                                           (RGBA, straight alpha, 2 texture px per photo px)

Source: Wikimedia Commons, File:Chaukhamba_from_Chopta_(45471552942).jpg, photo by Mike Prince
(Flickr 45471552942), licence CC BY 2.0 Generic (https://creativecommons.org/licenses/by/2.0/).
Credit line: "Chaukhamba from Chopta: photo by Mike Prince, CC BY 2.0". The only CC0 photo of the massif on
Commons (Category:Chaukhamba, October 2022) has cumulus sitting on the summit crest, so its skyline cannot be
keyed; every other one there and in the nearby categories (Chopta, Tungnath, Chandrashila, Deoria Tal,
Madhyamaheshwar) is CC BY-SA. The night colours follow the Tengboche night reference used by parikshit_night.py
(silver snow, navy sky): no alpenglow, 3 a.m. snow is silver.

    pip install opencv-python-headless pillow
    python3 people/fx/tools/parikshit_peak.py [path/to/Chaukhamba_from_Chopta.jpg] [--preview DIR]

Without a path it downloads the 1280 px rendition (Special:FilePath) to people/fx/tools/.chaukhamba_chopta.jpg;
all source coordinates below are in that 1280 x 720 image.

Steps
  1. Key the sky: flood fill from the top edge on a bilateral-smoothed copy (the sky is a smooth gradient, the
     skyline a step), then a soft alpha in a thin band round the skyline by projecting each pixel onto the line
     between the local sky colour S (a smooth fit to the sky) and the local mountain colour F.
  2. Decontaminate: C' = (C - (1 - a) S) / a for 0 < a < 1, then shrink alpha by 0.5 texture px along its
     gradient, so no daylight-blue fringe survives on the navy night sky.
  3. Grade to moonlight: massif by luminance onto rock #2b3147 -> snow shadow #8394b4 -> snow highlight #d6deec;
     the brown foreground ridge to near-black blue #141b2c -> #1e2740 keeping 30 % of its high-pass detail; then
     15 % haze toward #2c4266.
  4. Place: the main summit (SUM_S) lands on photo px SUM_P at S photo px per source px; crop CROP (only what can
     show in the haze V, the right-hand brown peak left out, a margin below the V bottom for the rise); resample
     premultiplied to 2 texture px per photo px with SOFT px of blur (the photo's far
     distance is soft); bleed colour under alpha 0 so bilinear sampling never pulls in
     black. The scene's PB box must match the printed box.
"""
import os
import sys
import urllib.request

import cv2
import numpy as np
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
OUT = os.path.join(ROOT, 'people', 'static', 'fx', 'parikshit-peak.webp')
CACHE = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.chaukhamba_chopta.jpg')
URL = 'https://commons.wikimedia.org/wiki/Special:FilePath/Chaukhamba_from_Chopta_(45471552942).jpg?width=1280'
UA = 'PicassoLabSite/1.0 (https://github.com/yil384/Picasso-Lab)'
SW = 1280                                              # source width all coordinates refer to
SUM_S, SUM_P, S = (399, 90), (322, 40), 0.34           # main summit, source px -> photo px; photo px per source px
CROP = (200, 70, 740, 300)                             # source px kept (x0, y0, x1, y1)
TPP = 2                                                # texture px per photo px
SOFT = 0.45                                            # texture px of blur, premultiplied

SNOW_HI, SNOW_SH, ROCK = '#d6deec', '#8394b4', '#2b3147'
RIDGE_LO, RIDGE_HI, HAZE = '#141b2c', '#1e2740', '#2c4266'
# the foreground ridge's line against the massif (source px), snapped to the image within +-SNAP px
TRACE = [(112, 192), (120, 193), (180, 195), (200, 197), (210, 198), (220, 200), (225, 203), (235, 207), (245, 210),
         (255, 213), (265, 216), (270, 217), (280, 221), (290, 226), (298, 231), (305, 234), (315, 235), (325, 236),
         (340, 230), (360, 223), (380, 225), (400, 230), (420, 236), (440, 238), (480, 237), (500, 234), (520, 230),
         (535, 233), (540, 230), (545, 226), (550, 222), (560, 219), (580, 215), (600, 216), (620, 217), (640, 219),
         (660, 220), (680, 221), (700, 215), (720, 203), (727, 199)]
SNAP = 5


def hexrgb(h):
    return np.array([int(h[i:i + 2], 16) for i in (1, 3, 5)], np.float32) / 255


def load(path):
    if not path:
        path = CACHE
        if not os.path.exists(path):
            req = urllib.request.Request(URL, headers={'User-Agent': UA})
            with urllib.request.urlopen(req) as r, open(path, 'wb') as f:
                f.write(r.read())
    im = Image.open(path).convert('RGB')
    if im.width != SW:
        im = im.resize((SW, round(im.height * SW / im.width)), Image.LANCZOS)
    return np.asarray(im).astype(np.float32) / 255


def hard_sky(im):
    """Flood fill from the top edge on a smoothed copy -> boolean sky."""
    H, W = im.shape[:2]
    u8 = (im * 255).round().astype(np.uint8)
    sm = cv2.GaussianBlur(cv2.bilateralFilter(u8, 9, 30, 9), (0, 0), 1.0)
    mask = np.zeros((H + 2, W + 2), np.uint8)
    flags = 4 | cv2.FLOODFILL_MASK_ONLY | (255 << 8)
    for x in range(3, W, 20):
        if not mask[1, x + 1]:
            cv2.floodFill(sm.copy(), mask, (x, 2), 0, (2.2,) * 3, (2.2,) * 3, flags)
    sky = mask[1:-1, 1:-1] > 0
    # holes in the sky (wisps) stay sky; small islands of mountain in the sky go
    n, lab, st, _ = cv2.connectedComponentsWithStats((~sky).astype(np.uint8), 4)
    mount = np.zeros((H, W), bool)
    for i in range(1, n):
        if st[i, cv2.CC_STAT_AREA] > 4000:
            mount |= lab == i
    n, lab, st, _ = cv2.connectedComponentsWithStats((~mount).astype(np.uint8), 4)
    for i in range(1, n):                                # sky pockets not touching the top edge are mountain
        if st[i, cv2.CC_STAT_TOP] > 0 and st[i, cv2.CC_STAT_AREA] < 3000:
            mount |= lab == i
    return ~mount


def sky_model(im, sky):
    """Smooth sky colour everywhere: a 2-D quadratic fit to the sky, plus a smooth residual pulled in from the sky."""
    H, W = im.shape[:2]
    core = cv2.erode(sky.astype(np.uint8), np.ones((7, 7), np.uint8)) > 0
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    X, Y = xx / W, yy / H
    A = np.stack([np.ones_like(X), X, Y, X * X, X * Y, Y * Y, X ** 3, Y ** 3], -1)
    fit = np.zeros_like(im)
    for c in range(3):
        coef, *_ = np.linalg.lstsq(A[core][::7], im[..., c][core][::7], rcond=None)
        fit[..., c] = A @ coef
    # local residual (wisps of cirrus) spread into the mountain by normalised blur
    res = np.where(core[..., None], im - fit, 0)
    w = cv2.GaussianBlur(core.astype(np.float32), (0, 0), 6)
    res = cv2.GaussianBlur(res, (0, 0), 6) / np.maximum(w, 1e-3)[..., None]
    return fit + res * np.clip(w * 4, 0, 1)[..., None]


def soft_alpha(im, sky, S_loc):
    """Alpha in a band round the hard skyline: projection between local sky S and local mountain colour F."""
    m = (~sky).astype(np.float32)
    core = cv2.erode(m, np.ones((5, 5), np.uint8))
    w = cv2.GaussianBlur(core, (0, 0), 3)
    F = cv2.GaussianBlur(im * core[..., None], (0, 0), 3) / np.maximum(w, 1e-4)[..., None]
    d = F - S_loc
    a = ((im - S_loc) * d).sum(-1) / np.maximum((d * d).sum(-1), 1e-4)
    a = np.clip(a, 0, 1)
    dist_in = cv2.distanceTransform((m > 0).astype(np.uint8), cv2.DIST_L2, 3)
    dist_out = cv2.distanceTransform((m == 0).astype(np.uint8), cv2.DIST_L2, 3)
    sd = np.where(m > 0, dist_in, -dist_out)            # signed distance to the skyline, + inside the mountain
    band = np.abs(sd) < 2.0
    hard = np.clip(sd + 0.5, 0, 1)
    a = np.where(band, a, hard)
    a = np.where(sd > 1.5, np.maximum(a, 1.0), a)        # well inside: opaque
    a = np.where(sd < -1.5, 0.0, a)                      # well outside: clear
    return a.astype(np.float32), F


def decontaminate(im, a, S_loc, F):
    C = (im - (1 - a)[..., None] * S_loc) / np.maximum(a, 1e-3)[..., None]
    C = np.where((a < 0.08)[..., None], F, C)            # too little coverage to solve: use the mountain colour
    C = np.where((a >= 0.999)[..., None], im, C)
    return np.clip(C, 0, 1)


def shrink(a, px):
    """Move the alpha edge inward by px pixels: sample alpha px further out along its gradient."""
    a = a.astype(np.float32)
    g = cv2.GaussianBlur(a, (0, 0), 0.8)
    gx, gy = cv2.Sobel(g, cv2.CV_32F, 1, 0, ksize=3), cv2.Sobel(g, cv2.CV_32F, 0, 1, ksize=3)
    n = np.sqrt(gx * gx + gy * gy)
    ok = n > 1e-4
    H, W = a.shape
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    mx = xx - np.where(ok, gx / np.maximum(n, 1e-6), 0) * px
    my = yy - np.where(ok, gy / np.maximum(n, 1e-6), 0) * px
    out = cv2.remap(a, mx, my, cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
    return np.minimum(out, a)


def ridge_mask(im, mount):
    """The brown foreground ridge in front of the massif. Its line against the snow is traced by hand (TRACE,
    source px) and snapped per column to the strongest colour step within +-SNAP px; where
    no snow lies above it (the ends) the ridge is the whole mountain column."""
    H, W = mount.shape
    lab = cv2.GaussianBlur(cv2.cvtColor(im, cv2.COLOR_RGB2LAB), (0, 0), 1.0) / 100
    tx, ty = np.array(TRACE, np.float32).T
    xs = np.arange(W)
    guess = np.interp(xs, tx, ty)
    step = np.zeros(mount.shape, np.float32)
    step[2:-2] = np.sqrt(((lab[:-4] - lab[4:]) ** 2).sum(-1))   # colour step across the row ...
    up, dn = lab[:-4], lab[4:]                                      # ... going darker or warmer downward
    step[2:-2] *= (up[..., 0] > dn[..., 0] - 0.02) | (up[..., 2] < dn[..., 2] - 0.08)
    top = np.where(mount.any(0), mount.argmax(0), H)
    base = np.full(W, -1.0)
    for x in range(int(tx[0]), int(tx[-1]) + 1):
        y0, y1 = int(guess[x]) - SNAP, int(guess[x]) + SNAP + 1
        y = y0 + int(np.argmax(step[y0:y1, x]))
        if step[y, x] > 0.05 and y > top[x] + 2:
            base[x] = y
    ok = base >= 0
    base = np.interp(xs, xs[ok], base[ok])
    base = cv2.medianBlur(base.astype(np.float32)[None], 5)[0]          # no single-column spikes
    base = cv2.GaussianBlur(base[None], (0, 1), 1.2, sigmaY=0.01)[0]
    base = np.where((xs < tx[0]) | (xs > tx[-1]), top, base)
    yy = np.arange(H, dtype=np.float32)[:, None]
    return np.clip(yy - base[None] + 0.5, 0, 1) * mount


def grade(C, ridge, a):
    luma = C @ np.array([0.299, 0.587, 0.114], np.float32)
    # massif: gradient map on luminance (rock -> snow shadow -> snow highlight)
    lo, mid, hi = 0.30, 0.66, 0.97
    t1 = np.clip((luma - lo) / (mid - lo), 0, 1)[..., None]
    t2 = np.clip((luma - mid) / (hi - mid), 0, 1)[..., None]
    t1 = t1 * t1 * (3 - 2 * t1)
    m = hexrgb(ROCK) + (hexrgb(SNOW_SH) - hexrgb(ROCK)) * t1
    m = m + (hexrgb(SNOW_HI) - hexrgb(SNOW_SH)) * t2
    # foreground ridge: near-black blue by its low-pass luma, 30 % high-pass detail on top
    low = cv2.GaussianBlur(luma, (0, 0), 6)
    hp = luma - low
    rl = np.clip((low - 0.25) / 0.35, 0, 1)[..., None]
    r = hexrgb(RIDGE_LO) + (hexrgb(RIDGE_HI) - hexrgb(RIDGE_LO)) * rl + 0.30 * hp[..., None]
    out = m * (1 - ridge[..., None]) + r * ridge[..., None]
    return out * 0.85 + hexrgb(HAZE) * 0.15


def bleed(rgb, a, it=12):
    """Fill the colour under alpha ~ 0 with the nearest visible colour (bilinear sampling then never pulls in black)."""
    w = (a > 0.02).astype(np.float32)
    acc, wacc = rgb * w[..., None], w.copy()
    out = rgb.copy()
    known = w > 0
    for _ in range(it):
        acc = cv2.blur(acc, (3, 3))
        wacc = cv2.blur(wacc, (3, 3))
        fill = (~known) & (wacc > 1e-4)
        out[fill] = acc[fill] / wacc[fill][:, None]
        known = known | fill
        acc = out * known[..., None]
        wacc = known.astype(np.float32)
    out[~known] = rgb[known].mean(0)
    return out


def main():
    args = [x for x in sys.argv[1:]]
    prev = None
    if '--preview' in args:
        i = args.index('--preview'); prev = args[i + 1]; del args[i:i + 2]
    im = load(args[0] if args else None)
    sky = hard_sky(im)
    S_loc = sky_model(im, sky)
    a, F = soft_alpha(im, sky, S_loc)
    C = decontaminate(im, a, S_loc, F)
    mount = ~sky
    ridge = ridge_mask(im, mount)
    G = grade(C, ridge, a)

    x0, y0, x1, y1 = CROP
    k = S * TPP                                          # texture px per source px
    w, h = round((x1 - x0) * k), round((y1 - y0) * k)
    pm = np.dstack([G * a[..., None], a])[y0:y1, x0:x1]  # premultiplied for the resample
    pm = cv2.resize(pm, (w, h), interpolation=cv2.INTER_AREA)
    pm = cv2.GaussianBlur(pm, (0, 0), SOFT)              # a touch of the photo's softness (it is far away)
    al = shrink(pm[..., 3], 0.5)                         # 0.5 texture px inward
    rgb = pm[..., :3] / np.maximum(pm[..., 3], 1e-4)[..., None]
    rgb = bleed(np.clip(rgb, 0, 1), al)
    out = np.dstack([np.clip(rgb, 0, 1), np.clip(al, 0, 1)])
    Image.fromarray((out * 255).round().astype(np.uint8), 'RGBA').save(OUT, quality=90, method=6, exact=True)
    box = [SUM_P[0] + (x0 - SUM_S[0]) * S, SUM_P[1] + (y0 - SUM_S[1]) * S,
           SUM_P[0] + (x1 - SUM_S[0]) * S, SUM_P[1] + (y1 - SUM_S[1]) * S]
    print(OUT, (w, h), os.path.getsize(OUT), 'bytes', 'PB =', [round(v, 1) for v in box])
    if prev:
        os.makedirs(prev, exist_ok=True)
        dbg = (np.dstack([im * 255, np.zeros_like(a)])[..., :3]).astype(np.uint8).copy()
        edge = cv2.Canny((~sky).astype(np.uint8) * 255, 50, 150) > 0
        dbg[edge] = (255, 0, 0)
        dbg[(ridge > 0.5) & ~edge] = (dbg[(ridge > 0.5) & ~edge] * 0.6 + np.array([0, 90, 0])).astype(np.uint8)
        Image.fromarray(dbg).save(os.path.join(prev, 'peak_key_debug.png'))
        Image.fromarray((np.clip(G, 0, 1) * 255).astype(np.uint8)).save(os.path.join(prev, 'peak_graded_full.png'))


if __name__ == '__main__':
    main()
