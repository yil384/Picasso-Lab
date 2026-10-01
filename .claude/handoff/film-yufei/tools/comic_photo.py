#!/usr/bin/env python3
"""Pre-process Yufei's avatar photo into the comic-panel layers the film uses (run once).

    python3 tools/comic_photo.py            # writes assets/comic_*.png, assets/photo_full.png, work/comic_flat.jpg

Inputs (copied from the site repo, read-only there): assets/yufei.webp (the exact 512 px avatar photo, transparent
outside the inscribed circle), assets/yufei-cut.webp (her cut-out, RGBA).
Outputs (all in photo coordinates x SCALE, so photo px (u, v) -> texture px (u * SCALE, v * SCALE)):
  photo_full.png    512 px RGB: the exact photo, the transparent corners filled by edge extension (outside the
                    circle only, so the inscribed circle is bit-identical to the avatar)
  comic_person.png  her, comic-filtered: flat cel regions (k-means in Lab), XDoG ink lines, Ben-Day dots in the
                    shade, a bold silhouette line; alpha = her cut-out
  comic_palm.png    a palm-tree silhouette (left) with an orange rim light, RGBA
  comic_sky.png     the San Diego dusk sky: banded orange / pink / violet with halftone seams, the setting sun, the
                    Pacific and Point Loma low on the left (opaque)
"""
import os

import cv2
import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
A = os.path.join(HERE, "assets")
WORK = os.path.join(HERE, "work")
SCALE = 3
N = 512 * SCALE
TAU = np.pi * 2


def load_rgba(name):
    return np.array(Image.open(os.path.join(A, name)).convert("RGBA")).astype(np.float32) / 255.0


def hexrgb(h):
    h = h.lstrip("#")
    return np.array([int(h[i:i + 2], 16) for i in (0, 2, 4)], np.float32) / 255.0


# ------------------------------------------------------------------------------------------------
# exact photo, corners edge-extended (inside the circle untouched)
# ------------------------------------------------------------------------------------------------
def photo_full():
    p = np.array(Image.open(os.path.join(A, "yufei.webp")).convert("RGBA"))
    rgb, a = p[..., :3].copy(), p[..., 3]
    # composite the anti-aliased rim over its own extended colour (so no dark/white fringe at the circle edge)
    hole = (a < 250).astype(np.uint8)
    ext = cv2.inpaint(rgb, hole, 6, cv2.INPAINT_TELEA)
    af = a[..., None].astype(np.float32) / 255.0
    out = rgb.astype(np.float32) * af + ext.astype(np.float32) * (1 - af)
    out = np.clip(out + 0.5, 0, 255).astype(np.uint8)
    Image.fromarray(out).save(os.path.join(A, "photo_full.png"))
    return out


# ------------------------------------------------------------------------------------------------
# person: comic filter
# ------------------------------------------------------------------------------------------------
def halftone(shape, cell, angle, density, phase=(0.0, 0.0)):
    """Ben-Day dots: returns coverage 0..1 for a density field 0..1 (dot area ~ density)."""
    h, w = shape
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    ca, sa = np.cos(angle), np.sin(angle)
    u = (xx * ca + yy * sa) / cell + phase[0]
    v = (-xx * sa + yy * ca) / cell + phase[1]
    du, dv = u - np.floor(u) - 0.5, v - np.floor(v) - 0.5
    r = np.sqrt(du * du + dv * dv) * cell
    rad = np.sqrt(np.clip(density, 0, 1)) * cell * 0.58
    return np.clip(rad - r + 0.5, 0, 1) * (density > 0.02)


def xdog(L, sigma, k=1.6, tau=0.985, eps=-0.004, phi=180.0):
    g1 = cv2.GaussianBlur(L, (0, 0), sigma)
    g2 = cv2.GaussianBlur(L, (0, 0), sigma * k)
    D = g1 - tau * g2
    E = np.where(D >= eps, 1.0, 1.0 + np.tanh(phi * (D - eps)))
    return np.clip(E, 0, 1)


