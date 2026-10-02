#!/usr/bin/env python3
"""Picasso Lab's first X post: "the paper wall" - a ~25 s 4:5 film made of the lab's real publications.
The first pages of all 136 publications (rendered from arXiv PDFs where they exist, typeset from the title, authors
and venue where they don't) fall in year by year, spell PICASSO, re-stack into a bar chart by venue, sort into the
three rings of the lab's logo (Physics x Computer Science x Math), make way for the award papers, then the team.

    python3 social/x/paperwall.py --fonts DIR --pages DIR   ->  social/x/out/picasso_paperwall.mp4
--pages holds NNN.jpg first pages (index = order in the site's publication list, seo/sites-text.html).
Fonts (ttf, from video-kit/pipeline/fonts woff2): InstrumentSerif(-Italic).ttf, Fraunces.ttf, Inter.ttf."""
import argparse, html, json, math, os, re, subprocess
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps

HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
ap = argparse.ArgumentParser(); ap.add_argument('--fonts', required=True); ap.add_argument('--pages', required=True)
ap.add_argument('--only'); A = ap.parse_args()
W, H, FPS = 1080, 1350, 24
BG, INK, MUTE = (246, 242, 233), (22, 21, 28), (118, 112, 104)
BLUE, GREEN, RED, GOLD = (31, 111, 186), (84, 163, 58), (200, 40, 40), (201, 151, 46)
TAU = 2 * math.pi
def F(name, size, wght=None):
    f = ImageFont.truetype(os.path.join(A.fonts, name), size)
    if wght is not None:
        try: f.set_variation_by_axes([wght])
        except Exception: pass
    return f
SERIF = lambda s: F('InstrumentSerif.ttf', s); ITAL = lambda s: F('InstrumentSerif-Italic.ttf', s)
NUM = lambda s, w=800: F('Fraunces.ttf', s, w)
SANS = lambda s, w=600: F('NotoSansSC-Bold.ttf' if w >= 650 else 'NotoSansSC-Medium.ttf', s)
clamp = lambda x, a=0.0, b=1.0: max(a, min(b, x))
def sm(x): x = clamp(x); return x * x * (3 - 2 * x)
def eio(x): x = clamp(x); return 4 * x ** 3 if x < 0.5 else 1 - (-2 * x + 2) ** 3 / 2
def ob(x, s=1.4): x = clamp(x) - 1; return 1 + x * x * ((s + 1) * x + s)
def hsh(*n):
    x = math.sin(sum(v * (12.9898 + i * 78.233) for i, v in enumerate(n)) + 0.5) * 43758.5453
    return x - math.floor(x)
lerp = lambda a, b, t: a + (b - a) * t

# ---------------------------------------------------------------------------------------------------------
# the publications (from the site's text version) and their first pages
# ---------------------------------------------------------------------------------------------------------
def load_pubs():
    s = open(os.path.join(ROOT, 'seo', 'sites-text.html'), encoding='utf-8').read()
    i = s.find('id="publications"'); j = s.find('</section>', i)
    out = []
    for p in re.findall(r'(?s)<p>(.*?)</p>', s[i:j]):
        txt = html.unescape(re.sub(r'<[^>]+>', '', p.replace('<br>', '\n'))).split('\n')
        m = re.match(r'(.*) \((\[.*)\)$', txt[0].strip())
        if not m: continue
        tags = re.findall(r'\[([^\]]+)\]', m.group(2))
        y = re.search(r"'(\d\d)", tags[0])
        out.append({'title': m.group(1), 'tags': tags, 'venue': tags[0].split("'")[0].strip(), 'tag': tags[0],
                    'year': 2000 + int(y.group(1)) if y else 2026, 'authors': txt[1] if len(txt) > 1 else ''})
    return out
PUBS = load_pubs()
N = len(PUBS)
for k, p in enumerate(PUBS): p['k'] = k
QUANT = re.compile(r'quantum|qubit|\bQEC\b|photonic|ion trap|clifford|pauli|surface code|variational|NISQ|fault-tolerant|hamiltonian|neutral-atom|superconducting|entangl', re.I)
MATHY = re.compile(r'compil|language|program|verif|assert|synthes|polyhedral|type |algorithm|optimiz.*code|loop|graph|sparse|search', re.I)
for p in PUBS:
    t = p['title']
    p['ring'] = 0 if QUANT.search(t) else (2 if MATHY.search(t) else 1)    # 0 physics, 1 CS, 2 math
