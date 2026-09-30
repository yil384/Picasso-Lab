import sys, glob, os
from PIL import Image, ImageDraw
out, pat = sys.argv[1], sys.argv[2]
cols = int(sys.argv[3]) if len(sys.argv) > 3 else 6
scale = float(sys.argv[4]) if len(sys.argv) > 4 else 0.5
files = sorted(glob.glob(pat))
ims = [Image.open(f).convert('RGB') for f in files]
ims = [im.resize((int(im.width * scale), int(im.height * scale)), Image.LANCZOS) for im in ims]
w, h = ims[0].size
rows = (len(ims) + cols - 1) // cols
c = Image.new('RGB', (cols * (w + 4), rows * (h + 16)), '#999')
d = ImageDraw.Draw(c)
for i, (f, im) in enumerate(zip(files, ims)):
    x, y = (i % cols) * (w + 4), (i // cols) * (h + 16)
    c.paste(im, (x, y + 14)); d.text((x + 3, y + 1), os.path.basename(f)[:-4], fill=(0, 0, 0))
c.save(out)
print(c.size)