def clean_lines(mask, min_area):
    n, lab, stats, _ = cv2.connectedComponentsWithStats(mask.astype(np.uint8), 8)
    keep = np.zeros(n, bool)
    keep[1:] = stats[1:, cv2.CC_STAT_AREA] >= min_area
    return keep[lab]


def person():
    """Her, as a comic drawing: flat skin in two clean tones (no dots on the face), XDoG feature lines on the
    face only, glasses redrawn as clean red frames, hair as ink-violet with a cool shine, the blazer in three
    navy steps with Ben-Day dots on its lit side, the zigzag top as cream on ink, a bold silhouette line."""
    S = SCALE
    ph = np.array(Image.open(os.path.join(A, "yufei.webp")).convert("RGB"))
    cut = np.array(Image.open(os.path.join(A, "yufei-cut.webp")).convert("RGBA"))
    a512 = cut[..., 3] > 128
    # --- masks in photo space ---
    ycc = cv2.cvtColor(ph, cv2.COLOR_RGB2YCrCb).astype(int)
    Y, Cr, Cb = ycc[..., 0], ycc[..., 1], ycc[..., 2]
    skin = (Cr > 135) & (Cr < 180) & (Cb > 80) & (Cb < 130) & (Y > 70) & a512
    skin = cv2.morphologyEx(skin.astype(np.uint8), cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    skin = cv2.morphologyEx(skin, cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8)) > 0
    vv, uu = np.mgrid[0:512, 0:512]
    hair = a512 & ~skin & (vv < 236)
    clothes = a512 & ~skin & ~hair

    def up(m, blur=1.6):
        f = cv2.resize(m.astype(np.float32), (N, N), interpolation=cv2.INTER_LINEAR)
        f = cv2.GaussianBlur(f, (0, 0), blur)
        return np.clip((f - 0.5) * 2.5 + 0.5, 0, 1)
    A_ = up(a512, 2.0)
    SK, HR, CL = up(skin), up(hair), up(clothes)
    tot = SK + HR + CL + 1e-4
    SK, HR, CL = SK / tot, HR / tot, CL / tot

    rgb = cv2.resize(ph, (N, N), interpolation=cv2.INTER_CUBIC).astype(np.float32) / 255.0
    lab = cv2.cvtColor(rgb, cv2.COLOR_RGB2Lab)
    L = lab[..., 0] / 100.0
    yy, xx = np.mgrid[0:N, 0:N].astype(np.float32)

    def mblur(val, mask, s):
        num = cv2.GaussianBlur(val * mask, (0, 0), s)
        den = cv2.GaussianBlur(mask, (0, 0), s) + 1e-4
        return num / den

    # --- skin: two flat tones from a heavily blurred value (big clean shadow shapes) ---
    skm = (SK > 0.5).astype(np.float32)
    Ls = mblur(L, skm, 7.0 * S)
    med = float(np.median(Ls[skm > 0]))
    lit, shd = hexrgb("#f6cfba"), hexrgb("#d9998f")
    k1 = np.clip((Ls - (med - 0.075)) / 0.012, 0, 1)
    fe = ((xx - 262 * S) / (54 * S)) ** 2 + ((yy - 158 * S) / (66 * S)) ** 2
    k1 = np.maximum(k1, np.clip((1.0 - fe) / 0.08, 0, 1))      # the face itself stays in the light
    skinc = shd[None, None] * (1 - k1[..., None]) + lit[None, None] * k1[..., None]
    # cheeks: a soft comic blush
    for cx, cy in ((229, 171), (295, 171)):
        e = ((xx - cx * S) / (11 * S)) ** 2 + ((yy - cy * S) / (6 * S)) ** 2
        b = np.clip(1.2 - e, 0, 1) ** 1.5 * 0.35
        skinc = skinc * (1 - b[..., None]) + hexrgb("#f08c94") * b[..., None]
    # mouth: teeth cream, lips coral (from the photo inside the mouth box)


    # --- hair: ink violet with a cool shine ---
    hairc = np.ones((N, N, 3), np.float32) * hexrgb("#1f1a36")
    sh = np.zeros((N, N), np.float32)
    # comic shine: a broken band following the crown (hand placed), dots fading out of it
    for a0, a1, w in ((-1.5, -1.02, 5.5), (-0.9, -0.5, 4.5)):
        n = 20
        t = np.linspace(a0, a1, n)
        pts = np.stack([263 + 61 * np.cos(t), 127 + 54 * np.sin(t)], 1) * S
        for k in range(n - 1):   # tapered: fat in the middle
            ww = w * np.sin(np.pi * (k + 0.5) / (n - 1)) ** 0.7
            cv2.line(sh, tuple(pts[k].astype(int)), tuple(pts[k + 1].astype(int)), 1.0, max(1, int(ww * S)), cv2.LINE_AA)
    sh = sh * (HR > 0.5)
    hd = np.clip(cv2.GaussianBlur(sh, (0, 0), 6 * S) * 2.2 - sh, 0, 1) * (HR > 0.5)
    hdots = halftone((N, N), 5.5 * S, 0.785, hd * 0.8)
    hairc = hairc * (1 - hdots[..., None]) + hexrgb("#4f539a") * hdots[..., None]
    hairc = hairc * (1 - sh[..., None]) + hexrgb("#5d63ad") * sh[..., None]

    # --- clothes: cream top stripes, navy blazer in three steps with dots on the lit side ---
    cm = (CL > 0.5).astype(np.float32)
    Lc = mblur(L, cm, 1.6 * S)
    cream = np.clip((L - 0.5) / 0.06, 0, 1)
    Lcb = mblur(L, cm, 3.0 * S)
    t_lo, t_hi = float(np.quantile(Lcb[cm > 0], 0.35)), float(np.quantile(Lcb[cm > 0], 0.8))
    j1 = np.clip((Lcb - t_lo) / 0.01, 0, 1)
    clc = hexrgb("#13153a")[None, None] * (1 - j1[..., None]) + hexrgb("#262d63")[None, None] * j1[..., None]
    dd = np.clip((Lcb - t_lo) / max(1e-3, t_hi - t_lo), 0, 1) * j1
    cdots = halftone((N, N), 6.5 * S, 0.785, dd * 0.55)
    clc = clc * (1 - cdots[..., None]) + hexrgb("#4d5bb0") * cdots[..., None]
    zig = (cream > 0) & (xx > 200 * S) & (xx < 310 * S) & (yy > 300 * S)
    clc[zig] = clc[zig] * (1 - cream[zig][..., None]) + hexrgb("#f4eee2") * cream[zig][..., None]

    col = skinc * SK[..., None] + hairc * HR[..., None] + clc * CL[..., None]

    # --- ink lines ---
    ink = hexrgb("#14112a")
    E = xdog(L.astype(np.float32), sigma=2.4, tau=0.97, eps=-0.004, phi=200)
    boxes = [(219, 137, 254, 150), (272, 137, 307, 150),      # eyes
             (219, 119, 256, 133.5), (270, 119, 307, 133.5),  # brows
             (244, 152, 282, 175)]                              # nose
    fz = np.zeros((N, N), bool)
    for x0, y0, x1, y1 in boxes:
        fz |= (xx > x0 * S) & (xx < x1 * S) & (yy > y0 * S) & (yy < y1 * S)
    fl = (E < 0.5) & fz
    fl = clean_lines(fl, 30 * S)
    eyes = np.zeros((N, N), bool)
    for x0, y0, x1, y1 in boxes[:2]:
        eyes |= (xx > x0 * S) & (xx < x1 * S) & (yy > y0 * S) & (yy < y1 * S)
    fl = fl | (cv2.dilate((fl & eyes).astype(np.uint8), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (int(1.6 * S) | 1,) * 2)) > 0)
    # clothes: lapels and folds (coarser)
    E2 = xdog(L.astype(np.float32), sigma=3.2, tau=0.985, eps=-0.003, phi=160)
    cl = (E2 < 0.5) & (CL > 0.5) & ~zig
    cl = clean_lines(cl, 400 * S)
    # face silhouette: where skin meets hair / background (jaw, cheeks, neck)
    skb = (SK > 0.5).astype(np.uint8)
    er = cv2.erode(skb, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (int(2.2 * S) | 1,) * 2))
    jaw = (skb > 0) & (er == 0) & (yy > 150 * S)
    lines = (fl | cl | jaw).astype(np.float32)
    lines = cv2.GaussianBlur(lines, (0, 0), 0.9)
    col = col * (1 - lines[..., None]) + ink * lines[..., None]
    # the smile: an open D-shaped mouth with teeth (drawn from the photo's mouth corners)
    top = [(241.5, 182.0), (252, 183.6), (263, 184.2), (274, 183.6), (285, 182.0)]
    bot = [(285, 182.0), (278, 189.0), (270, 192.6), (263, 193.4), (255, 192.6), (247.5, 189.0), (241.5, 182.0)]
    mpoly = (np.array(top + bot[1:-1], np.float32) * S).astype(np.int32)
    cv2.fillPoly(col, [mpoly], tuple(hexrgb("#fdf7ee").tolist()), cv2.LINE_AA)
    tongue = (np.array([(252, 190.5), (263, 188.6), (274, 190.5), (263, 193.0)], np.float32) * S).astype(np.int32)
    cv2.fillPoly(col, [tongue], tuple(hexrgb("#e8707c").tolist()), cv2.LINE_AA)
    cv2.polylines(col, [mpoly], True, tuple(ink.tolist()), int(1.7 * S), cv2.LINE_AA)
    for cx in (240.5, 286):   # smile dimples
        cv2.ellipse(col, (int(cx * S), int(181.5 * S)), (int(2.2 * S), int(2.6 * S)), 0, (200 if cx < 260 else -20), (300 if cx < 260 else 80), tuple(ink.tolist()), int(1.4 * S), cv2.LINE_AA)

    # --- glasses: clean red half-rim frames + lens tint + glints (redrawn from the photo's landmarks) ---
    g = np.zeros((N, N, 3), np.float32); gm = np.zeros((N, N), np.float32)
    def rrect(x0, y0, x1, y1, r):
        return np.array([[x0 + r, y0], [x1 - r, y0], [x1, y0 + r], [x1, y1 - r], [x1 - r, y1], [x0 + r, y1], [x0, y1 - r], [x0, y0 + r]], np.float32)
    def lens(cx, cy, hw, hh, n=4.0, k=64):
        t = np.linspace(0, TAU, k, endpoint=False)
        ct, st = np.cos(t), np.sin(t)
        return np.stack([cx + hw * np.sign(ct) * np.abs(ct) ** (2 / n), cy + hh * np.sign(st) * np.abs(st) ** (2 / n)], 1).astype(np.float32)
    lensL, lensR = lens(232.5, 144, 20.5, 9.5), lens(291.5, 144.2, 21.5, 9.3)
    tint = np.zeros((N, N), np.float32)
    for P in (lensL, lensR):
        cv2.fillPoly(tint, [(P * S).astype(np.int32)], 1.0, cv2.LINE_AA)
    tint = tint * (SK > 0.5)
    col = col * (1 - 0.18 * tint[..., None]) + hexrgb("#e9fbff") * 0.18 * tint[..., None]
    for P in (lensL, lensR):
        top = P[32:64]          # sin < 0 half = upper rim (y down)
        bot = P[0:33]
        cv2.polylines(gm, [(top * S).astype(np.int32)], False, 1.0, int(2.8 * S), cv2.LINE_AA)
        cv2.polylines(gm, [(bot * S).astype(np.int32)], False, 0.5, int(1.5 * S), cv2.LINE_AA)
    cv2.polylines(gm, [(np.array([[253, 140], [261.5, 137.5], [270, 140]]) * S).astype(np.int32)], False, 1.0, int(2.6 * S), cv2.LINE_AA)
    cv2.line(gm, (int(212 * S), int(139 * S)), (int(203 * S), int(141 * S)), 1.0, int(2.6 * S), cv2.LINE_AA)
    cv2.line(gm, (int(313 * S), int(140 * S)), (int(321 * S), int(142 * S)), 1.0, int(2.6 * S), cv2.LINE_AA)
    gink = cv2.dilate((gm > 0.3).astype(np.uint8), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (int(1.6 * S) | 1,) * 2)).astype(np.float32)
    gink = cv2.GaussianBlur(gink, (0, 0), 0.8)
    col = col * (1 - gink[..., None]) + ink * gink[..., None]
    gcore = cv2.GaussianBlur((gm > 0.45).astype(np.float32), (0, 0), 0.7) * (gm > 0.2)
    col = col * (1 - gcore[..., None]) + hexrgb("#e2384e") * gcore[..., None]
    for x0, y0 in ((218, 139), (276, 139.5)):
        cv2.line(col, (int(x0 * S), int((y0 + 9) * S)), (int((x0 + 8) * S), int(y0 * S)), tuple(hexrgb("#ffffff").tolist()), int(2.0 * S), cv2.LINE_AA)
    # pendant: a small silver drop with an ink edge, chain as a fine V
    for P0, P1 in (((231, 262), (258, 304)), ((296, 254), (260, 304))):
        cv2.line(col, (int(P0[0] * S), int(P0[1] * S)), (int(P1[0] * S), int(P1[1] * S)), tuple(hexrgb("#c9c3d6").tolist()), int(1.2 * S), cv2.LINE_AA)
    drop = np.array([[259, 304], [264, 312], [262.5, 320], [259, 322.5], [255.5, 320], [254, 312]], np.float32) * S
    cv2.fillPoly(col, [drop.astype(np.int32)], tuple(hexrgb("#e6e2f0").tolist()), cv2.LINE_AA)
    cv2.polylines(col, [drop.astype(np.int32)], True, tuple(ink.tolist()), int(1.4 * S), cv2.LINE_AA)

    # --- bold silhouette line inside the cut-out edge ---
    solid = (A_ > 0.5).astype(np.uint8)
    ers = cv2.erode(solid, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (int(5.0 * S) | 1,) * 2))
    rim = cv2.GaussianBlur(((solid > 0) & (ers == 0)).astype(np.float32), (0, 0), 1.0)
    col = col * (1 - rim[..., None]) + ink * rim[..., None]

    out = np.dstack([np.clip(col, 0, 1), A_])
    Image.fromarray((out * 255 + 0.5).astype(np.uint8), "RGBA").save(os.path.join(A, "comic_person.png"))
    return out


