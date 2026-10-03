import sys, glob, os
from PIL import Image, ImageDraw
d, out, per = sys.argv[1], sys.argv[2], int(sys.argv[3]) if len(sys.argv) > 3 else 12
fs = sorted(glob.glob(os.path.join(d, 'f_*.png')))
W = 270; H = 338; cols = 6
for s in range(0, len(fs), per):
    chunk = fs[s:s + per]; rows = (len(chunk) + cols - 1) // cols
    sh = Image.new('RGB', (cols * W, rows * (H + 18)), (20, 20, 20)); dr = ImageDraw.Draw(sh)
    for i, f in enumerate(chunk):
        im = Image.open(f).convert('RGB').resize((W, H)); x, y = (i % cols) * W, (i // cols) * (H + 18)
        sh.paste(im, (x, y + 18)); n = int(os.path.basename(f)[2:7]); dr.text((x + 4, y + 3), f'{n/30:.1f}s f{n}', fill=(255, 220, 120))
    sh.save(f'{out}_{s // per:02d}.jpg', quality=88)
