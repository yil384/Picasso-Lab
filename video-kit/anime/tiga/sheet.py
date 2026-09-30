import sys, glob, os
from PIL import Image, ImageDraw, ImageFont
d = sys.argv[1]; out = sys.argv[2]; cols = int(sys.argv[3]) if len(sys.argv) > 3 else 4; W = int(sys.argv[4]) if len(sys.argv) > 4 else 480
fs = sorted(glob.glob(os.path.join(d, 'f_*.png')))
ims = [Image.open(f).convert('RGB') for f in fs]
h = int(ims[0].height * W / ims[0].width)
rows = (len(ims) + cols - 1) // cols
S = Image.new('RGB', (cols * (W + 6), rows * (h + 6)), 'white'); D = ImageDraw.Draw(S)
font = ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc', 16)
for k, (f, im) in enumerate(zip(fs, ims)):
    x, y = (k % cols) * (W + 6), (k // cols) * (h + 6)
    S.paste(im.resize((W, h)), (x, y)); n = int(os.path.basename(f)[2:7])
    D.rectangle([x, y, x + 92, y + 20], fill='black'); D.text((x + 4, y + 2), f'{n} {n/30:.2f}s', fill='yellow', font=font)
S.save(out, quality=78)
