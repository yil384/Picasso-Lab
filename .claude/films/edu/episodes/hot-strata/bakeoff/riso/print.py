#!/usr/bin/env python3
"""Riso look (bake-off): print every piece of the film offline, the way a risograph would.

The Codex drawings (art/cut/riso_*.png, keyed) are separated into the four riso inks (yellow, pink, blue, navy:
the kit2d/riso.js constants) by a colour search per pixel, then printed: paper with grain, cloud and fibres; each
ink multiplied in order, a few pixels out of register, with mottle, starved blotches and pinholes; a slight spread.
Cut-paper pieces get a die-cut alpha (the drawing plus a thin paper rim). Large tints (the kitchen tiles, the
backgrounds, the glows) print through rotated halftone screens; small tints on characters print flat, so faces stay
clean. film.js only composites these prints and draws the text live (crisp solid ink).

    python3 episodes/hot-strata/bakeoff/riso/print.py [names...]     (from .claude/films/edu; no names = all)

Writes print/<name>.png (pieces, RGBA) and print/<name>.jpg (full sheets), print/meta.json (sizes, fan geometry).
"""
import json, os, sys, hashlib
import numpy as np, cv2
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ART = os.path.abspath(os.path.join(HERE, '..', '..', '..', '..', 'art'))
OUT = os.path.join(HERE, 'print')
CACHE = os.environ.get('RISO_CACHE')                     # optional: where to keep the separation table

ORDER = ['yellow', 'pink', 'blue', 'navy']
INK = {'yellow': (255, 250, 40), 'pink': (240, 76, 183), 'blue': (58, 146, 197), 'navy': (32, 56, 146)}
ANGLE = {'yellow': 0.0, 'pink': .26, 'blue': 1.31, 'navy': .79}
PAPER = np.array((241, 235, 226), np.float32)
REG = {'yellow': (3, -2), 'pink': (-2, 2), 'blue': (2, 3), 'navy': (0, 0)}   # px at design scale


# ------------------------------------------------------------------ colour separation
def _lab(rgb):
    """sRGB 0..255 (N,3) -> CIE Lab (N,3)."""
    c = rgb / 255.0
    c = np.where(c > .04045, ((c + .055) / 1.055) ** 2.4, c / 12.92)
    M = np.array([[.4124, .3576, .1805], [.2126, .7152, .0722], [.0193, .1192, .9505]])
    xyz = c @ M.T / np.array([.9505, 1.0, 1.089])
    f = np.where(xyz > .008856, np.cbrt(xyz), 7.787 * xyz + 16 / 116)
    return np.stack([116 * f[:, 1] - 16, 500 * (f[:, 0] - f[:, 1]), 200 * (f[:, 1] - f[:, 2])], 1)


def printed(cov):
    """Ink coverages (N,4) in ORDER -> the printed sRGB colour (N,3) on paper (multiply, as riso.js)."""
    out = np.tile(PAPER[None], (len(cov), 1)).astype(np.float64)
    for k, ink in enumerate(ORDER):
        a = cov[:, k:k + 1]
        out *= 1 - a + a * np.array(INK[ink])[None] / 255.0
    return out


def sep_table():
    """33^3 table: quantised sRGB -> the ink coverages that print closest (Lab), with a small cost per unit of ink.
    Returns (table (33,33,33,4), None) or (None, 'error')."""
    if CACHE and os.path.exists(os.path.join(CACHE, 'riso_sep.npy')):
        return np.load(os.path.join(CACHE, 'riso_sep.npy')), None
    lv = np.linspace(0, 1, 13)
    combos = np.stack(np.meshgrid(lv, lv, lv, lv, indexing='ij'), -1).reshape(-1, 4)
    clab = _lab(printed(combos)).astype(np.float32)
    cost = (3.0 * combos.sum(1)).astype(np.float32)          # prefer less ink
    used = (combos > .05).sum(1)
    cost += 6.0 * np.maximum(used - 1, 0) + 30.0 * (used >= 3)   # two inks only where the drawing overprints
    cost += 60.0 * ((combos[:, 3] > .5) & (combos[:, :3].max(1) > .05))   # darks are navy alone, never mud
    q = np.minimum(np.arange(33) * 8, 255).astype(np.float64)
    grid = np.stack(np.meshgrid(q, q, q, indexing='ij'), -1).reshape(-1, 3)
    glab = _lab(grid).astype(np.float32)
    best = np.zeros((len(grid), 4), np.float32)
    cc = (clab ** 2).sum(1)
    for i in range(0, len(grid), 512):
        g = glab[i:i + 512]
        d = (g ** 2).sum(1)[:, None] + cc[None] - 2 * g @ clab.T + cost[None]
        best[i:i + 512] = combos[d.argmin(1)]
    # flat colours of the drawing snap to one solid ink or one clean overprint of two solids (no mud)
    pure = np.array([[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1], [1, 1, 0, 0], [0, 1, 1, 0], [1, 0, 1, 0]], np.float64)
    plab = _lab(printed(pure)).astype(np.float32)
    dp = np.sqrt(((glab[:, None] - plab[None]) ** 2).sum(-1))
    near = dp.min(1) < 26
    best[near] = pure[dp.argmin(1)[near]]
    best[glab[:, 0] < 30] = (0, 0, 0, 1)                      # outlines and darks: the navy key plate alone
    tab = best.reshape(33, 33, 33, 4)
    if CACHE:
        os.makedirs(CACHE, exist_ok=True)
        np.save(os.path.join(CACHE, 'riso_sep.npy'), tab)
    return tab, None


