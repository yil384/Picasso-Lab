#!/usr/bin/env python3
"""Picasso Lab's first X post: "the paper wall" - a ~42 s 4:5 film made of the lab's real publications.

The first pages of all 136 publications (rendered from arXiv PDFs where they exist, typeset from title, authors
and venue where they don't) are the cast. Beats:
  1  they fall in, oldest first, while a counter and the year run up (camera pulls out from the first paper)
  2  they spell PICASSO
  3  they stack into columns by year: the lab's growth, 2013 -> 2026
  4  they re-stack by venue: ISCA 15, ASPLOS 15, MICRO 9 ...
  5  they sort into the three rings of the lab's logo, Physics x Computer Science x Math; the camera visits each
     ring and names three papers in it
  6  the award papers step forward and get their seals (best paper first, close up)
  7  supported by (the sponsor wall of the website)
  8  the people (team photo, an alumna now faculty)
  9  logo, "We are recruiting PhD students.", @PicassoLabUCSD

    python3 social/x/paperwall.py --fonts DIR --pages social/x/pages  ->  social/x/out/picasso_paperwall.mp4
    --only 40,300   writes stills out/pw_NNNN.jpg instead
Fonts (ttf; woff2 -> ttf with fontTools): InstrumentSerif(-Italic).ttf, Fraunces.ttf (variable), NotoSansSC-Bold/Medium.ttf."""
import argparse, json, math, os, re, subprocess
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
ap = argparse.ArgumentParser(); ap.add_argument('--fonts', required=True); ap.add_argument('--pages', default=os.path.join(HERE, 'pages'))
ap.add_argument('--only'); ap.add_argument('--export'); A = ap.parse_args()
W, H, FPS = 1080, 1350, 24
BG, INK, MUTE = (246, 242, 233), (22, 21, 28), (112, 106, 98)
BLUE, GREEN, RED, GOLD = (31, 111, 186), (84, 163, 58), (200, 40, 40), (196, 146, 40)
TAU = 2 * math.pi
_FC = {}
def F(name, size, wght=None):
    key = (name, int(size), wght)
    if key not in _FC:
        f = ImageFont.truetype(os.path.join(A.fonts, name), max(4, int(size)))
        if wght is not None:
            try: f.set_variation_by_axes([wght])
            except Exception: pass
        _FC[key] = f
    return _FC[key]
SERIF = lambda s: F('InstrumentSerif.ttf', s); ITAL = lambda s: F('InstrumentSerif-Italic.ttf', s)
NUM = lambda s, w=800: F('Fraunces.ttf', s, w)
SANS = lambda s, w=600: F('NotoSansSC-Bold.ttf' if w >= 650 else 'NotoSansSC-Medium.ttf', s)
clamp = lambda x, a=0.0, b=1.0: max(a, min(b, x))
def sm(x): x = clamp(x); return x * x * (3 - 2 * x)
def eio(x): x = clamp(x); return 4 * x ** 3 if x < 0.5 else 1 - (-2 * x + 2) ** 3 / 2
def eout(x): x = clamp(x); return 1 - (1 - x) ** 3
def ob(x, s=1.5): x = clamp(x) - 1; return 1 + x * x * ((s + 1) * x + s)
def hsh(*n):
    x = math.sin(sum(v * (12.9898 + i * 78.233) for i, v in enumerate(n)) + 0.5) * 43758.5453
    return x - math.floor(x)
lerp = lambda a, b, t: a + (b - a) * t
def win(f, a, b, fade=10):   # 0 -> 1 -> 0 visibility of an overlay shown in [a, b)
    return sm((f - a) / fade) * (1 - sm((f - b + fade) / fade))

# ---------------------------------------------------------------------------------------------------------
# the publications (pubs.json = the site's publication list, newest first) and their first pages
# ---------------------------------------------------------------------------------------------------------
PUBS = json.load(open(os.path.join(HERE, 'pubs.json')))
N = len(PUBS)
for k, p in enumerate(PUBS):
    p['k'] = k; p['tag'] = p['tags'][0]; p['venue'] = p['tag'].split("'")[0].strip()
    y = re.search(r"'(\d\d)", p['tag']); p['yr'] = 2000 + int(y.group(1)) if y else None
    p['year'] = p['yr'] or 2026
    p['short'] = re.split(r':\s', p['title'])[0].strip()
QUANT = re.compile(r'quantum|qubit|\bQEC\b|photonic|ion trap|clifford|pauli|surface code|variational|NISQ|fault-tolerant|hamiltonian|neutral-atom|superconducting|entangl', re.I)
MATHY = re.compile(r'compil|programming language|\bprograms?\b|verif|assert|synthes|polyhedral|type system|transpil|formal|theory', re.I)
ARCHV = {'ISCA', 'MICRO', 'HPCA', 'DAC', 'TCAD', 'JSSC', 'ISSCC', 'TC', 'TACO', 'CGO', 'PLDI', 'OOPSLA'}
ARCHT = re.compile(r'compil|\baccelerators?\b|architect|chip|memory|hardware|FPGA|dataflow|spatial|cache|DRAM|processor|circuit|RTL|Verilog|page fault', re.I)
for p in PUBS: p['ring'] = 0 if QUANT.search(p['title']) else (2 if (p['venue'] in ARCHV or ARCHT.search(p['title'])) else 1)
AWARD = {k: t for k, p in enumerate(PUBS) for t in p['tags'][1:] if re.search(r'award|nominee', t, re.I)}
ORDER = sorted(range(N), key=lambda k: (PUBS[k]['year'], -k))          # oldest first
RANK = {k: i for i, k in enumerate(ORDER)}

