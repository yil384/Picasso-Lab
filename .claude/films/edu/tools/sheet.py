#!/usr/bin/python3
"""Contact sheet of vertical frames: python3 sheet.py OUT.jpg a.png b.png ... [--h 960] (labels = file names)."""
import os, sys
from PIL import Image, ImageDraw, ImageFont


def make_sheet(out, files, h=960, pad=12):
    """Paste frames side by side at height h with their names. Returns (out, None) or (None, 'error')."""
    if not files:
        return None, 'no frames given'
    try:
        ims = [Image.open(f).convert('RGB') for f in files]
    except OSError as e:
        return None, f'cannot read a frame: {e}'
    ims = [im.resize((round(im.width * h / im.height), h), Image.LANCZOS) for im in ims]
    S = Image.new('RGB', (sum(i.width for i in ims) + pad * (len(ims) + 1), h + 2 * pad + 28), (30, 30, 34))
    d = ImageDraw.Draw(S)
    try:
        font = ImageFont.truetype('/System/Library/Fonts/Menlo.ttc', 18)
    except OSError:
        font = None
    x = pad
    for f, im in zip(files, ims):
        S.paste(im, (x, pad)); d.text((x, h + pad + 4), os.path.basename(f), fill=(200, 200, 200), font=font); x += im.width + pad
    try:
        S.save(out, quality=90)
    except OSError as e:
        return None, f'cannot write {out}: {e}'
    return out, None


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    h = int(sys.argv[sys.argv.index('--h') + 1]) if '--h' in sys.argv else 960
    out, files = args[0], [a for a in args[1:] if not a.isdigit()]
    res, err = make_sheet(out, files, h)
    if err:
        sys.exit(err)
    print(res)


if __name__ == '__main__':
    main()