def separate(rgb, tab):
    """(H,W,3) uint8 -> coverages (4,H,W) float32 in ORDER."""
    rgb = cv2.bilateralFilter(np.ascontiguousarray(rgb), 5, 30, 5)
    i = np.clip(np.round(rgb.astype(np.float32) / 255 * 32), 0, 32).astype(np.int32)
    cov = tab[i[..., 0], i[..., 1], i[..., 2]]
    cov = np.dstack([cv2.medianBlur((cov[..., k] * 255).astype(np.uint8), 3).astype(np.float32) / 255 for k in range(4)])
    cov = np.where(cov < .07, 0, cov)
    cov = np.where(cov > .9, 1, cov)
    return np.moveaxis(cov, -1, 0).astype(np.float32)


# ------------------------------------------------------------------ the press
def _seed(s):
    return int(hashlib.md5(s.encode()).hexdigest()[:8], 16)


def _noise(rng, H, W, scale):
    """Smooth value noise in 0..1 with features about `scale` px."""
    h, w = max(2, int(H / scale) + 2), max(2, int(W / scale) + 2)
    return cv2.resize(rng.random((h, w)).astype(np.float32), (W, H), interpolation=cv2.INTER_CUBIC).clip(0, 1)


def _shift(a, dx, dy):
    out = np.zeros_like(a)
    H, W = a.shape
    xs, xd = (slice(0, W - dx), slice(dx, W)) if dx >= 0 else (slice(-dx, W), slice(0, W + dx))
    ys, yd = (slice(0, H - dy), slice(dy, H)) if dy >= 0 else (slice(-dy, H), slice(0, H + dy))
    out[yd, xd] = a[ys, xs]
    return out


def halftone(tone, angle, pitch, seed):
    """AM screen as riso.js: a dot per rotated cell with area = tone, jittered a little, soft 1 px edge."""
    H, W = tone.shape
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    ca, sa = np.cos(angle), np.sin(angle)
    u, v = (xx * ca + yy * sa) / pitch, (-xx * sa + yy * ca) / pitch
    cu, cv_ = np.floor(u), np.floor(v)
    hh = np.sin(cu * 127.1 + cv_ * 311.7 + seed) * 43758.5453
    hj = hh - np.floor(hh)
    du = u - cu - .5 + (hj - .5) * .14
    dv = v - cv_ - .5 + ((hj * 7.13) % 1 - .5) * .14
    d = np.sqrt(du * du + dv * dv)
    rad = np.sqrt(np.clip(tone, 0, 1) / np.pi) * (.92 + .16 * hj)
    return np.clip((rad - d) / (1.1 / pitch) + .5, 0, 1) * (tone > .003)


