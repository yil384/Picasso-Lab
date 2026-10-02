#!/usr/bin/env python3
"""Bake the 3 a.m. moonlit night versions of Parikshit's photo layers for people/fx/parikshit.js.

    people/static/fx/parikshit-night.webp        the whole photo at night (512 x 512 RGB)
    people/static/fx/parikshit-plate-night.webp  the plate (person inpainted out) at night
    people/static/fx/parikshit-cut-night.webp    the person at night (RGBA, exactly the cut layer's alpha)

The scene crossfades each day layer to its night twin, so all three line up pixel for pixel with
parikshit.webp / parikshit-plate.webp / parikshit-cut.webp.

Colour reference: Wikimedia Commons, "Everest Range Above Tengboche at Night", photo by
Niklassletteland, CC BY-SA 3.0. Only its colour statistics (the a*/b* of its moonlit snow and mist,
its navy sky) are used; the file itself is never published. Without it the measured samples below
are used (sky mean 30,44,69; snow highlight 206,204,207; snow + mist a*/b* mean 1.1,-2.1, std 1.1,3.5).

    pip install opencv-python-headless pillow
    python3 people/fx/tools/parikshit_night.py [--preview out.png]

Background (the plate, and the photo outside the person):
  luma   L_n = 0.40 L + 0.35 (L - GaussianBlur(L, 4 px)) + 0.012   (the high-pass keeps the pine texture)
  chroma Reinhard transfer of a*/b* to the reference's moonlit snow and mist, saturation x 0.6 round
         that cast, plus a small blue cast (CAST); the chroma is built at the night lightness
  the sky in the haze V (HAZE polygon of parikshit.js, feathered 2.5 px) becomes a vertical gradient
  #1b2843 (v 0) -> #2c4266 (v 105) modulated by the photo's own shading (12 % of its high-pass, and its
  relative shading at 24 % of the navy), so the faint ridges survive.
Person: sRGB x 0.84, saturation x 0.70, cooler white balance (b* -5, a* -1); the photo's light from
the right reads as moonlight.
Night photo = person_night * alpha + background_night * (1 - alpha); within 8-14 px of the person the
background is the night plate (the matte sits inside the jacket's edge). The night cut's colour is the
night photo's (as the day cut's is the day photo's), its alpha exactly the day cut's.
Prints the night/day luma ratios the design asks for (face >= 0.80, near ridges 0.38-0.45, far
mountain 0.40-0.48).
"""
import os
import sys
import urllib.request

import cv2
import numpy as np
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
STATIC = os.path.join(ROOT, 'people', 'static')
FX = os.path.join(STATIC, 'fx')
REF = os.path.join(os.path.dirname(__file__), '.tengboche_night.jpg')
URL = 'https://commons.wikimedia.org/wiki/Special:FilePath/Everest_Range_Above_Tengboche_at_Night.jpg?width=960'
UA = 'PicassoLabSite/1.0 (https://github.com/yil384/Picasso-Lab)'

# the haze V between the two near ridges (photo px) - same polygon as HAZE in people/fx/parikshit.js
HAZE = [[226, -40], [560, -40], [560, 24], [520, 30], [480, 40], [448, 50], [416, 64], [384, 78], [352, 92],
        [322, 103], [314, 104], [304, 96], [292, 80], [282, 64], [272, 48], [262, 32], [250, 16], [240, 0], [232, -20]]
SKY_TOP, SKY_BOT = np.array([0x1b, 0x28, 0x43]) / 255, np.array([0x2c, 0x42, 0x66]) / 255   # v 0 -> v 105
# fallback when the reference cannot be loaded: a*/b* mean, std of moonlit snow + mist (measured)
FALLBACK_AB = (np.array([1.1, -2.1]), np.array([1.1, 3.5]))

# the reference's slopes are near grey under its navy sky; ours fill the frame with only a sliver of sky, so
# they need a little of that blue themselves to read as moonlight (a*, b* added after the transfer)
CAST = np.array([-1.8, -8.0])

# regions for the printed night/day luma ratios
FACE = (215, 300, 240, 320)            # u0, u1, v0, v1
NEAR = (340, 512, 170, 330)            # the near pine ridge on the right
FAR = (0, 230, 0, 120)                 # the upper-left far mountain


def luma(rgb):
    return rgb @ np.array([0.2126, 0.7152, 0.0722])


def to_lab(rgb):
    return cv2.cvtColor(rgb.astype(np.float32), cv2.COLOR_RGB2LAB)


