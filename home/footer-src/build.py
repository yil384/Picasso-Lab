#!/usr/bin/env python3
"""Builds home/footer.html from home/footer-src/footer.tpl.html + code copied from home/visitor-map.html.

    python3 home/footer-src/build.py

What is copied verbatim from visitor-map.html (so the footer records visits exactly like the analytics page's
own embed did): the Supabase constants, the land mask + projection constants, the country-code table, and the
whole "data + capture" block (geo-IP, the insert, the select, the aggregation). The globe renderer, the stats and
the tooltip are the footer's own (in the template). If visitor-map.html moves these lines, the assertions below
say which one to update.
"""
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
HOME = os.path.dirname(HERE)
VM = open(os.path.join(HOME, 'visitor-map.html'), encoding='utf-8').read().split('\n')


def line(n, starts):
    s = VM[n - 1]
    assert s.strip().startswith(starts), f'visitor-map.html line {n} should start with {starts!r}: {s.strip()[:60]!r}'
    return s


def block(a, b, first, last):
    assert VM[a - 1].strip().startswith(first), f'line {a}: {VM[a - 1].strip()[:60]!r}'
    assert VM[b - 1].strip().startswith(last), f'line {b}: {VM[b - 1].strip()[:60]!r}'
    return '\n'.join(VM[a - 1:b])


def rdp(pts, eps):
    """Ramer-Douglas-Peucker on [lon, lat] points."""
    if len(pts) < 3:
        return pts
    (x0, y0), (x1, y1) = pts[0], pts[-1]
    dx, dy = x1 - x0, y1 - y0
    n = (dx * dx + dy * dy) ** 0.5
    best, bi = -1.0, 0
    for i in range(1, len(pts) - 1):
        px, py = pts[i]
        d = abs(dy * px - dx * py + x1 * y0 - y1 * x0) / n if n > 1e-12 else ((px - x0) ** 2 + (py - y0) ** 2) ** 0.5
        if d > best:
            best, bi = d, i
    if best <= eps:
        return [pts[0], pts[-1]]
    return rdp(pts[:bi + 1], eps)[:-1] + rdp(pts[bi:], eps)


consts = '\n'.join([line(145, 'var SUPABASE_URL'), line(146, 'var SUPABASE_ANON_KEY'), line(147, 'var ANALYTICS_URL')])
mask = line(149, 'var MASK_B64')
borders_src = line(150, 'var BORDERS')
proj = '\n'.join([line(151, 'var GW = 220'), line(152, 'function mercY'), line(153, 'var MAP_ASPECT'), line(154, 'var LIVE_COUNT')])
iso = line(180, 'var ISO = {')
land = '\n'.join([line(183, 'var Bytes'), line(184, 'function isLand')])
state = '\n'.join([line(186, 'var IS_TOP'), line(187, 'var pings = []')])
data = block(234, 277, '/* ---------- data + capture', "try { if (!sessionStorage.getItem('vm_seen'))")
helpers = block(280, 282, 'function esc(s)', "if (s < 60) return 'now'")

# borders: countries only, simplified (0.12 deg, invisible on a card), short rings dropped, 1 decimal
B = json.loads(borders_src[borders_src.index('{'):borders_src.rindex('}') + 1])
out = []
for poly in B['countries']:
    p = rdp([[round(x, 2), round(y, 2)] for x, y in poly], 0.12)
    xs, ys = [q[0] for q in p], [q[1] for q in p]
    if len(p) < 3 or (max(xs) - min(xs)) + (max(ys) - min(ys)) < 0.6:
        continue
    out.append([[round(x, 1), round(y, 1)] for x, y in p])
borders = 'var BORDERS = ' + json.dumps({'countries': out}, separators=(',', ':')) + ';'


def sub(src, old, new):
    assert src.count(old) == 1, old
    return src.replace(old, new)


# ... and redraws the map's visitor dots when the data arrives
data = sub(data, "if (IS_TOP) renderDash(); }", "if (IS_TOP) renderDash(); onData(cc); }")

js = '\n'.join([consts, mask, proj, iso, land, state, '', data, '', helpers])   # (no borders: the globe draws none)
tpl = open(os.path.join(HERE, 'footer.tpl.html'), encoding='utf-8').read()
assert tpl.count('//@@VM_JS@@') == 1
out_html = tpl.replace('//@@VM_JS@@', js)
assert '@@' not in out_html
open(os.path.join(HOME, 'footer.html'), 'w', encoding='utf-8').write(out_html)
print('wrote home/footer.html', len(out_html.encode('utf-8')), 'bytes;', len(out), 'border rings')