def press(solid, screen=None, seed='p', scale=1.0, pitch=9.5, inks=ORDER, register=True, paper=True, spread=.7):
    """Print coverages (4,H,W) (solid) [+ (4,H,W) screen tones] -> sRGB float (H,W,3).
    scale: print px per design px (sets register offsets, pitch, texture sizes). paper=False prints on white
    (for ink-only overlays drawn with multiply)."""
    H, W = solid.shape[1:]
    rng = np.random.default_rng(_seed(seed + 'tex'))
    grain = rng.random((H, W)).astype(np.float32)
    s = max(.6, scale)
    if paper:
        cloud = _noise(rng, H, W, 48 * s)
        fib = np.zeros((H, W), np.float32)
        n = int(300 * H * W / (1080 * 1080 * s * s))
        for _ in range(n):
            x, y, a = rng.random() * W, rng.random() * H, rng.random() * 6.28
            ln, bend = (8 + rng.random() * 32) * s, (rng.random() - .5) * .25
            pts = []
            for _k in range(int(ln / (2 * s)) + 1):
                pts.append((x, y)); a += bend; x += np.cos(a) * 2 * s; y += np.sin(a) * 2 * s
            cv2.polylines(fib, [np.array(pts, np.int32)], False, float(.25 + rng.random() * .35), max(1, int(round(.8 * s))), cv2.LINE_AA)
        base = (.982 + .018 * grain + .012 * (cloud - .5)) * (1 - .2 * np.clip(fib, 0, 1))
        out = PAPER[None, None] * base[..., None]
    else:
        out = np.full((H, W, 3), 255.0, np.float32)
    starve = _noise(rng, H, W, 24 * s)
    for k, ink in enumerate(ORDER):
        if ink not in inks:
            continue
        c = solid[k].copy()
        if screen is not None and screen[k].max() > 0:
            c = np.maximum(c, halftone(screen[k], ANGLE[ink], pitch * scale, k * 17.3 + 3.1))
        if register:
            dx, dy = (int(round(v * scale)) for v in REG[ink])
            c = _shift(c, dx, dy)
        if c.max() <= 0:
            continue
        r2 = np.random.default_rng(_seed(seed + ink))
        mottle = _noise(r2, H, W, 3.2 * s)
        g2 = np.roll(grain, (k * 37, k * 91), (0, 1))
        c = c * (.965 + .07 * mottle) * (.98 + .04 * starve) - (g2 > .94) * .25 - (g2 > .988) * .45
        c = np.clip(c, 0, 1)
        out *= (1 - c[..., None] + c[..., None] * np.array(INK[ink], np.float32)[None, None] / 255)
    if spread > 0:
        out = cv2.GaussianBlur(out, (0, 0), spread * max(.7, scale))
    return out


def diecut(alpha, rim, scale):
    """The cut line: the drawing's silhouette grown by a paper rim, smoothed (alpha 0..1)."""
    m = (alpha > .45).astype(np.uint8)
    r = max(1, int(round(rim * scale)))
    m = cv2.dilate(m, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * r + 1, 2 * r + 1)))
    m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9)))
    return cv2.GaussianBlur(m.astype(np.float32), (0, 0), .9)


# ------------------------------------------------------------------ inputs
def load_cut(name):
    p = os.path.join(ART, 'cut', name + '.png')
    if not os.path.exists(p):
        return None, 'missing ' + p
    return np.array(Image.open(p).convert('RGBA')), None


def fit(rgba, height=None, width=None):
    h, w = rgba.shape[:2]
    k = height / h if height else width / w
    W, H = max(1, int(round(w * k))), max(1, int(round(h * k)))
    a = rgba.astype(np.float32)
    a[..., :3] *= a[..., 3:] / 255                                 # premultiply for a clean resize
    a = cv2.resize(a, (W, H), interpolation=cv2.INTER_AREA if k < 1 else cv2.INTER_CUBIC)
    al = np.clip(a[..., 3:], 1e-3, 255)
    rgb = np.clip(a[..., :3] / al * 255, 0, 255)
    return np.dstack([rgb, np.clip(a[..., 3:], 0, 255)]).astype(np.uint8), k


def piece(name, rgba, tab, rim=5, scale=1.2, only=None, gain=None, seed=None):
    """A cut-paper piece: separate, print on paper, die-cut. only: print just these inks (e.g. ['navy'])."""
    cov = separate(rgba[..., :3], tab) * (rgba[..., 3][None].astype(np.float32) / 255)
    if only:
        for k, ink in enumerate(ORDER):
            if ink not in only:
                cov[k] = 0
    if gain:
        for k, ink in enumerate(ORDER):
            cov[k] *= gain.get(ink, 1)
    pad = int(rim * scale) + 6
    cov = np.pad(cov, ((0, 0), (pad, pad), (pad, pad)))
    al = np.pad(rgba[..., 3].astype(np.float32) / 255, pad)
    rgb = press(cov, seed=seed or name, scale=scale)
    a = diecut(al, rim, scale)
    return save_png(name, rgb, a)


