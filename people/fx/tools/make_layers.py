#!/usr/bin/env python3
"""Make the layers an avatar effect needs from a Team page photo.

    people/static/<name>.webp  ->  people/static/fx/<name>-cut.webp    the person, cut out (RGBA)
                                   people/static/fx/<name>-plate.webp  the photo with the person inpainted out

The kit (people/fx/kit.js) stacks them: plate at the back, props in between, the cut-out on top, so a
prop can pass behind the person and the stage can tilt in parallax.

    pip install "rembg[cpu]" opencv-python-headless pillow
    python3 people/fx/tools/make_layers.py alon chang ...

The matte is BiRefNet (rembg model "birefnet-portrait", downloads ~1 GB once to ~/.rembg). It crashes
after the first image in a process on some machines, so every photo runs in its own process.
Add --grid to also write <name>-grid.jpg next to this script: the photo at 768 px with a grid
(red every 128 photo px, yellow every 32, labels every 64) for reading landmarks off the photo.
"""
import os
import subprocess
import sys

import cv2
import numpy as np
from PIL import Image, ImageDraw

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
STATIC = os.path.join(ROOT, 'people', 'static')


def matte(name):
    """BiRefNet portrait matte (0..1 float, 512 x 512), computed in a child process."""
    out = os.path.join(os.path.dirname(__file__), f'.{name}-matte.png')
    code = (
        'import sys; from rembg import new_session, remove; from PIL import Image;'
        f'im = Image.open({os.path.join(STATIC, name + ".webp")!r}).convert("RGB").resize((512, 512));'
        f'remove(im, session=new_session("birefnet-portrait"), only_mask=True, post_process_mask=False).save({out!r})'
    )
    subprocess.run([sys.executable, '-c', code], check=True)
    m = np.array(Image.open(out).convert('L').resize((512, 512), Image.LANCZOS)).astype(np.float32) / 255
    os.remove(out)
    return m


def layers(name, grid=False):
    im = Image.open(os.path.join(STATIC, f'{name}.webp')).convert('RGBA').resize((512, 512), Image.LANCZOS)
    rgb = np.array(im.convert('RGB'))
    m = matte(name)
    # a tight edge: pull the matte in a touch so no background halo rides along with the person
    m = np.clip((m - 0.12) / 0.76, 0, 1)
    a = cv2.erode((m * 255).astype(np.uint8), np.ones((2, 2), np.uint8))
    os.makedirs(os.path.join(STATIC, 'fx'), exist_ok=True)
    Image.fromarray(np.dstack([rgb, a])).save(os.path.join(STATIC, 'fx', f'{name}-cut.webp'), quality=88, method=6)

    # plate: inpaint the person away (only ever seen through a few px of parallax, or under a new set)
    hole = cv2.dilate(((m > 0.02) * 255).astype(np.uint8), np.ones((13, 13), np.uint8))
    small = cv2.resize(rgb, (256, 256), interpolation=cv2.INTER_AREA)
    hs = cv2.resize(hole, (256, 256), interpolation=cv2.INTER_NEAREST)
    pl = cv2.inpaint(cv2.cvtColor(small, cv2.COLOR_RGB2BGR), hs, 9, cv2.INPAINT_TELEA)
    pl = cv2.GaussianBlur(cv2.resize(pl, (512, 512), interpolation=cv2.INTER_CUBIC), (0, 0), 3)
    pl = cv2.cvtColor(pl, cv2.COLOR_BGR2RGB)
    hm = (cv2.GaussianBlur(hole, (0, 0), 4) / 255.0)[:, :, None]
    plate = (rgb * (1 - hm) + pl * hm).astype(np.uint8)
    Image.fromarray(plate).save(os.path.join(STATIC, 'fx', f'{name}-plate.webp'), quality=82, method=6)

    if grid:
        g = Image.fromarray(rgb).resize((768, 768), Image.LANCZOS)
        d = ImageDraw.Draw(g)
        for k in range(0, 513, 32):
            x = k * 1.5
            major = k % 128 == 0
            d.line([(x, 0), (x, 768)], fill=(255, 0, 0) if major else (255, 255, 0), width=2 if major else 1)
            d.line([(0, x), (768, x)], fill=(255, 0, 0) if major else (255, 255, 0), width=2 if major else 1)
            if k % 64 == 0 and k < 512:
                d.text((x + 2, 2), str(k), fill=(255, 255, 255))
                d.text((2, x + 2), str(k), fill=(255, 255, 255))
        g.save(os.path.join(os.path.dirname(__file__), f'{name}-grid.jpg'), quality=80)


if __name__ == '__main__':
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    for n in args:
        layers(n, grid='--grid' in sys.argv)
        print(n, 'done')
