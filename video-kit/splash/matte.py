#!/usr/bin/env python3
"""Difference matting for the events splash films.

Each film is rendered twice, identical except for a flat black (K) or white (W) background. For a pixel with
straight colour C and coverage a:  K = a*C,  W = a*C + (1 - a)*255  =>  a = 1 - (W - K)/255,  C = K / a.
Writes stacked frames for a plain H.264 file (colour on top, alpha as grey below) plus an RGBA WebP still.

  python3 matte.py NAME            # reads render/NAME_k/frames and render/NAME_w/frames
"""
import os, sys
import numpy as np
from PIL import Image

D = os.path.dirname(os.path.abspath(__file__))
OUT_W, OUT_H = 960, 720


def main(name):
    fk, fw = os.path.join(D, 'render', name + '_k', 'frames'), os.path.join(D, 'render', name + '_w', 'frames')
    out = os.path.join(D, 'render', name + '_stack'); os.makedirs(out, exist_ok=True)
    frames = sorted(os.listdir(fk))
    if frames != sorted(os.listdir(fw)):
        return None, 'black and white renders have different frames'
    last = None
    for f in frames:
        k = np.asarray(Image.open(os.path.join(fk, f)).convert('RGB'), dtype=np.float32)
        w = np.asarray(Image.open(os.path.join(fw, f)).convert('RGB'), dtype=np.float32)
        a = np.clip(1.0 - (w - k).mean(axis=2) / 255.0, 0.0, 1.0)
        c = np.where(a[..., None] > 1e-3, k / np.maximum(a[..., None], 1e-3), 0.0)
        c = np.clip(c, 0, 255)
        rgba = Image.fromarray(np.dstack([c, a * 255]).round().astype(np.uint8), 'RGBA').resize((OUT_W, OUT_H), Image.LANCZOS)
        rgb = rgba.convert('RGB')                                     # colour half (straight, black where empty)
        alpha = rgba.getchannel('A').convert('RGB')                   # alpha half
        stack = Image.new('RGB', (OUT_W, OUT_H * 2)); stack.paste(rgb, (0, 0)); stack.paste(alpha, (0, OUT_H))
        stack.save(os.path.join(out, f))
        last = rgba
    last.save(os.path.join(D, 'out', name + '.webp'), 'WEBP', quality=82, method=6)   # transparent still
    return len(frames), None


if __name__ == '__main__':
    n, err = main(sys.argv[1])
    print(sys.argv[1], err or f'{n} stacked frames')