# ------------------------------------------------------------------------------------------------
# sky + sea + Point Loma (opaque), palm (RGBA)
# ------------------------------------------------------------------------------------------------
HZ = 300   # horizon (photo px)


def sky():
    bands = [(0, "#4b2f86"), (52, "#6f3a92"), (98, "#9a4392"), (138, "#c44f88"), (172, "#e5627a"),
             (204, "#f47f68"), (232, "#f9a05a"), (258, "#fcc161"), (282, "#fedd86"), (HZ, None)]
    img = np.zeros((N, N, 3), np.float32)
    yy, xx = np.mgrid[0:N, 0:N].astype(np.float32)
    for i in range(len(bands) - 1):
        y0, y1 = bands[i][0] * SCALE, bands[i + 1][0] * SCALE
        img[y0:y1] = hexrgb(bands[i][1])
    # halftone seams: the band above bleeds into the band below as shrinking dots
    for i in range(1, len(bands) - 1):
        y0 = bands[i][0] * SCALE
        up = hexrgb(bands[i - 1][1])
        h = 16 * SCALE
        zone = (yy >= y0) & (yy < y0 + h)
        dens = np.clip(1 - (yy - y0) / h, 0, 1) * zone
        cov = halftone((N, N), 6.5 * SCALE, 0.0, dens * 0.9, phase=(0.25 * i, 0.5))
        img = img * (1 - cov[..., None]) + up * cov[..., None]
    # the setting sun, low behind her right shoulder, sitting on the horizon (banded comic disc)
    sx, sy, sr = 430 * SCALE, 286 * SCALE, 46 * SCALE
    d = np.hypot(xx - sx, yy - sy)
    for r, ccol in ((1.0, "#ff9f45"), (0.84, "#ffc65a"), (0.62, "#ffe7a0")):
        m = np.clip(sr * r - d + 0.5, 0, 1) * (yy < HZ * SCALE)
        img = img * (1 - m[..., None]) + hexrgb(ccol) * m[..., None]
    # a soft halftone glow round the sun
    g = np.clip(1 - (d - sr) / (70 * SCALE), 0, 1) * (d > sr) * (yy < HZ * SCALE)
    cov = halftone((N, N), 6.5 * SCALE, 0.4, g * 0.55)
    img = img * (1 - cov[..., None]) + hexrgb("#ffd27a") * cov[..., None]
    # sea
    sea_top, sea_bot = hexrgb("#6c6cb8"), hexrgb("#262a6c")
    k = np.clip((yy - HZ * SCALE) / ((512 - HZ) * SCALE), 0, 1)[..., None]
    sea = sea_top * (1 - k) + sea_bot * k
    below = (yy >= HZ * SCALE)[..., None]
    img = np.where(below, sea, img)
    # sun path on the sea: broken bright dashes
    r = np.random.default_rng(5)
    for _ in range(46):
        y = HZ * SCALE + r.uniform(4, 160) * SCALE
        w = (8 + (y / SCALE - HZ) * 0.35) * SCALE * r.uniform(0.5, 1.2)
        x = sx + r.normal(0, 14 + (y / SCALE - HZ) * 0.3) * SCALE
        cv2.line(img, (int(x - w / 2), int(y)), (int(x + w / 2), int(y)), tuple(hexrgb("#ffd890").tolist()), int(2.2 * SCALE))
    # horizon line + Point Loma (low headland on the left, rim-lit)
    cv2.line(img, (0, HZ * SCALE), (N, HZ * SCALE), tuple(hexrgb("#ffe6ad").tolist()), int(1.6 * SCALE))
    loma = np.array([[-4, HZ + 1], [-4, 276], [24, 271], [58, 273], [92, 280], [128, 289], [160, 296], [182, HZ + 1]], np.float32) * SCALE
    cv2.fillPoly(img, [loma.astype(np.int32)], tuple(hexrgb("#3b2b5e").tolist()), lineType=cv2.LINE_AA)
    cv2.polylines(img, [loma[1:-1].astype(np.int32)], False, tuple(hexrgb("#f7a784").tolist()), int(2 * SCALE), cv2.LINE_AA)
    Image.fromarray((np.clip(img, 0, 1) * 255 + 0.5).astype(np.uint8)).save(os.path.join(A, "comic_sky.png"))
    return img