def from_lab(lab):
    return np.clip(cv2.cvtColor(lab.astype(np.float32), cv2.COLOR_LAB2RGB), 0, 1)


def load(name, mode):
    return np.array(Image.open(os.path.join(STATIC, name)).convert(mode)).astype(np.float32) / 255


def ref_ab():
    """mean / std of a*, b* over the reference's moonlit snow and mist (bright, cool, not lamp-lit)."""
    try:
        if not os.path.exists(REF):
            req = urllib.request.Request(URL, headers={'User-Agent': UA})
            with urllib.request.urlopen(req, timeout=30) as r, open(REF, 'wb') as f:
                f.write(r.read())
        ref = np.array(Image.open(REF).convert('RGB')).astype(np.float32) / 255
    except Exception as err:                                   # noqa: BLE001
        print('reference not available, using the measured samples:', err)
        return FALLBACK_AB
    h = ref.shape[0]
    lab = to_lab(ref)
    sel = np.zeros(ref.shape[:2], bool)
    sel[int(h * 0.25): int(h * 0.62)] = True                  # the range and the mist, above the lodges' lamps
    sel &= lab[..., 0] > 40                                    # moonlit snow and the mist bank (not the navy sky)
    sel &= lab[..., 2] < 4                                     # not warm
    ab = lab[sel][:, 1:]
    sky = ref[: int(h * 0.25)].reshape(-1, 3).mean(0) * 255
    print(f'reference: {sel.sum()} moonlit px, a*/b* mean {ab.mean(0).round(2)}, std {ab.std(0).round(2)}; '
          f'sky mean {sky.round(0)}')
    return ab.mean(0), ab.std(0)


def haze_mask():
    m = np.zeros((512, 512), np.float32)
    cv2.fillPoly(m, [np.round(np.array(HAZE) * 8).astype(np.int32)], 1.0, lineType=cv2.LINE_AA, shift=3)
    return cv2.GaussianBlur(m, (0, 0), 2.5)


def background_night(rgb, ab_ref, ab_src, w=None):
    """the moonlit version of the landscape (used for the plate and for the photo round the person).
    w = weight of the landscape (1 - the person's alpha): the high-pass blur ignores the person, or his dark
    jacket would cut a dark ring into the ridge round him."""
    L = luma(rgb)
    if w is None:
        hp = L - cv2.GaussianBlur(L, (0, 0), 4)
    else:
        hp = L - cv2.GaussianBlur(L * w, (0, 0), 4) / np.maximum(cv2.GaussianBlur(w, (0, 0), 4), 1e-3)
    Ln = np.clip(0.40 * L + 0.35 * hp + 0.012, 0, 1)
    lab = to_lab(rgb)
    (mr, sr), (ms, ss) = ab_ref, ab_src
    ab = (lab[..., 1:] - ms) / ss * sr + mr                   # Reinhard on a*/b* only
    lab[..., 1:] = mr + (ab - mr) * 0.6 + CAST                # saturation x 0.6 round the moonlit cast
    # the chroma is meant at the night lightness (scaling a day colour down would grey it out): build the
    # colour at the L* of the night luma, then trim it to that luma exactly
    lab[..., 0] = to_lab(np.repeat(Ln[..., None], 3, 2))[..., 0]
    col = from_lab(lab)
    col *= (Ln / np.maximum(luma(col), 1e-4))[..., None]      # put the night luma under that chroma
    col = np.clip(col, 0, 1)

    # the sky in the V: a vertical navy gradient plus 12 % of the photo's own shading
    v = np.arange(512, dtype=np.float32)[:, None, None]
    grad = SKY_TOP + (SKY_BOT - SKY_TOP) * np.clip(v / 105, 0, 1)
    mk = haze_mask()
    mean_v = (L * mk).sum() / mk.sum()
    sky = np.clip(grad * (1 + 0.24 * (L - mean_v)[..., None] / max(mean_v, 1e-3))
                  + 0.12 * hp[..., None], 0, 1)
    return col * (1 - mk[..., None]) + sky * mk[..., None]


def person_night(rgb):
    lab = to_lab(np.clip(rgb * 0.84, 0, 1))
    lab[..., 1:] *= 0.70
    lab[..., 1] -= 1
    lab[..., 2] -= 5
    return from_lab(lab)


def ratio(night, day, box, w=None):
    u0, u1, v0, v1 = box
    n, d = luma(night[v0:v1, u0:u1]), luma(day[v0:v1, u0:u1])
    w = np.ones_like(n) if w is None else w[v0:v1, u0:u1]
    return float((n * w).sum() / (d * w).sum())