def save_png(name, rgb, a):
    os.makedirs(OUT, exist_ok=True)
    im = np.dstack([np.clip(rgb, 0, 255), np.clip(a * 255, 0, 255)]).astype(np.uint8)
    p = os.path.join(OUT, name + '.png')
    Image.fromarray(im, 'RGBA').save(p, optimize=True)
    return (p, im.shape[1], im.shape[0]), None


def save_jpg(name, rgb):
    os.makedirs(OUT, exist_ok=True)
    p = os.path.join(OUT, name + '.jpg')
    Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8), 'RGB').save(p, quality=93, subsampling=0)
    return (p, rgb.shape[1], rgb.shape[0]), None


# ------------------------------------------------------------------ the pieces
def split_chefs():
    """riso_chefs (2 rows x 6, transparent) -> riso_chef_idle_1..6, riso_chef_cook_1..6 (small bits such as steam and
    motion strokes go with the nearest chef). Returns (list, None) or (None, err)."""
    im, err = load_cut('riso_chefs')
    if err:
        return None, err
    sol = (im[..., 3] > 30).astype(np.uint8)
    nl, lab, st, cen = cv2.connectedComponentsWithStats(sol, 8)
    big = [i for i in range(1, nl) if st[i, 4] > 20000]
    if len(big) != 12:
        return None, f'expected 12 chefs, found {len(big)}'
    owner = {i: i for i in big}
    for i in range(1, nl):
        if i in big or st[i, 4] < 25:
            continue
        cx, cy = cen[i]
        def dist(j):
            x, y, w, h, _ = st[j]
            return np.hypot(max(x - cx, 0, cx - (x + w)), max(y - cy, 0, cy - (y + h)))
        owner[i] = min(big, key=dist)
    rows = sorted(big, key=lambda j: st[j, 1])
    top, bot = sorted(rows[:6], key=lambda j: st[j, 0]), sorted(rows[6:], key=lambda j: st[j, 0])
    res = []
    for kind, lst in (('idle', top), ('cook', bot)):
        for n, j in enumerate(lst, 1):
            mask = np.isin(lab, [i for i, o in owner.items() if o == j])
            ys, xs = np.nonzero(mask)
            x0, x1, y0, y1 = xs.min() - 10, xs.max() + 11, ys.min() - 10, ys.max() + 11
            x0, y0 = max(0, x0), max(0, y0)
            sub = im[y0:y1, x0:x1].copy()
            sub[..., 3] = (sub[..., 3] * mask[y0:y1, x0:x1]).astype(np.uint8)
            p = os.path.join(ART, 'cut', f'riso_chef_{kind}_{n}.png')
            Image.fromarray(sub).save(p)
            top = ys.min() + 12                                   # the toque's top: where a number tag gets pinned
            res.append((p, sub.shape[1], sub.shape[0], int(xs.mean() - x0), int(ys.max() - y0), int(xs[ys < top].mean() - x0), int(ys.min() - y0)))
    return res, None


def split_coders():
    """riso_coders -> the two people groups and the loose sparks (separate pieces). Returns (list, None)."""
    im, err = load_cut('riso_coders')
    if err:
        return None, err
    sol = (im[..., 3] > 30).astype(np.uint8)
    nl, lab, st, cen = cv2.connectedComponentsWithStats(sol, 8)
    big = sorted([i for i in range(1, nl) if st[i, 4] > 100000], key=lambda j: st[j, 0])
    parts = {'riso_coders_a': [big[0]], 'riso_coders_b': big[1:], 'riso_coders_spark': [i for i in range(1, nl) if i not in big]}
    res = {}
    for name, ids in parts.items():
        sub = im.copy()
        sub[..., 3] = (sub[..., 3] * np.isin(lab, ids)).astype(np.uint8)
        Image.fromarray(sub).save(os.path.join(ART, 'cut', name + '.png'))
        res[name] = sub.shape[:2]
    return res, None


def sheet_bgA(W=1240, H=2240, scale=1.15):
    """Opening sheet: a yellow flood, a pink screen rising toward the bottom (orange dots)."""
    sol = np.zeros((4, H, W), np.float32); scr = np.zeros_like(sol)
    sol[0] = 1
    y = np.linspace(0, 1, H)[:, None] * np.ones((1, W), np.float32)
    scr[1] = np.clip((y - .5) / .5, 0, 1) ** 1.3 * .55
    return save_jpg('riso_bgA', press(sol, scr, seed='bgA', scale=scale))


