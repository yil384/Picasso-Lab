#!/usr/bin/env python3
"""cardtest.py VIDEO OUT.jpg f1 f2 ... : crop the central 2.1:1 band, shrink to 400x190, tile 4 wide (labelled)."""
import subprocess, sys
from PIL import Image, ImageDraw
v, out, frames = sys.argv[1], sys.argv[2], [int(x) for x in sys.argv[3:]]
pr = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', v], capture_output=True, text=True).stdout.strip().split(',')
W, H = int(pr[0]), int(pr[1])
p = subprocess.Popen(['ffmpeg', '-loglevel', 'error', '-i', v, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], stdout=subprocess.PIPE)
got, n, want = {}, 0, set(frames)
while n <= max(frames):
    b = p.stdout.read(W * H * 3)
    if len(b) < W * H * 3: break
    if n in want: got[n] = Image.frombytes('RGB', (W, H), b)
    n += 1
p.kill()
ch = round(W / 2.1); y0 = (H - ch) // 2
cols = 4; rows = (len(frames) + cols - 1) // cols
sheet = Image.new('RGB', (cols * 410, rows * 206), (235, 235, 235)); d = ImageDraw.Draw(sheet)
for k, f in enumerate(frames):
    im = got[f].crop((0, y0, W, y0 + ch)).resize((400, 190), Image.LANCZOS)
    x, y = (k % cols) * 410 + 5, (k // cols) * 206 + 13
    sheet.paste(im, (x, y)); d.text((x, y - 12), f'f{f}', fill=(0, 0, 0))
sheet.save(out, quality=90); print(out, sheet.size)
