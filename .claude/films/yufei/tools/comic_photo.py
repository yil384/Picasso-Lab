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
    """Her, as the REAL photo pasted into the comic world. Her face, hair, glasses, neck and the zigzag top are
    the photo's own pixels (upscaled, never redrawn or relit). The comic look lives around her face only:
    the navy blazer in three flat steps with Ben-Day dots and ink folds, a warm dusk rim light on the hair /
    blazer edge facing the sun (never on the face), and a bold ink silhouette line round the whole cut-out."""
    S = SCALE
    full = np.array(Image.open(os.path.join(A, "photo_full.png")).convert("RGB"))       # corners filled
    ph = np.array(Image.open(os.path.join(A, "yufei.webp")).convert("RGBA"))
    cut = np.array(Image.open(os.path.join(A, "yufei-cut.webp")).convert("RGBA"))
    inside = ph[..., 3] > 250                                                          # the avatar circle
    a512 = cut[..., 3].astype(np.float32) / 255.0
    # the matte follows the photo's circle at the bottom (stair steps): carry each column's alpha straight
    # down past the circle so the blazer continues to the frame edge
    for x in range(512):
        col = inside[:, x]
        ys = np.nonzero(col)[0]
        if len(ys) == 0:
            continue
        yb = ys.max()
        if yb < 511 and yb > 300:
            a512[yb + 1:, x] = a512[max(0, yb - 2), x]
    vv, uu = np.mgrid[0:512, 0:512]
    ycc = cv2.cvtColor(full, cv2.COLOR_RGB2YCrCb).astype(int)
    Y, Cr, Cb = ycc[..., 0], ycc[..., 1], ycc[..., 2]
    solid = a512 > 0.5
    skin = (Cr > 135) & (Cr < 180) & (Cb > 80) & (Cb < 130) & (Y > 70) & solid
    skin = cv2.morphologyEx(skin.astype(np.uint8), cv2.MORPH_OPEN, np.ones((3, 3), np.uint8))
    skin = cv2.morphologyEx(skin, cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8)) > 0
    hair = solid & ~skin & (vv < 236)
    # the zigzag top: the light/dark striped wedge between the lapels
    zig = solid & (uu > 205) & (uu < 300) & (vv > 318)
    # protected = everything that is HER (face, hair, neck, chest, pendant, top): photo pixels only
    face = (((uu - 262) / 66.0) ** 2 + ((vv - 160) / 88.0) ** 2) < 1.0
    protect = face | skin | hair | zig
    protect = cv2.dilate(protect.astype(np.uint8), np.ones((5, 5), np.uint8)) > 0
    blazer = solid & ~protect

    def up(m, blur=1.2):
        f = cv2.resize(m.astype(np.float32), (N, N), interpolation=cv2.INTER_CUBIC)
        return np.clip(cv2.GaussianBlur(f, (0, 0), blur), 0, 1)

    # --- base: the photo itself, Lanczos x3, a whisper of sharpening (no relighting, no recolouring) ---
    base = np.array(Image.fromarray(full).resize((N, N), Image.LANCZOS)).astype(np.float32) / 255.0
    base = np.clip(base + 0.3 * (base - cv2.GaussianBlur(base, (0, 0), 1.1 * S)), 0, 1)
    A_ = np.clip((up(a512, 1.4) - 0.5) * 3.0 + 0.5, 0, 1)
    solidN = (A_ > 0.5).astype(np.float32)
    # edge decontamination: the matte's last pixels carry the green garden; pull colour in from inside
    core = cv2.erode(solidN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (int(4 * S) | 1,) * 2))
    num = cv2.GaussianBlur(base * core[..., None], (0, 0), 2.0 * S)
    den = cv2.GaussianBlur(core, (0, 0), 2.0 * S)[..., None] + 1e-4
    fill = num / den
    edgeband = np.clip(solidN - core, 0, 1)
    edgeband = cv2.GaussianBlur(edgeband, (0, 0), 0.8 * S)[..., None]
    col = base * (1 - edgeband) + fill * edgeband

    yy, xx = np.mgrid[0:N, 0:N].astype(np.float32)
    lab = cv2.cvtColor(base, cv2.COLOR_RGB2Lab)
    L = lab[..., 0] / 100.0
    BZ = up(blazer, 1.0)
    PR = 1.0 - BZ

    def mblur(val, mask, s):
        return cv2.GaussianBlur(val * mask, (0, 0), s) / (cv2.GaussianBlur(mask, (0, 0), s) + 1e-4)

    # --- the blazer: three flat navy steps, Ben-Day dots on the lit side, ink folds ---
    bm = (BZ > 0.5).astype(np.float32)
    Lb = mblur(L, bm, 2.6 * S)
    t_lo, t_hi = float(np.quantile(Lb[bm > 0], 0.38)), float(np.quantile(Lb[bm > 0], 0.82))
    j1 = np.clip((Lb - t_lo) / 0.012, 0, 1)
    j2 = np.clip((Lb - t_hi) / 0.012, 0, 1)
    bz = hexrgb("#121436")[None, None] * (1 - j1[..., None]) + hexrgb("#222a5e")[None, None] * j1[..., None]
    bz = bz * (1 - j2[..., None]) + hexrgb("#2f3a7c")[None, None] * j2[..., None]
    dd = np.clip((Lb - t_lo) / max(1e-3, t_hi - t_lo), 0, 1) * j1
    dots = halftone((N, N), 6.5 * S, 0.785, dd * 0.5)
    bz = bz * (1 - dots[..., None]) + hexrgb("#4d5bb0") * dots[..., None]
    E2 = xdog(L.astype(np.float32), sigma=3.2, tau=0.985, eps=-0.003, phi=160)
    fold = (E2 < 0.5) & (BZ > 0.5)
    fold = clean_lines(fold, 400 * S)
    fold = cv2.GaussianBlur(fold.astype(np.float32), (0, 0), 0.9)
    bz = bz * (1 - fold[..., None]) + hexrgb("#0b0b1e") * fold[..., None]
    col = col * PR[..., None] + bz * BZ[..., None]
    # where the blazer meets her (lapel edges): a fine ink line, so the collage seam reads as drawn
    seam = (cv2.dilate((BZ > 0.5).astype(np.uint8), np.ones((int(2.4 * S) | 1,) * 2, np.uint8)) > 0) & (BZ <= 0.5) & (solidN > 0.5)
    seam = seam & ~(up(face, 1.0) > 0.3)
    seam = cv2.GaussianBlur(seam.astype(np.float32), (0, 0), 0.8)
    col = col * (1 - seam[..., None]) + hexrgb("#0b0b1e") * seam[..., None]

    # --- warm dusk rim on the side facing the sun (her left = image right), hair + blazer only ---
    sh_ = np.float32([[1, 0, -3.6 * S], [0, 1, 2.0 * S]])
    moved = cv2.warpAffine(solidN, sh_, (N, N), borderValue=0)
    rim = np.clip(solidN - moved, 0, 1) * np.clip((xx - 250 * S) / (30 * S), 0, 1) * (yy > 215 * S)
    rim = rim * (1.0 - up(cv2.dilate((face | skin).astype(np.uint8), np.ones((9, 9), np.uint8)) > 0, 2.0))
    rim = cv2.GaussianBlur(rim, (0, 0), 0.7)
    col = col * (1 - 0.8 * rim[..., None]) + hexrgb("#ff9a5c") * 0.8 * rim[..., None]

    # --- bold ink silhouette line, centred on the cut-out edge (outside part extends the alpha) ---
    sb = (solidN > 0.5).astype(np.uint8)
    outer = cv2.dilate(sb, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (int(4.2 * S) | 1,) * 2))
    inner = cv2.erode(sb, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (int(2.6 * S) | 1,) * 2), borderType=cv2.BORDER_REPLICATE)
    line = ((outer > 0) & (inner == 0)).astype(np.float32)
    line = cv2.GaussianBlur(line, (0, 0), 0.9)
    ink = hexrgb("#14112a")
    col = col * (1 - line[..., None]) + ink * line[..., None]
    alpha = np.maximum(A_, line)

    out = np.dstack([np.clip(col, 0, 1), alpha])
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