def sheet_burst(R=1000, scale=.8):
    """The burst behind the programmers: a sheet printed with a yellow flood and 18 pink rays (orange where they
    cross the yellow), a pink screen fading out from the centre between them. film.js cuts the star outline."""
    S = 2 * R
    sol = np.zeros((4, S, S), np.float32); scr = np.zeros_like(sol)
    yy, xx = np.mgrid[0:S, 0:S].astype(np.float32)
    ang = np.arctan2(yy - R, xx - R); rr = np.hypot(xx - R, yy - R)
    sol[0] = 1
    rays = ((np.floor((ang + np.pi) / (2 * np.pi) * 18) % 2) == 0).astype(np.float32)
    rays = cv2.GaussianBlur(rays, (0, 0), .7)
    sol[1] = rays
    scr[1] = (1 - rays) * np.clip(1 - rr / (R * .95), 0, 1) ** 1.4 * .5
    return save_jpg('riso_burst', press(sol, scr, seed='burst', scale=scale))


def forum_card(W=1000, H=400, scale=1.1):
    """An invented forum post as a cut-paper card (flat UI shapes only; film.js writes the headline and the count)."""
    k = scale
    Wk, Hk = int(W * k), int(H * k)
    sol = np.zeros((4, Hk, Wk), np.float32)
    P = lambda pts: (np.array(pts, np.float32) * k * 16).astype(np.int32)
    def poly(plate, pts, v=1.0):
        cv2.fillPoly(sol[ORDER.index(plate)], [P(pts)], v, cv2.LINE_AA, 4)
    def rrect(plate, x0, y0, x1, y1, r, v=1.0, line=0):
        m = np.zeros((Hk, Wk), np.float32)
        box = lambda a, b, c, d, rr: (cv2.rectangle(m, (int(a * k), int((b + rr) * k)), (int(c * k), int((d - rr) * k)), 1, -1),
                                      cv2.rectangle(m, (int((a + rr) * k), int(b * k)), (int((c - rr) * k), int(d * k)), 1, -1),
                                      [cv2.circle(m, (int(cx * k), int(cy * k)), int(rr * k), 1, -1, cv2.LINE_AA) for cx, cy in ((a + rr, b + rr), (c - rr, b + rr), (a + rr, d - rr), (c - rr, d - rr))])
        box(x0, y0, x1, y1, r)
        if line:
            inner = np.zeros_like(m); m2 = m
            m = np.zeros((Hk, Wk), np.float32); box(x0 + line, y0 + line, x1 - line, y1 - line, max(1, r - line))
            m = np.clip(m2 - m, 0, 1)
        sol[ORDER.index(plate)] = np.maximum(sol[ORDER.index(plate)], m * v)
    rrect('navy', 8, 8, W - 8, H - 8, 28, line=9)
    # the upvote button
    poly('pink', [(52, 178), (130, 52), (208, 178), (162, 178), (162, 236), (98, 236), (98, 178)])
    sol[3] = np.maximum(sol[3], cv2.dilate(sol[1], np.ones((int(13 * k), int(13 * k)), np.uint8)) - sol[1])
    rrect('yellow', 36, 262, 224, 362, 16)
    rrect('navy', 36, 262, 224, 362, 16, line=6)
    # the headline panel, full height (no placeholder comment rows: the headline is the content)
    rrect('navy', 252, 40, W - 40, H - 40, 18)
    al = np.zeros((Hk, Wk), np.float32)
    rr_ = np.zeros((Hk, Wk), np.float32)
    cv2.rectangle(al, (int(8 * k), int(36 * k)), (int((W - 8) * k), int((H - 36) * k)), 1, -1)
    cv2.rectangle(al, (int(36 * k), int(8 * k)), (int((W - 36) * k), int((H - 8) * k)), 1, -1)
    for cx, cy in ((36, 36), (W - 36, 36), (36, H - 36), (W - 36, H - 36)):
        cv2.circle(al, (int(cx * k), int(cy * k)), int(28 * k), 1, -1, cv2.LINE_AA)
    rgb = press(sol, seed='forum', scale=k)
    return save_png('riso_forum', rgb, cv2.GaussianBlur(al, (0, 0), .8))


def tiles(S=1024):
    """Paper and solid-ink tiles for the graphic bits film.js cuts live (tags, bubbles, banner): paper.jpg is a
    blank sheet; ink_<ink>.jpg is that ink at full coverage printed on white (multiply it onto paper)."""
    out = []
    z = np.zeros((4, S, S), np.float32)
    out.append(save_jpg('riso_paper', press(z, seed='paper', scale=1.0))[0])
    for k, ink in enumerate(ORDER):
        c = z.copy(); c[k] = 1
        out.append(save_jpg('riso_ink_' + ink, press(c, seed='tile' + ink, scale=1.0, paper=False, register=False))[0])
    return out, None