AWARD = {k: t for k, p in enumerate(PUBS) for t in p['tags'][1:] if re.search(r'award|nominee', t, re.I)}

def typeset_page(p):
    """a first page in the usual two-column proceedings layout, for papers with no PDF online"""
    w, h = 612, 792; im = Image.new('RGB', (w, h), (255, 255, 255)); d = ImageDraw.Draw(im)
    f = F('InstrumentSerif.ttf', 30); words = p['title'].split(); lines, cur = [], ''
    for wd in words:
        if d.textlength(cur + ' ' + wd, font=f) > 500 and cur: lines.append(cur); cur = wd
        else: cur = (cur + ' ' + wd).strip()
    lines.append(cur); y = 70
    for ln in lines[:4]: d.text(((w - d.textlength(ln, font=f)) / 2, y), ln, font=f, fill=(0, 0, 0)); y += 36
    fa = SANS(12, 500); au = p['authors'][:95] + ('...' if len(p['authors']) > 95 else '')
    d.text(((w - d.textlength(au, font=fa)) / 2, y + 14), au, font=fa, fill=(40, 40, 40))
    y += 60; rng = np.random.default_rng(p['k'])
    for col in (0, 1):
        x0 = 56 + col * 262; yy = y + 10
        d.text((x0, yy), 'Abstract' if col == 0 else '1  Introduction', font=SANS(11, 700), fill=(0, 0, 0)); yy += 20
        while yy < h - 60:
            L = 236 if rng.random() > 0.12 else rng.integers(60, 200)
            d.rectangle((x0, yy, x0 + L, yy + 3), fill=(150, 150, 150)); yy += 10
            if rng.random() < 0.06: yy += 12
    d.text((56, h - 36), p['tag'], font=SANS(10, 500), fill=(90, 90, 90))
    return im

PAGE = {}
def page(k, w):
    """the first page of paper k at width w (cached at 360 px, downscaled per frame)"""
    if k not in PAGE:
        f = os.path.join(A.pages, f'{k:03d}.jpg')
        im = Image.open(f).convert('RGB') if os.path.exists(f) else typeset_page(PUBS[k])
        im = im.resize((360, int(360 * im.height / im.width)), Image.LANCZOS)
        PAGE[k] = {'img': im, 'big': None, 'real': os.path.exists(f)}
    c = PAGE[k]
    if w > 360:
        if c['big'] is None:
            f = os.path.join(A.pages, f'{k:03d}.jpg')
            src = Image.open(f).convert('RGB') if os.path.exists(f) else typeset_page(PUBS[k])
            c['big'] = src.resize((720, int(720 * src.height / src.width)), Image.LANCZOS)
        src = c['big']
    else: src = c['img']
    w = max(4, int(w)); return src.resize((w, max(4, int(w * src.height / src.width))), Image.BILINEAR)

# ---------------------------------------------------------------------------------------------------------
# layouts: per paper (x, y centre, width, rotation, alpha)
# ---------------------------------------------------------------------------------------------------------
ORDER = sorted(range(N), key=lambda k: (PUBS[k]['year'], -k))          # oldest first (the site lists newest first)
RANK = {k: i for i, k in enumerate(ORDER)}

def lay_pile(k):
    i = RANK[k]
    return (540 + (hsh(k, 1) - 0.5) * 380, 760 + (hsh(k, 2) - 0.5) * 260, 250, (hsh(k, 3) - 0.5) * 0.7, 1.0)

def word_cells():
    f = NUM(300, 900); m = Image.new('L', (W, 520)); d = ImageDraw.Draw(m)
    tw = d.textlength('PICASSO', font=f); scale = 1050 / tw
    f = NUM(int(300 * scale), 900); bb = d.textbbox((0, 0), 'PICASSO', font=f)
    d.text(((W - (bb[2] - bb[0])) / 2 - bb[0], (520 - (bb[3] - bb[1])) / 2 - bb[1]), 'PICASSO', font=f, fill=255)
    a = np.asarray(m) > 128
    for c in np.arange(40, 8, -0.5):
        ch = c * 1.294; cells = []
        for y in np.arange(ch / 2, 520, ch):
            for x in np.arange(c / 2, W, c):
                yi, xi = int(y), int(x)
                if a[yi, xi]: cells.append((x, y))
        if len(cells) >= N: return c, cells
    return c, cells