def palm():
    """Palm silhouette on the left: a curved trunk from the lower left, a crown of drooping fronds."""
    img = np.zeros((N, N, 4), np.float32)
    dark = (*hexrgb("#2b1d4c").tolist(), 1.0)
    lit = (*hexrgb("#ff9c6a").tolist(), 1.0)
    S = SCALE
    # trunk: quadratic bezier, tapering, with ring notches
    P0, P1, P2 = np.array([30, 520.0]), np.array([20, 330.0]), np.array([92, 178.0])
    ts = np.linspace(0, 1, 120)
    pts = [(1 - t) ** 2 * P0 + 2 * (1 - t) * t * P1 + t * t * P2 for t in ts]
    for i, (p, t) in enumerate(zip(pts, ts)):
        w = (13 - 6 * t) * S
        cv2.circle(img, (int(p[0] * S), int(p[1] * S)), int(w), lit, -1, cv2.LINE_AA)
    for i, (p, t) in enumerate(zip(pts, ts)):
        w = (13 - 6 * t) * S
        cv2.circle(img, (int(p[0] * S - 2.5 * S), int(p[1] * S)), int(w * 0.95), dark, -1, cv2.LINE_AA)
    for t in np.linspace(0.05, 0.95, 16):
        p = (1 - t) ** 2 * P0 + 2 * (1 - t) * t * P1 + t * t * P2
        w = (13 - 6 * t)
        cv2.line(img, (int((p[0] - w) * S), int(p[1] * S)), (int((p[0] + w * 0.6) * S), int((p[1] - 3) * S)), (*hexrgb("#1a1233").tolist(), 1.0), int(1.6 * S), cv2.LINE_AA)
    # crown: fronds as leaf polygons (spine curve with serrated sides)
    cx, cy = 92, 176
    fronds = [(-2.9, 92, 0.55), (-2.45, 104, 0.45), (-1.95, 88, 0.3), (-1.35, 70, 0.1), (-0.8, 96, -0.35),
              (-0.25, 110, -0.5), (0.25, 96, -0.55), (-3.3, 70, 0.6), (0.6, 64, -0.6)]
    for ang, L, droop in fronds:
        spine = []
        for k in range(24):
            s = k / 23
            a = ang + droop * s * s * 1.6 * (1 if np.cos(ang) > 0 else -1) * -1
            r = L * s
            spine.append((cx + np.cos(ang) * r, cy + np.sin(ang) * r + 0.004 * (r ** 2) * (1.6 + droop)))
        spine = np.array(spine)
        left, right = [], []
        for k in range(len(spine)):
            s = k / (len(spine) - 1)
            p = spine[k]
            q = spine[min(k + 1, len(spine) - 1)] - spine[max(k - 1, 0)]
            q = q / (np.hypot(*q) + 1e-6)
            nrm = np.array([-q[1], q[0]])
            w = 15 * np.sin(np.pi * min(1, s * 1.15)) * (1.0 if k % 2 else 0.55)
            left.append(p + nrm * w)
            right.append(p - nrm * w)
        poly = np.array(left + right[::-1]) * S
        cv2.fillPoly(img, [poly.astype(np.int32)], dark, cv2.LINE_AA)
        cv2.polylines(img, [(spine * S).astype(np.int32)], False, (*hexrgb("#4a3570").tolist(), 1.0), int(1.4 * S), cv2.LINE_AA)
    # coconuts
    for dx, dy in ((-6, 6), (5, 8), (-1, 12)):
        cv2.circle(img, (int((cx + dx) * S), int((cy + dy) * S)), int(5.5 * S), (*hexrgb("#1e1538").tolist(), 1.0), -1, cv2.LINE_AA)
    Image.fromarray((np.clip(img, 0, 1) * 255 + 0.5).astype(np.uint8), "RGBA").save(os.path.join(A, "comic_palm.png"))
    return img


def main():
    os.makedirs(WORK, exist_ok=True)
    pf = photo_full()
    s = sky()
    pl = palm()
    pe = person()
    comp = s.copy()
    for lay in (pl, pe):
        al = lay[..., 3:4]
        comp = comp * (1 - al) + lay[..., :3] * al
    Image.fromarray((np.clip(comp, 0, 1) * 255 + 0.5).astype(np.uint8)).resize((768, 768), Image.LANCZOS).save(os.path.join(WORK, "comic_flat.jpg"), quality=90)
    Image.fromarray(pf).resize((768, 768), Image.LANCZOS).save(os.path.join(WORK, "photo_full.jpg"), quality=90)
    # face crop at 2x for checking the filter up close
    Image.fromarray((np.clip(comp, 0, 1) * 255 + 0.5).astype(np.uint8)).crop((170 * SCALE, 60 * SCALE, 360 * SCALE, 250 * SCALE)).resize((760, 760), Image.LANCZOS).save(os.path.join(WORK, "comic_face.jpg"), quality=90)
    print("ok")


if __name__ == "__main__":
    main()