def save(arr, name, **kw):
    Image.fromarray(np.round(np.clip(arr, 0, 1) * 255).astype(np.uint8)).save(os.path.join(FX, name), method=6, **kw)


def main():
    photo = load('parikshit.webp', 'RGB')
    plate = load('fx/parikshit-plate.webp', 'RGB')
    cut8 = np.array(Image.open(os.path.join(FX, 'parikshit-cut.webp')).convert('RGBA'))
    cut, alpha8 = cut8[..., :3].astype(np.float32) / 255, cut8[..., 3]
    a = alpha8.astype(np.float32)[..., None] / 255

    ab_ref = ref_ab()
    bgsel = (a[..., 0] < 0.05)
    lab_src = to_lab(photo)[bgsel][:, 1:]
    ab_src = (lab_src.mean(0), lab_src.std(0))                # one transfer for photo and plate: they must match

    plate_n = background_night(plate, ab_ref, ab_src)
    photo_bg_n = background_night(photo, ab_ref, ab_src, 1 - a[..., 0])
    # the cut's colour is the photo's, day haze mixed into the soft edge: pull the person out first
    # (F = (C - (1 - a) plate) / a), grade him, then mix with the night landscape
    fg = np.where(a > 0.15, np.clip((cut - (1 - a) * plate) / np.maximum(a, 1e-3), 0, 1), cut)
    # the matte sits a few px inside the jacket: round the person the photo's own landscape still holds a fringe
    # of jacket, which the night landscape grade would turn into a dark outline. There the inpainted plate (which
    # the runtime shows under the cut layer anyway) is the landscape, fading to the photo's own 8-14 px out.
    dist = cv2.distanceTransform((alpha8 < 3).astype(np.uint8), cv2.DIST_L2, 5)
    band = np.clip((14 - dist) / 6, 0, 1)[..., None]
    bg_n = plate_n * band + photo_bg_n * (1 - band)
    photo_n = person_night(fg) * a + bg_n * (1 - a)
    # same convention as the day cut layer: its colour is the (night) photo's, its alpha the cut's
    cut_n = photo_n

    save(photo_n, 'parikshit-night.webp', quality=86)
    save(plate_n, 'parikshit-plate-night.webp', quality=82)
    rgba = np.dstack([np.round(cut_n * 255).astype(np.uint8), alpha8])
    Image.fromarray(rgba, 'RGBA').save(os.path.join(FX, 'parikshit-cut-night.webp'), quality=88, method=6,
                                       alpha_quality=100, exact=True)
    back = np.array(Image.open(os.path.join(FX, 'parikshit-cut-night.webp')))[..., 3]
    print('cut-night alpha identical to cut alpha:', bool((back == alpha8).all()))

    bgw = 1 - a[..., 0]
    face = ratio(photo_n, photo, FACE, a[..., 0])
    near = ratio(photo_n, photo, NEAR, bgw)
    far = ratio(photo_n, photo, FAR, bgw)
    print(f'night/day luma: face {face:.3f} (>= 0.80)   near ridges {near:.3f} (0.38-0.45)   '
          f'far mountain {far:.3f} (0.40-0.48)')
    fu0, fu1, fv0, fv1 = FACE
    fl = luma(photo_n[fv0:fv1, fu0:fu1])[a[fv0:fv1, fu0:fu1, 0] > 0.9]
    other = luma(photo_n[440:512, 0:110])                     # the trekker's face, bottom left
    print(f'face night luma p90 {np.percentile(fl, 90):.3f}; bottom-left trekker p90 {np.percentile(other, 90):.3f}')
    plate_diff = np.abs(photo_n - plate_n)[a[..., 0] < 0.02].mean() * 255
    print(f'photo-night vs plate-night outside the person: mean abs diff {plate_diff:.2f} /255')

    if '--preview' in sys.argv:
        out = sys.argv[sys.argv.index('--preview') + 1]
        small = cv2.resize(cv2.resize(photo_n, (135, 135), interpolation=cv2.INTER_AREA), (135, 135))
        canvas = np.ones((512, 512 * 2 + 135 + 32, 3), np.float32) * 0.96
        canvas[:, :512] = photo
        canvas[:, 528:1040] = photo_n
        canvas[:135, 1056:1191] = small
        Image.fromarray(np.round(canvas * 255).astype(np.uint8)).save(out)
        print('preview:', out)


if __name__ == '__main__':
    main()
