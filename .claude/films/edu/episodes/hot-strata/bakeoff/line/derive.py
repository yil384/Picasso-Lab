#!/usr/bin/env python3
"""Line look stand-ins: take the dark outline plate of an existing Codex painting (riso/toon looks) and redraw it as
black ink on white, so it can go through ink.py like the Codex line drawings. Thick dark areas (hair, trousers, navy
bands) are hollowed to an outline so the result reads as line art.
usage: python3 derive.py SRC DST [--thr 0.33] [--hollow 9] [--line 5] [--crop x0,y0,x1,y1] [--scale 1]"""
import argparse, os
import numpy as np, cv2
from PIL import Image

ART = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..', 'art'))


def derive(src, dst, thr=.33, hollow=9, line=5, crop=None, scale=1.0, edges=False, rmax=1.0, thin=0):
    """Write art/src/<dst>.png. Returns (path, None) or (None, 'error')."""
    p = os.path.join(ART, 'src', src + '.png')
    if not os.path.exists(p):
        return None, 'missing ' + p
    im = Image.open(p)
    a = np.array(im.convert('RGBA')).astype(np.float32) / 255
    rgb, al = a[..., :3], a[..., 3:]
    g = rgb[..., 1] - np.maximum(rgb[..., 0], rgb[..., 2])
    al = al * (1 - np.clip((g - .12) / .38, 0, 1))[..., None]       # green screen -> transparent
    rgb = rgb * al + (1 - al)                                        # onto white
    if crop:
        x0, y0, x1, y1 = crop
        rgb, al = rgb[y0:y1, x0:x1], al[y0:y1, x0:x1]
    if scale != 1:
        rgb = cv2.resize(rgb, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)
        al = cv2.resize(al, None, fx=scale, fy=scale, interpolation=cv2.INTER_LINEAR)[..., None]
    L = rgb @ np.array([.2126, .7152, .0722], np.float32)
    dark = np.clip((thr + .06 - L) / .12, 0, 1)                      # soft threshold on the dark ink
    dark = dark * np.clip((rmax + .04 - rgb[..., 0]) / .08, 0, 1)     # optional: only bluish darks (navy), not purple
    m = (dark > .5).astype(np.uint8)
    if hollow:
        k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (hollow, hollow))
        thick = cv2.morphologyEx(m, cv2.MORPH_OPEN, k)                # regions thicker than `hollow`
        inner = cv2.erode(thick, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * line + 1, 2 * line + 1)))
        dark = dark * (1 - cv2.GaussianBlur(inner.astype(np.float32), (0, 0), .8))
    near = cv2.dilate((dark > .3).astype(np.uint8), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * thin + 7, 2 * thin + 7)))
    if thin:    # thinner pen: erode the ink (soft values erode too, so the edge stays anti-aliased)
        dark = cv2.erode(np.clip(dark, 0, 1).astype(np.float32), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * thin + 1, 2 * thin + 1)))
    if edges:   # colour boundaries that have no dark outline (flat-colour art): add them as thin lines
        q = cv2.GaussianBlur((rgb * 255).astype(np.uint8), (0, 0), 1.2)
        e = cv2.Canny(q, 40, 110)
        e = cv2.dilate(e, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))).astype(np.float32) / 255
        e = e * (1 - near)                                            # not along the dark lines (no double lines)
        dark = np.maximum(dark, cv2.GaussianBlur(e, (0, 0), .7))
    out = (1 - np.clip(dark, 0, 1)) * 255
    out = np.where(al[..., 0] > .02, out, 255)
    dstp = os.path.join(ART, 'src', dst + '.png')
    Image.fromarray(out.astype(np.uint8), 'L').convert('RGB').save(dstp)
    return dstp, None


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('src'); ap.add_argument('dst')
    ap.add_argument('--thr', type=float, default=.33); ap.add_argument('--hollow', type=int, default=9)
    ap.add_argument('--line', type=int, default=5); ap.add_argument('--crop'); ap.add_argument('--scale', type=float, default=1)
    ap.add_argument('--edges', action='store_true'); ap.add_argument('--rmax', type=float, default=1.0); ap.add_argument('--thin', type=int, default=0)
    a = ap.parse_args()
    r, err = derive(a.src, a.dst, a.thr, a.hollow, a.line, [int(v) for v in a.crop.split(',')] if a.crop else None, a.scale, a.edges, a.rmax, a.thin)
    print(err or r)


def split_sheet(src, prefix, cols, rows, names, margin=14):
    """Cut a character sheet (black ink on white, in art/src) into one image per figure: each ink component goes to the
    nearest (column, row) centre. Returns (list of paths, None) or (None, 'error')."""
    p = os.path.join(ART, 'src', src + '.png')
    if not os.path.exists(p):
        return None, 'missing ' + p
    L = np.array(Image.open(p).convert('L'))
    ink = (L < 200).astype(np.uint8)
    n, lab, st, cen = cv2.connectedComponentsWithStats(ink, 8)
    out = []
    for r, ry in enumerate(rows):
        for c, cx in enumerate(cols):
            keep = np.zeros(n, bool)
            for i in range(1, n):
                if st[i, cv2.CC_STAT_AREA] < 6:
                    continue
                x, y = cen[i]
                if np.argmin([abs(y - v) for v in rows]) == r and np.argmin([abs(x - u) for u in cols]) == c:
                    keep[i] = True
            m = keep[lab]
            ys, xs = np.nonzero(m)
            y0, y1, x0, x1 = max(0, ys.min() - margin), ys.max() + margin, max(0, xs.min() - margin), xs.max() + margin
            crop = np.where(m, L, 255)[y0:y1, x0:x1]
            dst = os.path.join(ART, 'src', f'{prefix}{names[r]}{c + 1}.png')
            Image.fromarray(crop.astype(np.uint8), 'L').convert('RGB').save(dst)
            out.append(dst)
    return out, None
