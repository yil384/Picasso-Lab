import sys, glob
from PIL import Image
out, pre = sys.argv[1], sys.argv[2]
files = sorted(glob.glob(f'shots/{pre}_*.jpg'))
ims = [Image.open(f) for f in files]
w, h = ims[0].size
cols = min(len(ims), 6); rows = (len(ims) + cols - 1) // cols
c = Image.new('RGB', (cols * (w + 4), rows * (h + 18)), '#999')
from PIL import ImageDraw
d = ImageDraw.Draw(c)
for i, (f, im) in enumerate(zip(files, ims)):
    x, y = (i % cols) * (w + 4), (i // cols) * (h + 18)
    c.paste(im, (x, y + 16)); d.text((x + 3, y + 2), f.split('_', 2)[-1].replace('.jpg', ''), fill=(0, 0, 0))
c.save(out, quality=85)