CELL, CELLS = word_cells()
CELLS = sorted(CELLS, key=lambda q: (q[0], q[1]))
CELLS = [CELLS[i * len(CELLS) // N] for i in range(N)]   # spread over all seven letters
WORD_Y0 = 330
def lay_word(k):
    x, y = CELLS[RANK[k]]
    return (x, WORD_Y0 + y, CELL * 0.82, (hsh(k, 21) - 0.5) * 0.12, 1.0)

TOPV = [v for v, _ in sorted(((v, sum(1 for p in PUBS if p['venue'] == v)) for v in set(p['venue'] for p in PUBS)
                                 if v not in ('arXiv', 'preprint', 'US Patent')), key=lambda q: -q[1])[:8]]
VCOUNT = {v: sum(1 for p in PUBS if p['venue'] == v) for v in TOPV}
BAR_BASE, BAR_STEP, BAR_W = 1080, 44, 70
def lay_bar(k):
    v = PUBS[k]['venue']
    if v in TOPV:
        c = TOPV.index(v); same = [q for q in ORDER if PUBS[q]['venue'] == v]; j = same.index(k)
        return (110 + c * 123, BAR_BASE - 45 - j * BAR_STEP, BAR_W, (hsh(k, 7) - 0.5) * 0.06, 1.0)
    # every other venue: a loose stack at the side, small and faded
    others = [q for q in ORDER if PUBS[q]['venue'] not in TOPV]; j = others.index(k)
    return (90 + (j % 12) * 82, 1235 + (j // 12) * 6, 40, (hsh(k, 8) - 0.5) * 0.3, 0.0)

RINGS = [((300, 800), BLUE, 'Physics', 'quantum computing'), ((540, 545), GREEN, 'Computer Science', 'systems & architecture for AI'),
         ((780, 800), RED, 'Math', 'compilers & algorithms')]
RING_R = 205
def lay_ring(k):
    r = PUBS[k]['ring']; mem = [q for q in ORDER if PUBS[q]['ring'] == r]; j = mem.index(k); n = len(mem)
    (cx, cy), *_ = RINGS[r]
    rr = (RING_R - 34) * math.sqrt((j + 0.5) / n); a = j * 2.39996 + r
    w = 30 if n > 60 else 38
    return (cx + rr * math.cos(a), cy + rr * math.sin(a), w, (hsh(k, 9) - 0.5) * 0.25, 1.0)

AW_LIST = sorted(AWARD, key=lambda k: (-PUBS[k]['year'], k))
def lay_award(k):
    if k in AWARD:
        i = AW_LIST.index(k); col, row = i % 3, i // 3
        return (205 + col * 335, 520 + row * 470, 290, (hsh(k, 11) - 0.5) * 0.05, 1.0)
    return (540 + (hsh(k, 12) - 0.5) * 1400, -300 - hsh(k, 13) * 400, 120, (hsh(k, 14) - 0.5) * 1.2, 1.0)
def lay_gone(k):
    x, y, w, r, a = lay_award(k)
    return (x, -500 - hsh(k, 15) * 300, w * 0.6, r + 0.6, 1.0)

# ---------------------------------------------------------------------------------------------------------
# timeline
# ---------------------------------------------------------------------------------------------------------
FALL0, FALL1 = 4, 66                       # the rain of papers
T = [('pile', 0), ('word', 92), ('bar', 172), ('ring', 268), ('award', 362), ('gone', 462)]
LAYS = {'pile': lay_pile, 'word': lay_word, 'bar': lay_bar, 'ring': lay_ring, 'award': lay_award, 'gone': lay_gone}
FLY = 24
END = 612
def drop_frame(k): return FALL0 + RANK[k] * (FALL1 - FALL0) / N

def tile_state(k, f):
    if f < drop_frame(k): return None
    if f < T[1][1] - 20:
        x, y, w, r, a = lay_pile(k); t = clamp((f - drop_frame(k)) / 7)
        return (x, lerp(-260, y, 1 - (1 - t) ** 2), w * (1 + 0.25 * (1 - t)), r * t + (1 - t) * 0.2, 1.0, t)
    i = max(j for j in range(1, len(T)) if f >= T[j][1] - 20)
    name, f0 = T[i]; prev = T[i - 1][0]
    d = hsh(k, i, 5) * 14                      # staggered take-off
    t = eio((f - (f0 - 20) - d) / FLY)
    a = LAYS[prev](k); b = LAYS[name](k)
    arc = math.sin(math.pi * t) * (60 + 80 * hsh(k, i))
    st = [lerp(a[j], b[j], t) for j in range(5)]
    return (st[0], st[1] - arc, st[2], st[3] + math.sin(math.pi * t) * (hsh(k, i, 9) - 0.5) * 0.8, st[4], 1.0)

# ---------------------------------------------------------------------------------------------------------
# drawing
# ---------------------------------------------------------------------------------------------------------
def bg():
    rng = np.random.default_rng(3)
    a = np.ones((H, W, 3), np.float32) * np.array(BG, np.float32) + rng.normal(0, 2.2, (H, W, 1))
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))
BGI = bg()
SHADOW = {}
def paste_tile(img, k, x, y, w, r, alpha):
    if alpha <= 0.01 or w < 3: return
    pg = page(k, w)
    pad = max(3, int(w * 0.05))
    lay = Image.new('RGBA', (pg.width + 2 * pad, pg.height + 2 * pad), (0, 0, 0, 0))
    sh = Image.new('L', lay.size, 0); ImageDraw.Draw(sh).rectangle((pad, pad + max(1, pad // 2), pad + pg.width, pad + pg.height + max(1, pad // 2)), fill=int(70 * alpha))
    if w > 60: sh = sh.filter(ImageFilter.GaussianBlur(max(1, pad * 0.6)))
    lay.paste(Image.new('RGBA', lay.size, (40, 30, 20, 255)), (0, 0), sh)
    lay.paste(pg, (pad, pad))
    if w > 40: ImageDraw.Draw(lay).rectangle((pad, pad, pad + pg.width - 1, pad + pg.height - 1), outline=(200, 194, 182, 255), width=1)
    if alpha < 1: lay.putalpha(lay.getchannel('A').point(lambda v: int(v * alpha)))
    if abs(r) > 0.004: lay = lay.rotate(math.degrees(-r), resample=Image.BILINEAR, expand=True)
    img.paste(lay, (int(x - lay.width / 2), int(y - lay.height / 2)), lay)

def text(img, s, x, y, font, fill=INK, anchor='mm', alpha=1.0, stroke=0):
    if alpha <= 0.01: return
    lay = Image.new('RGBA', img.size, (0, 0, 0, 0))
    ImageDraw.Draw(lay).text((x, y), s, font=font, fill=fill + (int(255 * alpha),), anchor=anchor, stroke_width=stroke, stroke_fill=BG + (int(255 * alpha),))
    img.alpha_composite(lay) if img.mode == 'RGBA' else img.paste(lay, (0, 0), lay)

def ring(img, cx, cy, r, col, k):
    if k <= 0.01: return
    lay = Image.new('RGBA', img.size, (0, 0, 0, 0)); d = ImageDraw.Draw(lay)
    end = -90 + 360 * eio(k)
    d.arc((cx - r + 4, cy - r + 8, cx + r + 4, cy + r + 8), -90, end, fill=(0, 0, 0, 40), width=26)
    d.arc((cx - r, cy - r, cx + r, cy + r), -90, end, fill=col + (255,), width=22)
    d.arc((cx - r + 6, cy - r + 6, cx + r - 6, cy + r - 6), -90, end, fill=tuple(min(255, c + 70) for c in col) + (160,), width=4)
    img.paste(lay, (0, 0), lay)

def stamp(img, x, y, label, sub, k):
    if k <= 0.01: return
    s = ob(k, 2.2); R = 74 * s
    lay = Image.new('RGBA', (int(R * 2 + 20), int(R * 2 + 20)), (0, 0, 0, 0)); d = ImageDraw.Draw(lay); c = R + 10
    pts = [(c + (R if i % 2 == 0 else R * 0.9) * math.cos(i / 48 * TAU), c + (R if i % 2 == 0 else R * 0.9) * math.sin(i / 48 * TAU)) for i in range(48)]
    d.polygon(pts, fill=GOLD + (255,)); d.ellipse((c - R * 0.78, c - R * 0.78, c + R * 0.78, c + R * 0.78), outline=(255, 236, 190, 255), width=max(1, int(3 * s)))
    d.text((c, c - 10 * s), label, font=SANS(max(6, int(15 * s)), 800), fill=(255, 255, 255, 255), anchor='mm')
    d.text((c, c + 14 * s), sub, font=SANS(max(6, int(13 * s)), 600), fill=(255, 244, 214, 255), anchor='mm')
    lay = lay.rotate(-12, resample=Image.BICUBIC)
    img.paste(lay, (int(x - lay.width / 2), int(y - lay.height / 2)), lay)

TEAM = os.path.join(ROOT, 'events', 'static', 'firespot_welcome_0920', '1.jpg')
TEAMI = None
LOGO = Image.open(os.path.join(ROOT, 'home', 'static', 'PicassoLab-Logo.png')).convert('RGBA')

GHOST = None
def ghost(img, k):
    """the word PICASSO faintly printed behind its mosaic, so it reads at a glance"""
    global GHOST
    if k <= 0.01: return
    if GHOST is None:
        f = NUM(300, 900); d0 = ImageDraw.Draw(Image.new('L', (1, 1))); f = NUM(int(300 * 1050 / d0.textlength('PICASSO', font=f)), 900)
        GHOST = Image.new('L', (W, 520)); d = ImageDraw.Draw(GHOST); bb = d.textbbox((0, 0), 'PICASSO', font=f)
        d.text(((W - (bb[2] - bb[0])) / 2 - bb[0], (520 - (bb[3] - bb[1])) / 2 - bb[1]), 'PICASSO', font=f, fill=255)
    img.paste(Image.new('RGB', (W, 520), (34, 32, 44)), (0, WORD_Y0), GHOST.point(lambda v: int(v * k)))

def frame(f):
    global TEAMI
    img = BGI.copy()
    # ---- titles per beat ----
    # tiles (awards drawn last so they sit on top)
    tiles = []
    for k in ORDER:
        s = tile_state(k, f)
        if s: tiles.append((1 if k in AWARD else 0, k, s))
    for _, k, s in sorted(tiles, key=lambda q: q[0]): paste_tile(img, k, s[0], s[1], s[2], s[3], s[4])
    if f < T[1][1] - 10:
        n = sum(1 for k in range(N) if drop_frame(k) <= f)
        last = max((k for k in range(N) if drop_frame(k) <= f), key=lambda k: drop_frame(k), default=None)
        text(img, f'{n}', 540, 175, NUM(170, 800), stroke=10)
        text(img, 'publications', 540, 285, ITAL(60), MUTE, stroke=8)
        if last is not None: text(img, PUBS[last]['tag'], 540, 1225, SANS(40, 700), INK, stroke=8)
    ghost(img, sm((f - 84) / 14) * (1 - sm((f - 156) / 8)))
    # ---- beat overlays ----
    a = sm((f - 112) / 10) * (1 - sm((f - 158) / 8))
    text(img, 'Picasso Lab', 540, 205, SERIF(118), alpha=a)
    text(img, 'UC San Diego  ·  Prof. Yufei Ding', 540, 290, SANS(32, 500), MUTE, alpha=a)
    text(img, 'machine learning systems  ·  computer architecture  ·  quantum computing', 540, 960, SANS(25, 500), MUTE, alpha=a)
    a = sm((f - 192) / 10) * (1 - sm((f - 254) / 8))
    text(img, 'Where they appeared', 540, 175, SERIF(84), alpha=a)
    for c, v in enumerate(TOPV):
        text(img, v, 110 + c * 123, BAR_BASE + 8, SANS(26 if len(v) < 7 else 20, 700), alpha=a)
        top = BAR_BASE - 45 - (VCOUNT[v] - 1) * BAR_STEP - 70
        text(img, str(VCOUNT[v]), 110 + c * 123, top - 10, NUM(44, 800), alpha=a * sm((f - 196 - c * 2) / 8))
    a = sm((f - 270) / 12) * (1 - sm((f - 350) / 8))
    text(img, 'Physics  ×  CS  ×  Math', 540, 175, SERIF(84), alpha=a)
    for i, ((cx, cy), col, name, sub) in enumerate(RINGS):
        k = sm((f - 262 - i * 4) / 16) * (1 - sm((f - 350) / 8))
        ring(img, cx, cy, RING_R, col, k)
        n = sum(1 for p in PUBS if p['ring'] == i)
        ly = cy + RING_R + 46 if i != 1 else cy - RING_R - 70
        text(img, name, cx, ly, SANS(30, 700), col, alpha=a)
        text(img, f'{sub}  ·  {n}', cx, ly + 36, SANS(23, 500), MUTE, alpha=a)
    if f >= T[3][1] - 20 and f < T[5][1]:   # rings drawn under the tiles: redraw tiles of this beat on top
        for _, k, s in sorted(tiles, key=lambda q: q[0]): paste_tile(img, k, s[0], s[1], s[2], s[3], s[4])
    a = sm((f - 378) / 10) * (1 - sm((f - 458) / 8))
    text(img, 'Recognized', 540, 175, SERIF(84), alpha=a)
    for i, k in enumerate(AW_LIST):
        x, y, w, r, _ = lay_award(k); kk = sm((f - 384 - i * 5) / 8) * (1 - sm((f - 458) / 6))
        t = AWARD[k]; lab = 'BEST PAPER' if t.startswith('Award: Best') else ('NOMINEE' if 'Nominee' in t else ('ARTIFACT' if 'Artifact' in t else 'DIST. PAPER'))
        sub = PUBS[k]['tag'] if 'Artifact' not in t else PUBS[k]['tag'] + ' artifact'
        stamp(img, x + w * 0.36, y - w * 0.52, lab, PUBS[k]['tag'], kk)
        text(img, t.replace('Award: ', '').replace(' Award', ''), x, y + w * 0.69 + 14, SANS(20, 700), INK, alpha=kk)
        text(img, PUBS[k]['tag'], x, y + w * 0.69 + 42, SANS(19, 500), MUTE, alpha=kk)
    # ---- the team ----
    if f >= 470 and f < END:
        if TEAMI is None:
            im = ImageOps.exif_transpose(Image.open(TEAM)).convert('RGB'); im.thumbnail((1800, 1800))
            cw = int(im.width * 0.87); y0 = int(im.height * 0.08); ch = min(int(cw * 3 / 4), im.height - y0); cw = int(ch * 4 / 3); x0 = im.width - cw
            TEAMI = im.crop((x0, y0, x0 + cw, y0 + ch))
        k = sm((f - 470) / 12) * (1 - sm((f - 538) / 10))
        if k > 0.01:
            z = 1 + 0.04 * (f - 470) / 70
            pw = int(940 * z); ph = int(pw * 3 / 4)
            ph_im = TEAMI.resize((pw, ph), Image.LANCZOS)
            lay = Image.new('RGBA', (pw + 24, ph + 24), (0, 0, 0, 0)); lay.paste(Image.new('RGBA', (pw, ph), (40, 30, 20, 60)), (12, 18)); lay.paste(ph_im, (6, 6))
            lay.putalpha(lay.getchannel('A').point(lambda v: int(v * k)))
            img.paste(lay, (int(540 - lay.width / 2), int(560 - lay.height / 2 + 30 * (1 - k))), lay)
            text(img, 'The people', 540, 130, SERIF(84), alpha=k)
            text(img, 'PhD students, postdocs and visiting interns', 540, 1010, SANS(30, 600), alpha=k)
            text(img, 'Alumna Dr. Hezi Zhang is now an Assistant Professor at UW-Madison', 540, 1062, SANS(24, 500), MUTE, alpha=k)
            text(img, '(and yes, a lot of hot pot)', 540, 1112, ITAL(36), MUTE, alpha=k)
    # ---- end card ----
    if f >= 540:
        k = sm((f - 540) / 12)
        lw = 560; lg = LOGO.resize((lw, int(lw * LOGO.height / LOGO.width)), Image.LANCZOS)
        lg.putalpha(lg.getchannel('A').point(lambda v: int(v * k)))
        img.paste(lg, (int(540 - lw / 2), int(220 + 20 * (1 - k))), lg)
        text(img, 'Picasso Lab  ·  UC San Diego', 540, 690, SERIF(66), alpha=k)
        text(img, 'Prof. Yufei Ding', 540, 760, SANS(30, 500), MUTE, alpha=k)
        k2 = sm((f - 556) / 10)
        text(img, 'We are recruiting PhD students.', 540, 900, ITAL(56), RED, alpha=k2)
        k3 = sm((f - 568) / 10)
        text(img, '@PicassoLabUCSD', 540, 1040, NUM(64, 800), alpha=k3)
        text(img, 'yufeiding.ucsd.edu', 540, 1110, SANS(30, 500), MUTE, alpha=k3)
    return img

def main():
    os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
    if A.only:
        for f in map(int, A.only.split(',')): frame(f).save(os.path.join(HERE, 'out', f'pw_{f:04d}.jpg'), quality=85)
        return
    out = os.path.join(HERE, 'out', 'picasso_paperwall.mp4')
    ff = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-',
                           '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo', '-shortest', '-c:v', 'libx264', '-crf', '18', '-preset', 'slow',
                           '-pix_fmt', 'yuv420p', '-profile:v', 'high', '-c:a', 'aac', '-b:a', '64k', '-movflags', '+faststart', out], stdin=subprocess.PIPE)
    for f in range(END): ff.stdin.write(frame(f).convert('RGB').tobytes())
    ff.stdin.close(); ff.wait(); print(out, END, 'frames', os.path.getsize(out) // 1024, 'KB')

if __name__ == '__main__':
    main()
