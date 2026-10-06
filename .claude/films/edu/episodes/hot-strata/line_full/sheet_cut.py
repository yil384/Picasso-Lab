#!/usr/bin/env python3
"""Cut a Codex character sheet (art/src/<SHEET>.png: black ink on white, figures on a roughly even grid) into one
drawing per figure, then pack each with the bake-off's ink.py. It is the same cut as derive.split_sheet (every ink blob
goes whole to one figure, cropped with a 14 px margin, written to art/src/<PREFIX><ROW><N>.png), but the edges between
figures are measured on the sheet (the white gap nearest each even-grid line, row by row) instead of guessed, so wide
props, motion strokes and sweat drops do not throw it off.

usage: python3 sheet_cut.py SHEET PREFIX NCOLS ROWNAMES SWEEP [--dry]
  e.g. python3 sheet_cut.py line_chefs_more line_chef_ 6 b,r c    -> line_chef_b1..6, line_chef_r1..6
       python3 sheet_cut.py line_manager line_manager_ 3 '' y     -> line_manager_1..3
  --dry prints the edges it found and writes nothing.
Every function returns (value, None) or (None, 'error')."""
import os, sys
import numpy as np, cv2
from PIL import Image

LINE = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'bakeoff', 'line'))
sys.path.insert(0, LINE)
import ink  # noqa: E402  (bake-off packer; ink.ART is .claude/films/edu/art)

SPECK = 3      # a column / row with fewer ink pixels than this counts as white
MARGIN = 14    # same crop margin as derive.split_sheet


def load(name):
    """Grey image of art/src/<name>.png with alpha composited onto white. Returns (uint8 array, None) or (None, err)."""
    p = os.path.join(ink.ART, 'src', name + '.png')
    if not os.path.exists(p):
        return None, 'missing ' + p
    a = np.array(Image.open(p).convert('RGBA')).astype(np.float32) / 255
    rgb = a[..., :3] * a[..., 3:] + (1 - a[..., 3:])
    return (rgb @ np.array([.2126, .7152, .0722], np.float32) * 255).astype(np.uint8), None


def edges(profile, n):
    """n bands along one axis of length len(profile): for each even-grid line k*len/n, the middle of the widest white
    run within +-35% of a cell from it (or, if none, the faintest column there). Returns ([0, e1, ..., len], None)."""
    size = len(profile)
    if not (profile >= SPECK).any():
        return None, 'no ink'
    white = profile < SPECK
    soft = cv2.GaussianBlur(profile.astype(np.float32).reshape(1, -1), (0, 0), 7).ravel()
    out, reach = [0], .35 * size / n
    for k in range(1, n):
        t = k * size / n
        lo, hi = int(max(out[-1] + 1, t - reach)), int(min(size - 1, t + reach))
        best, i = None, lo
        while i <= hi:
            if not white[i]:
                i += 1
                continue
            j = i
            while j < size and white[j]:
                j += 1
            s = i
            while s > 0 and white[s - 1]:
                s -= 1
            score = (j - s, -abs((s + j) / 2 - t))
            if best is None or score > best[0]:
                best = (score, (s + j) // 2)
            i = j
        out.append(best[1] if best else lo + int(np.argmin(soft[lo:hi + 1])))
    out.append(size)
    if any(b - a < size / n * .4 for a, b in zip(out, out[1:])):
        return None, 'uneven cells %s: check the sheet by eye' % out
    return out, None


def layout(sheet, ncols, nrows):
    """Row edges and, per row, column edges. Returns ((grey, rows, [cols per row]), None) or (None, err)."""
    g, err = load(sheet)
    if err:
        return None, err
    m = g < 200
    rows, err = edges(m.sum(1), nrows)
    if err:
        return None, 'rows: ' + err
    cols = []
    for r in range(nrows):
        c, err = edges(m[rows[r]:rows[r + 1]].sum(0), ncols)
        if err:
            return None, 'row %d: %s' % (r + 1, err)
        cols.append(c)
    return (g, rows, cols), None


def cut(sheet, prefix, ncols, rownames, sweep, dry=False):
    """Cut every figure and pack it. Returns ([(name, (w, h)), ...], None) or (None, err)."""
    lay, err = layout(sheet, ncols, len(rownames))
    if err:
        return None, '%s: %s' % (sheet, err)
    g, rows, cols = lay
    if dry:
        return [(rownames[r] or 'row', ('y %d-%d' % (rows[r], rows[r + 1]), 'x edges %s' % cols[r]))
                for r in range(len(rownames))], None
    n, lab, st, cen = cv2.connectedComponentsWithStats((g < 200).astype(np.uint8), 8)
    who = np.full(n, -1)
    for i in range(1, n):
        if st[i, cv2.CC_STAT_AREA] < 6:
            continue
        x, y = cen[i]
        r = min(int(np.searchsorted(rows, y, 'right')) - 1, len(rownames) - 1)
        c = min(int(np.searchsorted(cols[r], x, 'right')) - 1, ncols - 1)
        who[i] = r * ncols + c
    done = []
    for r, rn in enumerate(rownames):
        for c in range(ncols):
            m = who[lab] == r * ncols + c
            ys, xs = np.nonzero(m)
            if not len(ys):
                return None, '%s: no figure in row %d, column %d' % (sheet, r + 1, c + 1)
            y0, y1 = max(0, ys.min() - MARGIN), ys.max() + MARGIN
            x0, x1 = max(0, xs.min() - MARGIN), xs.max() + MARGIN
            name = '%s%s%d' % (prefix, rn, c + 1)
            crop = np.where(m, g, 255)[y0:y1, x0:x1]
            Image.fromarray(crop.astype(np.uint8), 'L').convert('RGB').save(os.path.join(ink.ART, 'src', name + '.png'))
            size, err = ink.pack(name, sweep)
            if err:
                return None, err
            done.append((name, size))
    return done, None


if __name__ == '__main__':
    args = [a for a in sys.argv[1:] if a != '--dry']
    if len(args) != 5:
        sys.exit(__doc__)
    sheet, prefix, ncols, names, sweep = args
    res, err = cut(sheet, prefix, int(ncols), names.split(','), sweep, dry='--dry' in sys.argv)
    if err:
        sys.exit(err)
    for name, info in res:
        print(name, info)