def glow(name, ink, R=420, peak=.6, scale=1.0):
    """An ink-only halftone glow (print on white, drawn with multiply)."""
    S = 2 * R
    sol = np.zeros((4, S, S), np.float32); scr = np.zeros_like(sol)
    yy, xx = np.mgrid[0:S, 0:S].astype(np.float32)
    rr = np.hypot(xx - R, yy - R) / R
    scr[ORDER.index(ink)] = np.clip(1 - rr, 0, 1) ** 1.2 * peak
    return save_jpg(name, press(sol, scr, seed=name, scale=scale, paper=False, spread=.5))


def kitchen(tab, H=2000, scale=1.04):
    """The kitchen backdrop: separated, tints through screens (tiles), solids flat."""
    p = os.path.join(ART, 'src', 'riso_kitchen.png')
    im = np.array(Image.open(p).convert('RGB'))
    W = int(round(im.shape[1] * H / im.shape[0]))
    im = cv2.resize(im, (W, H), interpolation=cv2.INTER_CUBIC)
    cov = separate(im, tab)
    sol = np.where(cov >= .62, 1.0, 0).astype(np.float32)
    scr = np.where((cov > .06) & (cov < .62), cov, 0).astype(np.float32)
    return save_jpg('riso_kitchen', press(sol, scr, seed='kitchen', scale=scale))


def main(names):
    tab, err = sep_table()
    if err:
        return None, err
    meta = {}
    mp = os.path.join(OUT, 'meta.json')
    if os.path.exists(mp):
        meta = json.load(open(mp))
    want = lambda n: not names or n in names
    if want('chefs'):
        res, err = split_chefs()
        if err:
            return None, err
        for p, w, h, fx, fy, hx, hy in res:
            n = os.path.basename(p)[:-4]
            rgba, k = fit(np.array(Image.open(p)), height=560)
            (pp, W, H), _ = piece(n, rgba, tab, rim=4, scale=1.0)
            meta[n] = {'w': W, 'h': H, 'fx': fx * k + 10, 'fy': fy * k + 10, 'hx': hx * k + 10, 'hy': hy * k + 10}
            if 'idle' in n:
                (pp, W, H), _ = piece(n + '_ghost', rgba, tab, rim=4, scale=1.0, only=['navy'], gain={'navy': .8}, seed=n)
            print('  ', n, W, H)
    if want('coders'):
        _, err = split_coders()
        if err:
            return None, err
        for n in ['riso_coders_a', 'riso_coders_b', 'riso_coders_spark']:
            rgba, k = fit(load_cut(n)[0], width=1200)
            (pp, W, H), _ = piece(n, rgba, tab, rim=5, scale=1.1)
            meta[n] = {'w': W, 'h': H}
            print('  ', n, W, H)
    for n, kw in (('riso_servers', {'height': 1100}), ('riso_gpu', {'width': 1150}), ('riso_brain', {'width': 560}),
                  ('riso_ticket', {'height': 760})):
        if not want(n):
            continue
        im, err = load_cut(n)
        if err:
            print('  skip', err)
            continue
        rgba, k = fit(im, **kw)
        (pp, W, H), _ = piece(n, rgba, tab, rim=5, scale=1.1)
        meta[n] = {'w': W, 'h': H, 'k': k}
        print('  ', n, W, H)
        if n == 'riso_gpu':
            pad = int(5 * 1.1) + 6
            meta[n]['fans'] = [[(584.5 * k + pad), (329.5 * k + pad), 232 * k, 232 * k], [(1189.5 * k + pad), (356 * k + pad), 186 * k, 220 * k]]
    if want('bgA'):
        print('  ', sheet_bgA()[0])
    if want('burst'):
        print('  ', sheet_burst()[0])
    if want('forum'):
        print('  ', forum_card()[0])
    if want('tiles'):
        print('  ', tiles()[0])
    if want('glow'):
        print('  ', glow('riso_glow_pink', 'pink')[0])
    if want('kitchen'):
        print('  ', kitchen(tab)[0])
    json.dump(meta, open(mp, 'w'), indent=1)
    return meta, None


if __name__ == '__main__':
    res, err = main(sys.argv[1:])
    if err:
        print('error:', err)
        sys.exit(1)