def typeset_page(p, S=2):
    """a first page in the usual two-column proceedings layout, for papers with no PDF online (S x 612 x 792)"""
    w, h = 612 * S, 792 * S; im = Image.new('RGB', (w, h), (255, 255, 255)); d = ImageDraw.Draw(im)
    f = F('InstrumentSerif.ttf', 31 * S); lines, cur = [], ''
    for wd in p['title'].split():
        if d.textlength(cur + ' ' + wd, font=f) > 500 * S and cur: lines.append(cur); cur = wd
        else: cur = (cur + ' ' + wd).strip()
    lines.append(cur); y = 64 * S
    for ln in lines[:4]: d.text(((w - d.textlength(ln, font=f)) / 2, y), ln, font=f, fill=(0, 0, 0)); y += 36 * S
    au = p['authors'][:100] + ('...' if len(p['authors']) > 100 else '')
    fa = SANS(11 * S, 500); d.text(((w - d.textlength(au, font=fa)) / 2, y + 12 * S), au, font=fa, fill=(50, 50, 50))
    y += 56 * S; rng = np.random.default_rng(p['k'])
    fig = rng.random() < 0.55; figcol = int(rng.integers(0, 2)); par = [False]
    for col in (0, 1):
        x0 = (54 + col * 262) * S; yy = y + 8 * S
        d.text((x0, yy), 'Abstract' if col == 0 else '1  Introduction', font=SANS(11 * S, 700), fill=(0, 0, 0)); yy += 20 * S
        while yy < h - 58 * S:
            if fig and col == figcol and abs(yy - (y + 200 * S)) < 6 * S:
                d.rectangle((x0, yy, x0 + 236 * S, yy + 120 * S), fill=(236, 236, 240))
                d.rectangle((x0 + 20 * S, yy + 20 * S, x0 + 110 * S, yy + 100 * S), fill=(196, 206, 226))
                d.rectangle((x0 + 126 * S, yy + 50 * S, x0 + 216 * S, yy + 100 * S), fill=(226, 200, 190)); yy += 138 * S; continue
            # greeked text: words of varying length on an x-height band, justified lines, ragged last line of a paragraph
            last = rng.random() < 0.13; L = 236 if not last else int(rng.integers(60, 200))
            x = x0 + (10 * S if par[0] else 0); par[0] = False
            while x < x0 + L * S - 6 * S:
                wl = int(rng.integers(3, 16)) * 1.6 * S
                wl = min(wl, x0 + L * S - x)
                d.rectangle((x, yy + 1 * S, x + wl, yy + 3.6 * S), fill=(118, 118, 122))
                if rng.random() < 0.18: d.rectangle((x + wl * 0.2, yy, x + wl * 0.2 + 1.2 * S, yy + 1 * S), fill=(118, 118, 122))   # ascender
                x += wl + 2.6 * S
            yy += 9 * S
            if last: yy += 5 * S; par[0] = True
    d.text((54 * S, h - 34 * S), p['tag'], font=SANS(10 * S, 500), fill=(90, 90, 90))
    return im

_PG = {}
def page(k, w):
    w = max(4, int(w))
    if k not in _PG:
        f = os.path.join(A.pages, f'{k:03d}.jpg')
        src = Image.open(f).convert('RGB') if os.path.exists(f) else typeset_page(PUBS[k])
        _PG[k] = {'s': src.resize((360, int(360 * src.height / src.width)), Image.LANCZOS), 'b': None, 'src': src, 'cache': {}}
    c = _PG[k]
    if w in c['cache']: return c['cache'][w]
    if w > 360:
        if c['b'] is None: c['b'] = c['src'].resize((900, int(900 * c['src'].height / c['src'].width)), Image.LANCZOS)
        base = c['b']
    else: base = c['s']
    im = base.resize((w, max(4, int(w * base.height / base.width))), Image.LANCZOS if w < 200 else Image.BILINEAR)
    if len(c['cache']) > 6: c['cache'].clear()
    c['cache'][w] = im
    return im

# ---------------------------------------------------------------------------------------------------------
# layouts: per paper (x, y, width, rotation, alpha) in world units (1080 x 1350)
# ---------------------------------------------------------------------------------------------------------
PILE = (540, 800)
def lay_pile(k):
    return (PILE[0] + (hsh(k, 1) - 0.5) * 420, PILE[1] + (hsh(k, 2) - 0.5) * 240, 240, (hsh(k, 3) - 0.5) * 0.7, 1.0)

WORD_Y0 = 360
def word_mask():
    d0 = ImageDraw.Draw(Image.new('L', (1, 1))); f = NUM(300, 900); f = NUM(int(300 * 1040 / d0.textlength('PICASSO', font=f)), 900)
    m = Image.new('L', (W, 520)); d = ImageDraw.Draw(m); bb = d.textbbox((0, 0), 'PICASSO', font=f)
    d.text(((W - (bb[2] - bb[0])) / 2 - bb[0], (520 - (bb[3] - bb[1])) / 2 - bb[1]), 'PICASSO', font=f, fill=255)
    return m
MASK = word_mask()
def word_cells():
    a = np.asarray(MASK) > 128
    for c in np.arange(40, 8, -0.5):
        ch = c * 1.294; cells = [(x, y) for y in np.arange(ch / 2, 520, ch) for x in np.arange(c / 2, W, c) if a[int(y), int(x)]]
        if len(cells) >= N: return c, cells
