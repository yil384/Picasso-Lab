#!/usr/bin/env python3
"""Page textures + data for the v8 film: social/x/paperwall.py --export (real first pages from social/x/pages,
the rest typeset with greeked body text, 1024 px wide), then the heroes again at 1600 px: real pages from a
hi-res render dir (--hero-dir, NNN.jpg at 200 dpi) or typeset at 3x.
usage: python3 export_pages.py --fonts DIR --out SCENE_DIR [--hero-dir DIR]
(fonts: InstrumentSerif.ttf, Fraunces.ttf, NotoSansSC-Bold.ttf, NotoSansSC-Medium.ttf - static Inter 700/500 work)"""
import argparse, os, sys
ap = argparse.ArgumentParser(); ap.add_argument('--fonts', required=True); ap.add_argument('--out', required=True); ap.add_argument('--hero-dir')
a = ap.parse_args()
X = os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../../../social/x')
sys.argv = ['paperwall.py', '--fonts', a.fonts, '--pages', os.path.join(X, 'pages')]
sys.path.insert(0, X)
import paperwall as pw                                    # noqa: E402
from PIL import Image                                     # noqa: E402

pw.export(a.out)
HEROES = sorted({pw.ORDER[0], *pw.AW_LIST, *[k for r in pw.REPS for k in r]})
for k in HEROES:
    src = os.path.join(a.hero_dir, f'{k:03d}.jpg') if a.hero_dir else None
    if src and os.path.exists(src): im = Image.open(src).convert('RGB')
    elif os.path.exists(os.path.join(X, 'pages', f'{k:03d}.jpg')): im = Image.open(os.path.join(X, 'pages', f'{k:03d}.jpg')).convert('RGB')
    else: im = pw.typeset_page(pw.PUBS[k], S=3)
    w = min(1600, max(im.width, 1024))
    im.resize((w, int(w * im.height / im.width)), Image.LANCZOS).save(os.path.join(a.out, 'pages', f'{k:03d}.jpg'), quality=90)
    print('hero', k, pw.PUBS[k]['tag'], w)
