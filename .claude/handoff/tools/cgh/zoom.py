import sys
from PIL import Image, ImageDraw
name, u0, v0, u1, v1, sc = sys.argv[1], *map(int, sys.argv[2:6]), float(sys.argv[6])
out = sys.argv[7]
im = Image.open(f'/home/user/Picasso-Lab/people/static/{name}.webp').convert('RGB')
bg = Image.new('RGB', im.size, (0,0,0)); bg.paste(im)
c = bg.crop((u0, v0, u1, v1)).resize((int((u1-u0)*sc), int((v1-v0)*sc)), Image.LANCZOS)
d = ImageDraw.Draw(c)
step = int(sys.argv[8]) if len(sys.argv) > 8 else 16
for u in range((u0//step)*step, u1+1, step):
    if u < u0: continue
    x = (u-u0)*sc
    col = (255,0,0) if u % 64 == 0 else (255,255,0)
    d.line([(x,0),(x,c.size[1])], fill=col, width=1)
    if u % (step*2) == 0: d.text((x+2, 2), str(u), fill=(0,255,255))
for v in range((v0//step)*step, v1+1, step):
    if v < v0: continue
    y = (v-v0)*sc
    col = (255,0,0) if v % 64 == 0 else (255,255,0)
    d.line([(0,y),(c.size[0],y)], fill=col, width=1)
    if v % (step*2) == 0: d.text((2, y+2), str(v), fill=(0,255,255))
c.save(out, quality=85)
