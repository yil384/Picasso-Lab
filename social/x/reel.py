#!/usr/bin/env python3
"""Launch reel for the lab's first X post: ~32 s, 1080x1350 (4:5, the largest a video shows in the X mobile feed),
real event photos with slow push-ins, short editorial captions (X autoplays muted, so the captions carry it), the
ISCA comic splash, a few seconds of the hotpot short, and an end card with the handle.

    python3 social/x/reel.py --fonts DIR   ->  social/x/out/launch_reel.mp4
Fonts: Noto Sans SC Bold / Medium static instances (see .claude/films/hotpot/edit.py)."""
import argparse, os, subprocess
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageOps

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
EV = os.path.join(ROOT, 'events', 'static')
ap = argparse.ArgumentParser(); ap.add_argument('--fonts', default=os.path.join(HERE, 'fonts')); A = ap.parse_args()
W, H, FPS = 1080, 1350, 30
B = lambda s: ImageFont.truetype(os.path.join(A.fonts, 'NotoSansSC-Bold.ttf'), s)
M = lambda s: ImageFont.truetype(os.path.join(A.fonts, 'NotoSansSC-Medium.ttf'), s)
AMBER = (255, 184, 92)

# beats: (kind, source, seconds, kicker, title, sub, focus-y 0..1 for the crop)
BEATS = [
    ('photo', 'zhongkai_isca26_bestpaper/5.jpg', 3.0, 'JUNE 2026', 'ISCA 2026\nBest Paper Award', 'Patterns behind Chaos: MoE LLM inference', 0.62),
    ('photo', 'zhongkai_isca26_bestpaper/4.jpg', 2.4, 'ISCA 2026', 'Zhongkai Yu on stage', 'with UCSD, IU Bloomington, Columbia, Samsung, NVIDIA', 0.4),
    ('splash', 'splash/bestpaper.mp4', 2.25, '', '', '', 0.5),
    ('photo', 'lightstim_grant_0929/2-1280.webp', 3.0, 'SEPTEMBER 2026', 'A grant for LightStim', 'Xiang Fang\'s open-source QEC framework', None),
    ('photo', 'hezi_defense/1.jpg', 2.8, 'JUNE 2026', 'Dr. Hezi Zhang', 'next: Assistant Professor, UW-Madison ECE', 0.35),
    ('photo', 'zhengwang/3.jpg', 2.4, 'DECEMBER 2025', 'Dr. Zheng Wang', 'systems for large-model training', 0.5),
    ('photo', 'firespot_welcome_0920/1.jpg', 2.8, 'FALL 2026', 'Welcome, new PhDs\nand interns', '', None),
    ('montage', ['sf_saturday_trip_0627/10.jpg', 'haidilao_0620/1.jpg', 'crab_day/5.jpg', 'picasso_party_0725/1.jpg',
                 'pita22/2.jpg', 'mongolia_hotpot/1.jpg'], 0.55, 'LAB LIFE', 'And a lot of hot pot.', '', 0.5),
    ('clip', os.path.join(ROOT, '.claude/films/hotpot/out/hotpot_ep1.mp4'), 3.2, 'PICASSO LAB SHORTS', 'We even made\na cartoon about it.', '', 21.7),
    ('end', None, 3.6, '', '', '', 0),
]


def cover(im, fy, zoom):
    """crop the image to 4:5 around the focus height, zoomed by `zoom` (>= 1)"""
    iw, ih = im.size; s = max(W / iw, H / ih) * zoom
    cw, ch = W / s, H / s
    x0 = (iw - cw) / 2; y0 = min(max(fy * ih - ch / 2, 0), ih - ch)
    return im.resize((W, H), Image.LANCZOS, box=(x0, y0, x0 + cw, y0 + ch))


