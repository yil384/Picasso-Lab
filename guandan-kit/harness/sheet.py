"""Contact sheet of harness shots: python3 sheet.py OUT.jpg shot1.jpg shot2.jpg ... [--w=640 --cols=3]"""
import sys, os
from PIL import Image, ImageDraw, ImageFont
args = [a for a in sys.argv[1:] if not a.startswith('--')]
opt = dict(a[2:].split('=') for a in sys.argv[1:] if a.startswith('--'))
W, cols = int(opt.get('w', 640)), int(opt.get('cols', 3))
out, files = args[0], args[1:]
ims = []
for f in files:
    im = Image.open(f).convert('RGB'); r = W / im.width
    ims.append((os.path.basename(f), im.resize((W, int(im.height * r)))))
H = max(im.height for _, im in ims) + 22
rows = (len(ims) + cols - 1) // cols
sheet = Image.new('RGB', (W * cols, H * rows), 'white')
d = ImageDraw.Draw(sheet)
try:
    font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 16)
except Exception:
    font = None
for k, (name, im) in enumerate(ims):
    x, y = (k % cols) * W, (k // cols) * H
    sheet.paste(im, (x, y + 22)); d.text((x + 4, y + 2), name, fill='black', font=font)
sheet.save(out, quality=80)
