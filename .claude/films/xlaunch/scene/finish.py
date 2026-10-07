#!/usr/bin/env python3
"""Encode a rendered launch film for X: OUT/frames/*.png or OUT/segments/*.mkv (render.py) -> OUT/xfilm.mp4
(1080x1350, H.264 high, CRF 18, yuv420p, bt709, +faststart, a silent AAC track so X treats it as a normal video)
and OUT/xfilm_poster.jpg (frame --poster).   usage: python3 finish.py OUT [--poster 470] [--fps 30]"""
import argparse, glob, os, subprocess, tempfile

ap = argparse.ArgumentParser(); ap.add_argument('out'); ap.add_argument('--poster', type=int, default=470); ap.add_argument('--fps', type=int, default=30)
a = ap.parse_args()
segs = sorted(glob.glob(os.path.join(a.out, 'segments', '*.mkv')))
pngs = sorted(glob.glob(os.path.join(a.out, 'frames', 'f_*.png')))
dst = os.path.join(a.out, 'xfilm.mp4')
enc = ['-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-profile:v', 'high', '-pix_fmt', 'yuv420p',
       '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709',
       '-c:a', 'aac', '-b:a', '64k', '-shortest', '-movflags', '+faststart']
if segs and not pngs:
    lst = tempfile.NamedTemporaryFile('w', suffix='.txt', delete=False)
    for s in segs: lst.write(f"file '{s}'\n")
    lst.close()
    src = ['-f', 'concat', '-safe', '0', '-i', lst.name]
else:
    src = ['-framerate', str(a.fps), '-i', os.path.join(a.out, 'frames', 'f_%05d.png')]
subprocess.run(['ffmpeg', '-v', 'error', '-y', *src, '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo',
                '-vf', 'scale=in_range=full:out_range=tv,format=yuv420p', '-r', str(a.fps), *enc, dst], check=True)
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', f'{a.poster / a.fps:.3f}', '-i', dst, '-frames:v', '1', '-q:v', '2',
                os.path.join(a.out, 'xfilm_poster.jpg')], check=True)
print(dst, os.path.getsize(dst) // 1024, 'KB')