def fit(im, zoom):
    """the whole image (a comic page) on a blurred, dimmed fill of itself"""
    bg = cover(im, 0.5, 1.2).filter(ImageFilter.GaussianBlur(30)); bg = Image.eval(bg, lambda v: int(v * 0.45))
    s = W / im.width * 0.94 * zoom; fg = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
    bg.paste(fg, ((W - fg.width) // 2, int(H * 0.36 - fg.height / 2))); return bg


def shade(im):
    """bottom gradient for the captions, a faint top one for the mark"""
    a = np.asarray(im).astype(np.float32)
    y = np.linspace(0, 1, H)[:, None, None]
    k = 1 - 0.9 * np.clip((y - 0.46) / 0.4, 0, 1) ** 1.2 - 0.35 * np.clip((0.12 - y) / 0.12, 0, 1)
    return Image.fromarray((a * k).astype(np.uint8))


def caption(im, kicker, title, sub, t):
    """kicker / title / sub at the bottom left, sliding up 24 px over the first 0.35 s"""
    d = ImageDraw.Draw(im); e = min(1, t / 0.35); e = 1 - (1 - e) ** 3; dy = 24 * (1 - e)
    fill = lambda c: tuple(int(v * e) for v in c)   # fade in on a dark background
    lines = title.split('\n'); y = H - 96 - (54 if sub else 0) - 84 * len(lines) + dy
    if kicker:
        d.text((72, y - 52), ' '.join(kicker), font=B(26), fill=fill(AMBER))
    for ln in lines:
        d.text((70, y), ln, font=B(72), fill=fill((255, 255, 255))); y += 84
    if sub:
        d.text((72, y + 10), sub, font=M(36), fill=fill((225, 220, 212)))


def mark(im):
    ImageDraw.Draw(im).text((72, 58), 'P I C A S S O   L A B   ·   U C   S A N   D I E G O', font=B(22), fill=(240, 236, 230))


def splash_frames(path, n):
    """the events comic splash is alpha-packed (colour on top, alpha below): composite it on a blurred, dimmed
    copy of the award photo"""
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'],
                         check=True, stdout=subprocess.PIPE).stdout
    fw, fh = 960, 1440; fr = np.frombuffer(raw, np.uint8).reshape(-1, fh, fw, 3)
    bg = cover(Image.open(os.path.join(EV, 'zhongkai_isca26_bestpaper/5.jpg')).convert('RGB'), 0.45, 1.1)
    bg = np.asarray(bg.filter(ImageFilter.GaussianBlur(28))).astype(np.float32) * 0.35
    out = []
    for i in range(n):
        f = fr[min(i * len(fr) // n, len(fr) - 1)]
        rgb = f[:fh // 2].astype(np.float32); al = f[fh // 2:, :, :1].astype(np.float32) / 255
        rgb = np.asarray(Image.fromarray(rgb.astype(np.uint8)).resize((W, W * 720 // 960), Image.LANCZOS)).astype(np.float32)
        al = np.asarray(Image.fromarray((al[..., 0] * 255).astype(np.uint8)).resize((W, W * 720 // 960), Image.LANCZOS)).astype(np.float32)[..., None] / 255
        c = bg.copy(); y0 = (H - rgb.shape[0]) // 2 - 40
        c[y0:y0 + rgb.shape[0]] = c[y0:y0 + rgb.shape[0]] * (1 - al) + rgb * al
        out.append(Image.fromarray(c.astype(np.uint8)))
    return out


def clip_frames(path, start, secs):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-ss', f'{start}', '-t', f'{secs}', '-i', path, '-vf',
                          f'crop=ih*4/5:ih,scale={W}:{H},fps={FPS}', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'],
                         check=True, stdout=subprocess.PIPE).stdout
    return [Image.fromarray(f) for f in np.frombuffer(raw, np.uint8).reshape(-1, H, W, 3)]


def end_card():
    im = Image.new('RGB', (W, H)); px = ImageDraw.Draw(im)
    for y in range(H):
        k = y / H; px.line([(0, y), (W, y)], fill=(int(24 + 18 * k), int(15 + 7 * k), int(18 + 5 * k)))
    glow = Image.new('L', (W, H)); ImageDraw.Draw(glow).ellipse((W / 2 - 480, H / 2 - 420, W / 2 + 480, H / 2 + 320), fill=100)
    im = Image.composite(Image.new('RGB', (W, H), (176, 72, 32)), im, glow.filter(ImageFilter.GaussianBlur(170)))
    d = ImageDraw.Draw(im)
    def c(y, s, f, col): d.text(((W - d.textlength(s, font=f)) / 2, y), s, font=f, fill=col)
    c(400, 'PICASSO LAB', B(118), (255, 238, 214))
    c(548, 'UC San Diego  ·  Prof. Yufei Ding', M(38), (236, 214, 196))
    c(640, 'Quantum computing  ·  ML systems', M(34), (214, 190, 172))
    c(688, 'Computer architecture', M(34), (214, 190, 172))
    d.line((W / 2 - 60, 790, W / 2 + 60, 790), fill=AMBER, width=3)
    c(840, '@PicassoLabUCSD', B(60), AMBER)
    c(930, 'yufeiding.ucsd.edu', M(34), (226, 206, 190))
    return im


def main():
    os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
    out = os.path.join(HERE, 'out', 'launch_reel.mp4')
    ff = subprocess.Popen(['ffmpeg', '-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', f'{FPS}',
                           '-i', '-', '-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo', '-shortest',
                           '-c:v', 'libx264', '-crf', '18', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-profile:v', 'high',
                           '-c:a', 'aac', '-b:a', '64k', '-movflags', '+faststart', out], stdin=subprocess.PIPE)
    prev = None; XF = 8   # cross-fade frames between beats
    for kind, src, secs, kicker, title, sub, fy in BEATS:
        seq = []
        if kind == 'photo':
            im = ImageOps.exif_transpose(Image.open(os.path.join(EV, src))).convert('RGB')
            im.thumbnail((2400, 2400)); n = int(secs * FPS)
            for i in range(n):
                f = shade(cover(im, fy, 1.0 + 0.06 * i / n) if fy is not None else fit(im, 1.0 + 0.03 * i / n)); caption(f, kicker, title, sub, i / FPS); mark(f); seq.append(f)
        elif kind == 'montage':
            for j, p in enumerate(src):
                im = ImageOps.exif_transpose(Image.open(os.path.join(EV, p))).convert('RGB'); im.thumbnail((2400, 2400))
                n = int(secs * FPS)
                for i in range(n):
                    f = shade(cover(im, fy, 1.04 + 0.04 * i / n)); caption(f, kicker, title, sub, (j * n + i) / FPS); mark(f); seq.append(f)
        elif kind == 'splash':
            seq = splash_frames(os.path.join(EV, src), int(secs * FPS))
        elif kind == 'clip':
            for i, f in enumerate(clip_frames(src, fy, secs)):
                f = shade(f); caption(f, kicker, title, sub, i / FPS); mark(f); seq.append(f)
        else:
            e = end_card(); seq = [e] * int(secs * FPS)
        if prev is not None and kind != 'montage':   # cross-fade from the last frames of the previous beat
            for i in range(min(XF, len(seq))):
                seq[i] = Image.blend(prev, seq[i], (i + 1) / (XF + 1))
        for f in seq: ff.stdin.write(f.tobytes())
        prev = seq[-1]
    ff.stdin.close(); ff.wait()
    print(out, os.path.getsize(out) // 1024, 'KB')


if __name__ == '__main__':
    main()
