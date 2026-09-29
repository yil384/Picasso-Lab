#!/usr/bin/env python3
"""strip.py VIDEO START END STEP OUT.jpg [COLS] [THUMBW]: tile every STEP-th frame of [START,END) with frame labels."""
import subprocess, sys
from PIL import Image, ImageDraw
v, a, b, s, out = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), int(sys.argv[4]), sys.argv[5]
cols = int(sys.argv[6]) if len(sys.argv) > 6 else 6
tw = int(sys.argv[7]) if len(sys.argv) > 7 else 320
probe = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', v], capture_output=True, text=True).stdout.strip().split(',')
W, H = int(probe[0]), int(probe[1])
th = round(H * tw / W)
p = subprocess.Popen(['ffmpeg', '-loglevel', 'error', '-i', v, '-vf', f'scale={tw}:{th}', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], stdout=subprocess.PIPE)
frames = list(range(a, b, s)); want = set(frames); got = {}
n = 0
while True:
    buf = p.stdout.read(tw * th * 3)
    if len(buf) < tw * th * 3: break
    if n in want: got[n] = Image.frombytes('RGB', (tw, th), buf)
    n += 1
    if n >= b: break
p.kill()
rows = (len(frames) + cols - 1) // cols
sheet = Image.new('RGB', (tw * cols, th * rows), (25, 25, 25)); d = ImageDraw.Draw(sheet)
for k, f in enumerate(frames):
    if f not in got: continue
    x, y = (k % cols) * tw, (k // cols) * th
    sheet.paste(got[f], (x, y)); d.rectangle([x, y, x + 34, y + 13], fill=(0, 0, 0)); d.text((x + 3, y + 1), str(f), fill=(255, 255, 255))
sheet.save(out, quality=86); print(out, sheet.size)