CELL, CELLS = word_cells()
CELLS = sorted(CELLS, key=lambda q: (q[0], q[1])); CELLS = [CELLS[i * len(CELLS) // N] for i in range(N)]
def lay_word(k):
    x, y = CELLS[RANK[k]]
    return (x, WORD_Y0 + y, CELL * 0.82, (hsh(k, 21) - 0.5) * 0.12, 1.0)

YEARS = list(range(2013, 2027))
YCOUNT = {y: sum(1 for p in PUBS if p['yr'] == y) for y in YEARS}
Y_BASE, Y_STEP = 1100, 31
YX = lambda y: 75 + (y - 2013) * (930 / 13)
def lay_year(k):
    p = PUBS[k]
    if p['yr'] is None:   # preprints and patents: a small stack set aside at the right
        same = [q for q in ORDER if PUBS[q]['yr'] is None]; j = same.index(k)
        return (1000 + (j % 2) * 6, 380 + j * 12, 40, 0.05, 0.0)
    same = [q for q in ORDER if PUBS[q]['yr'] == p['yr']]; j = same.index(k)
    return (YX(p['yr']), Y_BASE - 34 - j * Y_STEP, 58, (hsh(k, 6) - 0.5) * 0.08, 1.0)

TOPV = [v for v, _ in sorted(((v, sum(1 for p in PUBS if p['venue'] == v)) for v in set(p['venue'] for p in PUBS)
                                 if v not in ('arXiv', 'preprint', 'US Patent')), key=lambda q: (-q[1], q[0]))[:8]]
VCOUNT = {v: sum(1 for p in PUBS if p['venue'] == v) for v in TOPV}
BAR_BASE, BAR_STEP = 1090, 44
VX = lambda c: 110 + c * 123
def lay_bar(k):
    v = PUBS[k]['venue']
    if v in TOPV:
        same = [q for q in ORDER if PUBS[q]['venue'] == v]; j = same.index(k)
        return (VX(TOPV.index(v)), BAR_BASE - 45 - j * BAR_STEP, 70, (hsh(k, 7) - 0.5) * 0.06, 1.0)
    others = [q for q in ORDER if PUBS[q]['venue'] not in TOPV]; j = others.index(k)
    return (540 + (hsh(k, 8) - 0.5) * 900, 1500 + hsh(k, 9) * 200, 44, (hsh(k, 8) - 0.5) * 0.6, 0.0)

RINGS = [((300, 840), BLUE, 'Quantum computing', 'compilers, error correction, architecture'), ((540, 585), GREEN, 'Machine learning systems', 'LLM serving & training, GPU kernels'),
         ((780, 840), RED, 'Architecture & compilers', 'accelerators, memory, chip design')]
RING_R = 205
RMEM = [[q for q in ORDER if PUBS[q]['ring'] == r] for r in range(3)]
def lay_ring(k):
    r = PUBS[k]['ring']; mem = RMEM[r]; j = mem.index(k); n = len(mem)
    (cx, cy), *_ = RINGS[r]
    rr = (RING_R - 36) * math.sqrt((j + 0.5) / n); a = j * 2.39996 + r
    return (cx + rr * math.cos(a), cy + rr * math.sin(a), 32 if n > 45 else 40, (hsh(k, 9) - 0.5) * 0.25, 1.0)
def rep_papers(r):
    tv = set(TOPV) | {'NeurIPS', 'OSDI', 'SOSP', 'PLDI', 'OOPSLA', 'ICML'}
    mem = sorted(RMEM[r], key=lambda q: (q not in AWARD, PUBS[q]['venue'] not in tv, -PUBS[q]['year'], q))
    out, seen = [], set()
    for q in mem:
        if PUBS[q]['short'] in seen or len(PUBS[q]['short']) > 46: continue
        out.append(q); seen.add(PUBS[q]['short'])
        if len(out) == 3: break
    return out
REPS = [rep_papers(r) for r in range(3)]

AW_LIST = sorted(AWARD, key=lambda k: (not AWARD[k].startswith('Award: Best'), -PUBS[k]['year'], k))
AWX = lambda i: (200 + (i % 3) * 340, 545 + (i // 3) * 455)
def lay_award(k):
    if k in AWARD:
        x, y = AWX(AW_LIST.index(k)); return (x, y, 280, (hsh(k, 11) - 0.5) * 0.04, 1.0)
    return (540 + (hsh(k, 12) - 0.5) * 1500, -320 - hsh(k, 13) * 500, 110, (hsh(k, 14) - 0.5) * 1.4, 1.0)
def lay_gone(k):
    x, y, w, r, a = lay_award(k)
    return (x + (hsh(k, 16) - 0.5) * 200, -480 - hsh(k, 15) * 300, w * 0.6, r + 0.5, 1.0)

# ---------------------------------------------------------------------------------------------------------
# timeline (frames @ 24 fps)
# ---------------------------------------------------------------------------------------------------------
FALL0, FALL1 = 8, 96
SEQ = [('pile', 0), ('word', 112), ('year', 214), ('bar', 316), ('ring', 410), ('award', 610), ('gone', 742)]
LAYS = {'pile': lay_pile, 'word': lay_word, 'year': lay_year, 'bar': lay_bar, 'ring': lay_ring, 'award': lay_award, 'gone': lay_gone}
FLY, LEAD = 26, 18
SPON0, PEOPLE0, END0, END = 760, 850, 950, 1032
def drop_frame(k): return FALL0 + (FALL1 - FALL0) * (RANK[k] / (N - 1)) ** 0.62     # slow at first, then a downpour

def tile_state(k, f):
    """(x, y, w, rot, alpha, lift) in world units, or None"""
    if f < drop_frame(k): return None
    if f < SEQ[1][1] - LEAD:
        x, y, w, r, a = lay_pile(k); t = clamp((f - drop_frame(k)) / 8)
        e = t * t                                          # falling: accelerate onto the pile
        land = max(0, 1 - abs(f - drop_frame(k) - 8) / 4) * 0.04
        return (x, lerp(-300, y, e), w * (1.25 - 0.25 * e + land), r * e + (1 - e) * 0.3, 1.0, (1 - e) * 60)
    i = max(j for j in range(1, len(SEQ)) if f >= SEQ[j][1] - LEAD)
    name, f0 = SEQ[i]; prev = SEQ[i - 1][0]
    d = hsh(k, i, 5) * 16
    t = eio((f - (f0 - LEAD) - d) / FLY)
    a = LAYS[prev](k); b = LAYS[name](k)
    lift = math.sin(math.pi * t)
    st = [lerp(a[j], b[j], t) for j in range(5)]
    return (st[0], st[1] - lift * (50 + 70 * hsh(k, i)), st[2] * (1 + 0.18 * lift), st[3] + lift * (hsh(k, i, 9) - 0.5) * 0.7, st[4], lift * 40)

# camera: (zoom, centre x, centre y) in world units
def kf(f, keys):
    if f <= keys[0][0]: return keys[0][1]
    for (a, va), (b, vb) in zip(keys, keys[1:]):
        if f < b: t = eio((f - a) / (b - a)); return tuple(lerp(u, v, t) for u, v in zip(va, vb))
    return keys[-1][1]
(_, (R0, R1, R2)) = (None, [c for c, *_ in RINGS])
CAM = [(0, (1.8, 540, 700)), (14, (1.8, 540, 700)), (100, (1.0, 540, 700)), (112, (1.0, 540, 675)), (205, (1.04, 540, 660)),
       (214, (1.0, 540, 675)), (410, (1.0, 540, 675)), (438, (1.0, 540, 675)),
       (458, (1.75, R0[0] + 40, R0[1] + 40)), (500, (1.75, R0[0] + 40, R0[1] + 40)),
       (518, (1.6, R1[0], R1[1] + 60)), (556, (1.6, R1[0], R1[1] + 60)),
       (574, (1.75, R2[0] - 40, R2[1] + 40)), (600, (1.75, R2[0] - 40, R2[1] + 40)), (618, (1.0, 540, 675)),
       (634, (2.0, AWX(0)[0] + 40, AWX(0)[1] + 40)), (660, (2.0, AWX(0)[0] + 40, AWX(0)[1] + 40)), (690, (1.0, 540, 675))]
def cam(f): return kf(f, CAM)
def to_screen(c, x, y): s, cx, cy = c; return ((x - cx) * s + W / 2, (y - cy) * s + H / 2)

# ---------------------------------------------------------------------------------------------------------
# drawing helpers
# ---------------------------------------------------------------------------------------------------------
def make_bg():
    rng = np.random.default_rng(3)
    a = np.ones((H, W, 3), np.float32) * np.array(BG, np.float32)
    yy, xx = np.mgrid[0:H, 0:W]; v = ((xx - W / 2) / W) ** 2 + ((yy - H / 2) / H) ** 2
    a *= (1 - 0.10 * v)[..., None]; a += rng.normal(0, 2.0, (H, W, 1))
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8)).convert('RGBA')
BGI = make_bg()

def paste_tile(img, k, sx, sy, w, r, alpha, lift):
    if alpha <= 0.01 or w < 3 or sx < -w or sx > W + w or sy < -w * 1.5 or sy > H + w * 1.5: return
    pg = page(k, w); pw, ph = pg.size
    pad = max(4, int(w * 0.08 + lift * 0.4))
    off = max(1, int(w * 0.012 + lift * 0.25))
    lay = Image.new('RGBA', (pw + 2 * pad, ph + 2 * pad + off), (0, 0, 0, 0))
    sh = Image.new('L', lay.size, 0)
    ImageDraw.Draw(sh).rectangle((pad, pad + off, pad + pw, pad + ph + off), fill=int((60 - min(30, lift * 0.5)) * alpha))
    if w > 40: sh = sh.filter(ImageFilter.GaussianBlur(max(1.0, pad * 0.45)))
    lay.paste((52, 40, 30, 255), (0, 0), sh)
    lay.paste(pg, (pad, pad))
    if w > 30: ImageDraw.Draw(lay).rectangle((pad, pad, pad + pw - 1, pad + ph - 1), outline=(206, 200, 188, 255), width=1)
    if alpha < 0.999: lay.putalpha(lay.getchannel('A').point(lambda v: int(v * alpha)))
    if abs(r) > 0.003: lay = lay.rotate(math.degrees(-r), resample=Image.BICUBIC, expand=True)
    img.alpha_composite(lay, (int(sx - lay.width / 2), int(sy - lay.height / 2)))

def text(img, s, x, y, font, fill=INK, alpha=1.0, stroke=0, anchor='mm', rise=0.0):
    if alpha <= 0.01: return
    d = ImageDraw.Draw(img)
    bb = d.textbbox((x, y), s, font=font, anchor=anchor, stroke_width=stroke); bb = (math.floor(bb[0]), math.floor(bb[1]), math.ceil(bb[2]), math.ceil(bb[3]))
    pad = 4 + stroke
    lay = Image.new('RGBA', (bb[2] - bb[0] + 2 * pad, bb[3] - bb[1] + 2 * pad), (0, 0, 0, 0))
    ImageDraw.Draw(lay).text((x - bb[0] + pad, y - bb[1] + pad), s, font=font, fill=fill + (255,), anchor=anchor,
                             stroke_width=stroke, stroke_fill=(BG[0], BG[1], BG[2], 255))
    if alpha < 0.999: lay.putalpha(lay.getchannel('A').point(lambda v: int(v * alpha)))
    img.alpha_composite(lay, (int(bb[0] - pad), int(bb[1] - pad + rise * (1 - alpha))))

def title(img, s, f, a, b, y=150, size=86):
    """the beat's headline: rises in, sits, fades"""
    k = win(f, a, b, 12); text(img, s, W / 2, y, SERIF(size), alpha=k, rise=26)

def ring(img, c, cx, cy, r, col, k, wgt=22):
    if k <= 0.01: return
    (sx, sy) = to_screen(c, cx, cy); R = r * c[0]; ww = max(2, int(wgt * c[0]))
    lay = Image.new('RGBA', img.size, (0, 0, 0, 0)); d = ImageDraw.Draw(lay)
    end = -90 + 360 * eout(k)
    d.arc((sx - R + 3, sy - R + 7, sx + R + 3, sy + R + 7), -90, end, fill=(40, 30, 20, 34), width=ww + 4)
    d.arc((sx - R, sy - R, sx + R, sy + R), -90, end, fill=col + (255,), width=ww)
    d.arc((sx - R + ww * 0.3, sy - R + ww * 0.3, sx + R - ww * 0.3, sy + R - ww * 0.3), -90, end, fill=tuple(min(255, v + 80) for v in col) + (150,), width=max(1, ww // 5))
    img.alpha_composite(lay)

def seal(img, x, y, label, sub, k, scale=1.0):
    if k <= 0.01: return
    s = ob(k, 2.0) * scale; R = 66 * s
    lay = Image.new('RGBA', (int(R * 2 + 24), int(R * 2 + 24)), (0, 0, 0, 0)); d = ImageDraw.Draw(lay); c = R + 12
    pts = [(c + (R if i % 2 == 0 else R * 0.91) * math.cos(i / 56 * TAU), c + (R if i % 2 == 0 else R * 0.91) * math.sin(i / 56 * TAU)) for i in range(56)]
    d.polygon([(px + 3, py + 5) for px, py in pts], fill=(60, 40, 10, 70))
    d.polygon(pts, fill=GOLD + (255,))
    d.ellipse((c - R * 0.8, c - R * 0.8, c + R * 0.8, c + R * 0.8), fill=(214, 166, 60, 255), outline=(255, 238, 196, 255), width=max(1, int(2.5 * s)))
    d.text((c, c - 9 * s), label, font=SANS(13.5 * s, 800), fill=(255, 255, 255, 255), anchor='mm')
    d.text((c, c + 13 * s), sub, font=SANS(12 * s, 600), fill=(255, 244, 214, 255), anchor='mm')
    lay = lay.rotate(-10, resample=Image.BICUBIC)
    img.alpha_composite(lay, (int(x - lay.width / 2), int(y - lay.height / 2)))

def count_up(n, k): return int(round(n * eout(k)))

TEAM = os.path.join(ROOT, 'events', 'static', 'firespot_welcome_0920', '1.jpg')
LOGO = Image.open(os.path.join(ROOT, 'home', 'static', 'PicassoLab-Logo.png')).convert('RGBA')
SPONS = [os.path.join(ROOT, 'sponsors', 'static', 'wall', n + '.webp') for n in ('nsf', 'doe', 'pnnl', 'nvidia', 'meta', 'amazon', 'samsung', 'cisco', 'vmware')]
_IM = {}
def team():
    if 'team' not in _IM:
        im = ImageOps.exif_transpose(Image.open(TEAM)).convert('RGB'); im.thumbnail((2000, 2000))
        cw = int(im.width * 0.87); y0 = int(im.height * 0.08); ch = min(int(cw * 3 / 4), im.height - y0); cw = int(ch * 4 / 3); x0 = im.width - cw
        _IM['team'] = im.crop((x0, y0, x0 + cw, y0 + ch))
    return _IM['team']

# ---------------------------------------------------------------------------------------------------------
# frame
# ---------------------------------------------------------------------------------------------------------
def frame(f):
    img = BGI.copy(); c = cam(f)
    # ---- world-space under-layers ----
    if f >= SEQ[1][1] - 10 and f < SEQ[2][1]:      # PICASSO printed under its mosaic
        k = sm((f - SEQ[1][1] + 6) / 16) * (1 - sm((f - SEQ[2][1] + 14) / 10))
        if k > 0.01:
            s, cx, cy = c; m = MASK.point(lambda v: int(v * k))
            if abs(s - 1) > 0.002: m = m.resize((int(W * s), int(520 * s)), Image.BILINEAR)
            x0, y0 = to_screen(c, 0, WORD_Y0)
            img.paste((34, 32, 44, 255), (int(x0), int(y0)), m)
    if f >= SEQ[2][1] - 4 and f < SEQ[3][1] + 4:   # year axis
        k = win(f, SEQ[2][1] - 4, SEQ[3][1] + 4, 12); d = ImageDraw.Draw(img)
        d.line((50, Y_BASE + 4, 1030, Y_BASE + 4), fill=INK + (int(200 * k),), width=2)
    if f >= SEQ[3][1] - 4 and f < SEQ[4][1] + 4:
        k = win(f, SEQ[3][1] - 4, SEQ[4][1] + 4, 12); ImageDraw.Draw(img).line((50, BAR_BASE + 4, 1030, BAR_BASE + 4), fill=INK + (int(200 * k),), width=2)
    for i, ((cx, cy), col, name, sub) in enumerate(RINGS):
        k = sm((f - SEQ[4][1] + 6 - i * 5) / 22) * (1 - sm((f - SEQ[5][1] + 12) / 10))
        ring(img, c, cx, cy, RING_R, col, k)
    # ---- the papers ----
    tiles = []
    for k in ORDER:
        st = tile_state(k, f)
        if st: tiles.append(((k in AWARD and f >= SEQ[5][1] - LEAD) * 2 + (st[5] > 2), k, st))
    focus_ring = None
    for r, (a, b) in enumerate([(452, 506), (512, 562), (568, 606)]):
        if a <= f < b: focus_ring = (r, win(f, a, b, 8))
    for _, k, st in sorted(tiles, key=lambda q: q[0]):
        x, y, w, rot, al, lift = st
        if focus_ring and k in REPS[focus_ring[0]]:   # the named papers step out of the ring
            j = REPS[focus_ring[0]].index(k); kk = focus_ring[1]
            w = lerp(w, 64, kk); lift += 30 * kk
        sx, sy = to_screen(c, x, y)
        paste_tile(img, k, sx, sy, w * c[0], rot, al, lift)
    # ---- overlays ----
    # 1 the downpour: counter + year
    if f < SEQ[1][1]:
        k = win(f, 6, SEQ[1][1] + 4, 8)
        n = sum(1 for q in range(N) if drop_frame(q) + 7 <= f)
        last = max((q for q in range(N) if drop_frame(q) + 7 <= f), key=lambda q: drop_frame(q), default=None)
        text(img, f'{n}', W / 2, 168, NUM(176, 800), alpha=k, stroke=12)
        text(img, 'publications', W / 2, 280, ITAL(60), MUTE, alpha=k, stroke=8)
        if last is not None:
            text(img, str(PUBS[last]['yr'] or 'preprints'), W / 2, 1180, NUM(64, 700), INK, alpha=k, stroke=8)
            text(img, PUBS[last]['tag'], W / 2, 1250, SANS(30, 600), MUTE, alpha=k, stroke=6)
    # 2 PICASSO
    a, b = SEQ[1][1] + 6, SEQ[2][1] - 8
    title(img, 'Picasso Lab', f, a, b, 190, 124)
    text(img, 'UC San Diego  ·  Prof. Yufei Ding', W / 2, 292, SANS(34, 500), MUTE, alpha=win(f, a + 6, b, 12), rise=16)
    for i, s in enumerate(['machine learning systems', 'computer architecture', 'quantum computing']):
        text(img, s, W / 2, 965 + i * 52, SANS(32, 600) if i == 0 else SANS(32, 600), INK, alpha=win(f, a + 18 + i * 6, b, 10), rise=18)
    # 3 by year
    a, b = SEQ[2][1] + 10, SEQ[3][1] - 8
    title(img, 'A decade of papers', f, a, b)
    text(img, '2013 – 2026, by year', W / 2, 236, ITAL(40), MUTE, alpha=win(f, a + 6, b, 12), rise=14)
    for y in YEARS:
        k = win(f, a + (y - 2013), b, 8)
        text(img, f"'{y % 100:02d}", YX(y), Y_BASE + 34, SANS(24, 700), INK, alpha=k)
        if YCOUNT[y]:
            top = Y_BASE - 34 - (YCOUNT[y] - 1) * Y_STEP - 62
            text(img, str(count_up(YCOUNT[y], (f - a - 4) / 24)), YX(y), top, NUM(34, 800), INK, alpha=k)
    # 4 by venue
    a, b = SEQ[3][1] + 10, SEQ[4][1] - 8
    title(img, 'Where they appeared', f, a, b)
    text(img, 'the top venues of computer systems and architecture', W / 2, 236, ITAL(38), MUTE, alpha=win(f, a + 6, b, 12), rise=14)
    for ci, v in enumerate(TOPV):
        k = win(f, a + ci * 2, b, 8)
        text(img, v, VX(ci), BAR_BASE + 34, SANS(25 if len(v) < 7 else 17, 700), alpha=k)
        top = BAR_BASE - 45 - (VCOUNT[v] - 1) * BAR_STEP - 70
        text(img, str(count_up(VCOUNT[v], (f - a - ci) / 20)), VX(ci), top - 12, NUM(46, 800), alpha=k)
    # 5 rings
    a, b = SEQ[4][1] + 16, SEQ[5][1] - 8
    k_all = win(f, a, 452, 12) + win(f, 606, b, 8)
    text(img, 'Three directions', W / 2, 150, SERIF(86), alpha=k_all, rise=26)
    for i, ((cx, cy), col, name, sub) in enumerate(RINGS):
        ly = cy + RING_R + 52 if i != 1 else cy - RING_R - 76
        sx, sy = to_screen(c, cx, ly)
        k = win(f, a + i * 6, b, 10) * (1 - (focus_ring[1] if focus_ring else 0))
        text(img, name, sx, sy, SANS(30 * c[0] ** 0.5, 700), col, alpha=k)
        text(img, f'{len(RMEM[i])} papers', sx, sy + 38 * c[0] ** 0.5, SANS(23 * c[0] ** 0.5, 500), MUTE, alpha=k)
    if focus_ring:
        r, kk = focus_ring; col = RINGS[r][1]; f0 = [452, 512, 568][r]
        d = ImageDraw.Draw(img)
        # numbered badges on the three papers
        for j, q in enumerate(REPS[r]):
            x, y, w, rot, al, lift = tile_state(q, f)
            sx, sy = to_screen(c, x, y); kj = kk * ob((f - f0 - 6 - j * 6) / 8)
            if kj > 0.01:
                R_ = 17 * kj; bx, by = sx + 40 * c[0] * 0.55, sy - 52 * c[0] * 0.55
                d.ellipse((bx - R_, by - R_, bx + R_, by + R_), fill=col + (255,), outline=(255, 255, 255, 255), width=3)
                text(img, str(j + 1), bx, by, SANS(20 * kj + 1, 800), (255, 255, 255))
        # the card
        cy0 = 1010; ck = kk
        if ck > 0.01:
            card = Image.new('RGBA', (960, 300), (0, 0, 0, 0)); cd = ImageDraw.Draw(card)
            cd.rounded_rectangle((0, 0, 959, 299), 22, fill=(255, 253, 248, 255), outline=col + (255,), width=3)
            card.putalpha(card.getchannel('A').point(lambda v: int(v * ck)))
            img.alpha_composite(card, (60, int(cy0 + 20 * (1 - ck))))
            text(img, RINGS[r][2], 100, cy0 + 40, SANS(28, 700), col, alpha=ck, anchor='lm')
            text(img, RINGS[r][3], 920, cy0 + 42, SANS(21, 500), MUTE, alpha=ck, anchor='rm')
            for j, q in enumerate(REPS[r]):
                kj = ck * sm((f - f0 - 8 - j * 6) / 8); ty = cy0 + 100 + j * 70
                d.ellipse((100, ty - 16, 132, ty + 16), fill=col + (int(255 * kj),))
                text(img, str(j + 1), 116, ty, SANS(18, 800), (255, 255, 255), alpha=kj)
                text(img, PUBS[q]['short'], 150, ty - 12, SERIF(38), INK, alpha=kj, anchor='lm')
                tag = PUBS[q]['tag'] + ('  ·  ' + AWARD[q].replace('Award: ', '').replace(' Award', '') if q in AWARD else '')
                text(img, tag, 152, ty + 20, SANS(20, 600), MUTE, alpha=kj, anchor='lm')
    # 6 awards
    a, b = SEQ[5][1] + 8, SEQ[6][1]
    k = win(f, 676, b, 10); text(img, 'Recognized', W / 2, 150, SERIF(86), alpha=k, rise=26)
    for i, q in enumerate(AW_LIST):
        x, y, w, *_ = lay_award(q); t = AWARD[q]
        kk = sm((f - (628 if i == 0 else 690 + i * 6)) / 9) * (1 - sm((f - b + 10) / 10))
        lab = 'BEST PAPER' if t.startswith('Award: Best') else ('NOMINEE' if 'Nominee' in t else ('ARTIFACT' if 'Artifact' in t else 'DIST. PAPER'))
        sx, sy = to_screen(c, x + w * 0.34, y - w * 0.5)
        seal(img, sx, sy, lab, PUBS[q]['tag'], kk, c[0])
        cx_, cy_ = to_screen(c, x, y + w * 0.69 + 18)
        text(img, t.replace('Award: ', '').replace(' Award', ''), cx_, cy_, SANS(21 * c[0] ** 0.6, 700), INK, alpha=kk)
        sz = 26 * c[0] ** 0.6; d0 = ImageDraw.Draw(img)
        while sz > 12 and d0.textlength(PUBS[q]['short'], font=ITAL(sz)) > 300 * c[0]: sz -= 1
        text(img, PUBS[q]['short'], cx_, cy_ + 30 * c[0] ** 0.6, ITAL(sz), MUTE, alpha=kk)
    if 626 <= f < 676:   # the close-up: the best paper's title, big
        k = win(f, 628, 676, 8); q = AW_LIST[0]
        text(img, 'Best Paper Award', W / 2, 120, SERIF(76), INK, alpha=k, stroke=10, rise=20)
        text(img, 'ISCA 2026  ·  ' + PUBS[q]['short'], W / 2, 196, SANS(30, 700), GOLD, alpha=k, stroke=8, rise=14)
    # 7 sponsors
    k0 = win(f, SPON0, PEOPLE0 + 4, 12)
    if k0 > 0.01:
        text(img, 'Supported by', W / 2, 220, SERIF(86), alpha=k0, rise=26)
        for i, pth in enumerate(SPONS):
            if pth not in _IM:
                im = Image.open(pth).convert('RGBA'); im.thumbnail((240, 120), Image.LANCZOS); _IM[pth] = im
            lg = _IM[pth]; col_, row = i % 3, i // 3
            kk = sm((f - SPON0 - 8 - i * 3) / 10) * (1 - sm((f - PEOPLE0 + 6) / 10))
            if kk <= 0.01: continue
            cx_, cy_ = 220 + col_ * 320, 470 + row * 240
            card = Image.new('RGBA', (280, 180), (255, 255, 255, 0)); dd = ImageDraw.Draw(card)
            dd.rounded_rectangle((0, 0, 279, 179), 18, fill=(255, 255, 255, 255), outline=(222, 214, 200, 255), width=2)
            card.alpha_composite(lg, ((280 - lg.width) // 2, (180 - lg.height) // 2))
            s = 0.9 + 0.1 * eout(kk); card = card.resize((int(280 * s), int(180 * s)), Image.LANCZOS)
            card.putalpha(card.getchannel('A').point(lambda v: int(v * kk)))
            img.alpha_composite(card, (int(cx_ - card.width / 2), int(cy_ - card.height / 2 + 20 * (1 - kk))))
        text(img, 'NSF  ·  DOE  ·  PNNL  ·  and our industry partners', W / 2, 1210, SANS(28, 600), MUTE, alpha=win(f, SPON0 + 30, PEOPLE0 + 4, 12))
    # 8 people
    k = win(f, PEOPLE0, END0 + 4, 14)
    if k > 0.01:
        z = 1 + 0.05 * (f - PEOPLE0) / (END0 - PEOPLE0)
        pw = int(960 * z); ph = int(pw * 3 / 4); im = team().resize((pw, ph), Image.LANCZOS)
        cw, ch = 960, 720; crop = im.crop(((pw - cw) // 2, (ph - ch) // 2, (pw - cw) // 2 + cw, (ph - ch) // 2 + ch)).convert('RGBA')
        lay = Image.new('RGBA', (cw + 30, ch + 30), (0, 0, 0, 0)); sh = Image.new('L', lay.size, 0)
        ImageDraw.Draw(sh).rectangle((15, 21, 15 + cw, 21 + ch), fill=70); sh = sh.filter(ImageFilter.GaussianBlur(9))
        lay.paste((40, 30, 20, 255), (0, 0), sh); lay.alpha_composite(crop, (15, 15))
        lay.putalpha(lay.getchannel('A').point(lambda v: int(v * k)))
        img.alpha_composite(lay, (int(W / 2 - lay.width / 2), int(560 - lay.height / 2 + 24 * (1 - k))))
        text(img, 'The people', W / 2, 130, SERIF(86), alpha=k, rise=26)
        text(img, 'PhD students, postdocs and visiting interns', W / 2, 990, SANS(32, 700), alpha=win(f, PEOPLE0 + 10, END0 + 4, 12), rise=16)
        text(img, 'Alumna Dr. Hezi Zhang is now an Assistant Professor at UW–Madison', W / 2, 1044, SANS(25, 500), MUTE, alpha=win(f, PEOPLE0 + 20, END0 + 4, 12), rise=14)
        text(img, '(and yes, a lot of hot pot)', W / 2, 1110, ITAL(40), MUTE, alpha=win(f, PEOPLE0 + 40, END0 + 4, 12), rise=14)
    # 9 end
    if f >= END0:
        k = sm((f - END0) / 14)
        lw = 600; lg = LOGO.resize((lw, int(lw * LOGO.height / LOGO.width)), Image.LANCZOS)
        lg.putalpha(lg.getchannel('A').point(lambda v: int(v * k)))
        img.alpha_composite(lg, (int(W / 2 - lw / 2), int(170 + 24 * (1 - k))))
        text(img, 'Picasso Lab  ·  UC San Diego', W / 2, 650, SERIF(70), alpha=sm((f - END0 - 6) / 12), rise=18)
        text(img, 'Prof. Yufei Ding', W / 2, 722, SANS(32, 500), MUTE, alpha=sm((f - END0 - 10) / 12), rise=14)
        k2 = sm((f - END0 - 22) / 12)
        text(img, 'We are recruiting PhD students.', W / 2, 860, ITAL(62), RED, alpha=k2, rise=18)
        if k2 > 0.01:
            d = ImageDraw.Draw(img); u = eout((f - END0 - 28) / 14); x0 = W / 2 - 330
            d.line((x0, 905, x0 + 660 * u, 905), fill=RED + (int(200 * k2),), width=3)
        k3 = sm((f - END0 - 36) / 12)
        text(img, '@PicassoLabUCSD', W / 2, 1020, NUM(68, 800), alpha=k3, rise=16)
        text(img, 'yufeiding.ucsd.edu', W / 2, 1094, SANS(32, 500), MUTE, alpha=k3, rise=12)
    return img.convert('RGB')

def export(dst):
    """page textures + data for the 3D keynote film (video-kit/films/xkeynote)"""
    os.makedirs(os.path.join(dst, 'pages'), exist_ok=True)
    for k in range(N):
        f = os.path.join(A.pages, f'{k:03d}.jpg')
        src = Image.open(f).convert('RGB') if os.path.exists(f) else typeset_page(PUBS[k])
        src.resize((1024, int(1024 * src.height / src.width)), Image.LANCZOS).save(os.path.join(dst, 'pages', f'{k:03d}.jpg'), quality=88)
    team().resize((1200, 900), Image.LANCZOS).save(os.path.join(dst, 'team.jpg'), quality=88)
    LOGO.save(os.path.join(dst, 'logo.png'))
    data = {'order': ORDER, 'pubs': [{'k': p['k'], 'tag': p['tag'], 'venue': p['venue'], 'yr': p['yr'], 'short': p['short'], 'ring': p['ring'],
                                      'award': AWARD.get(p['k'], '').replace('Award: ', '')} for p in PUBS],
            'topv': TOPV, 'vcount': VCOUNT, 'years': YEARS, 'ycount': YCOUNT, 'reps': REPS, 'awards': AW_LIST,
            'rings': [{'name': r[2], 'sub': r[3], 'n': len(RMEM[i])} for i, r in enumerate(RINGS)]}
    json.dump(data, open(os.path.join(dst, 'data.json'), 'w'), indent=0)
    print('exported', N)

def main():
    if A.export: return export(A.export)
    os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
    if A.only:
        for f in map(int, A.only.split(',')): frame(f).save(os.path.join(HERE, 'out', f'pw_{f:04d}.jpg'), quality=86)
        return
    out = os.path.join(HERE, 'out', 'picasso_paperwall.mp4')
    ff = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                           '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo', '-shortest', '-c:v', 'libx264', '-crf', '18', '-preset', 'slow',
                           '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-c:a', 'aac', '-b:a', '64k', '-movflags', '+faststart', out], stdin=subprocess.PIPE)
    for f in range(END): ff.stdin.write(frame(f).tobytes())
    ff.stdin.close(); ff.wait(); print(out, END, 'frames', os.path.getsize(out) // 1024, 'KB')

if __name__ == '__main__':
    main()
