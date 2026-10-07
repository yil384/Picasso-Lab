#!/usr/bin/env python3
"""Episode 1 edit: cut the Vids export (vids/clips/raw.mp4, six 10 s scenes) into a ~45 s short with burned-in
bilingual captions and an end card.   python3 edit.py [--fonts DIR]  ->  out/hotpot_ep1.mp4 (1080p) + out/hotpot_ep1_720p.mp4

Fonts: Noto Sans SC Bold / Medium static instances (cut from Google Fonts' variable NotoSansSC with fontTools); pass the
folder with --fonts (default: ./fonts, not committed - 10 MB each)."""
import argparse, os, subprocess
from PIL import Image, ImageDraw, ImageFont, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(HERE, 'vids/clips/raw.mp4')
OUT = os.path.join(HERE, 'out'); TMP = os.path.join(OUT, 'tmp')
ap = argparse.ArgumentParser(); ap.add_argument('--fonts', default=os.path.join(HERE, 'fonts')); A = ap.parse_args()

# (in, out) in raw.mp4 seconds - the best part of each 10 s scene
SEGS = [(0.30, 9.20),    # s1 Leo: "just mild"
        (11.40, 17.40),  # s2 Kai tips the chili jar in
        (20.15, 26.90),  # s3 three hands; stop before "my tongue is on fire" (nobody has eaten yet)
        (30.40, 36.40),  # s4 the pot erupts
        (40.20, 46.40),  # s5 first bite, pink cheeks, steam puffs
        (50.40, 58.60)]  # s6 "So, did the model converge?" "To fire."
END = 3.2
# captions on the raw timeline: (start, end, English, Chinese)
CAP = [(1.56, 3.36, 'Okay, team.', '好了，各位。'), (3.36, 5.00, 'Mild.', '微辣。'),
       (5.00, 8.90, 'Everyone agrees: just mild.', '大家都同意：就微辣。'),
       (12.2, 16.9, '(whispering) One more scoop should be fine...', '（小声）再加一勺应该没事……'),
       (20.15, 22.40, "I'll just put a little bit in.", '我就放一点点。'), (22.40, 23.50, 'Hey, I saw that.', '喂，我看见了。'),
       (23.50, 25.00, "Shh, don't look at me.", '嘘，别看我。'), (25.00, 26.85, 'Wow, that is really red.', '哇，这也太红了吧。'),
       (51.68, 54.56, 'So... did the model converge?', '所以……模型收敛了吗？'), (54.56, 57.90, 'To fire!', '收敛到火了！')]
# small "lab instrument" labels: (raw start, raw end, text)
TAGS = [(30.6, 36.3, 'spice_level: DIVERGING'), (40.4, 46.2, 'loss = NaN (too spicy)')]


def run(*a): subprocess.run(a, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)


def ts(t): h = int(t // 3600); m = int(t % 3600 // 60); s = t % 60; return f'{h}:{m:02d}:{s:05.2f}'


def to_edit(t):
    """raw time -> edited timeline time (None if cut)"""
    acc = 0.0
    for a, b in SEGS:
        if a <= t <= b: return acc + t - a
        acc += b - a
    return None


def end_card(path):
    W, H = 1920, 1080
    im = Image.new('RGB', (W, H)); px = ImageDraw.Draw(im)
    for y in range(H):   # warm dark gradient, like the lab at night
        k = y / H; px.line([(0, y), (W, y)], fill=(int(28 + 22 * k), int(16 + 8 * k), int(20 + 6 * k)))
    glow = Image.new('L', (W, H)); ImageDraw.Draw(glow).ellipse((W / 2 - 520, H / 2 - 330, W / 2 + 520, H / 2 + 330), fill=110)
    im = Image.composite(Image.new('RGB', (W, H), (180, 70, 30)), im, glow.filter(ImageFilter.GaussianBlur(160)))
    d = ImageDraw.Draw(im); B = os.path.join(A.fonts, 'NotoSansSC-Bold.ttf'); M = os.path.join(A.fonts, 'NotoSansSC-Medium.ttf')
    def ctext(y, s, f, fill): w = d.textlength(s, font=f); d.text(((W - w) / 2, y), s, font=f, fill=fill)
    ctext(300, 'NEURAL HOTPOT', ImageFont.truetype(B, 120), (255, 236, 210))
    ctext(440, 'TEMPERATURE SCALING', ImageFont.truetype(B, 72), (255, 190, 120))
    ctext(570, 'Accepted, with sesame sauce.', ImageFont.truetype(M, 46), (240, 220, 200))
    ctext(640, '神经火锅温度缩放 · 已接收（附麻酱）', ImageFont.truetype(M, 40), (220, 200, 185))
    ctext(860, 'PICASSO LAB  ·  UC SAN DIEGO', ImageFont.truetype(M, 34), (200, 170, 150))
    im.save(path)


def main():
    os.makedirs(TMP, exist_ok=True)
    parts = []
    for i, (a, b) in enumerate(SEGS):   # each shot: re-encoded, 60 ms audio fades so the hard cuts don't click
        p = os.path.join(TMP, f'seg{i}.mp4'); d = b - a
        run('ffmpeg', '-y', '-ss', f'{a}', '-t', f'{d}', '-i', RAW, '-map', '0:v:0', '-map', '0:a:0',
            '-vf', 'scale=1920:1080,fps=30,format=yuv420p', '-af', f'afade=t=in:d=0.06,afade=t=out:st={d - 0.06:.3f}:d=0.06,aresample=48000',
            '-c:v', 'libx264', '-crf', '16', '-preset', 'medium', '-c:a', 'aac', '-b:a', '192k', '-ac', '2', p)
        parts.append(p)
    png = os.path.join(TMP, 'end.png'); end_card(png); pe = os.path.join(TMP, 'end.mp4')
    run('ffmpeg', '-y', '-loop', '1', '-t', f'{END}', '-i', png, '-f', 'lavfi', '-t', f'{END}', '-i', 'anullsrc=r=48000:cl=stereo',
        '-vf', f'fps=30,format=yuv420p,fade=t=in:d=0.5,fade=t=out:st={END - 0.4}:d=0.4', '-c:v', 'libx264', '-crf', '16', '-c:a', 'aac', '-b:a', '192k', '-shortest', pe)
    parts.append(pe)
    lst = os.path.join(TMP, 'list.txt'); open(lst, 'w').write(''.join(f"file '{p}'\n" for p in parts))
    joined = os.path.join(TMP, 'joined.mp4'); run('ffmpeg', '-y', '-f', 'concat', '-safe', '0', '-i', lst, '-c', 'copy', joined)

    # captions: English on top, Chinese below, bottom centre; the instrument tags top right in a mono-ish style
    ass = ['[Script Info]', 'ScriptType: v4.00+', 'PlayResX: 1920', 'PlayResY: 1080', '', '[V4+ Styles]',
           'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding',
           'Style: EN,Noto Sans SC Bold,54,&H00FFFFFF,&H00FFFFFF,&H00141010,&H64000000,0,0,0,0,100,100,0,0,1,3.2,1.5,2,80,80,118,1',
           'Style: ZH,Noto Sans SC Medium,44,&H00D8F0FF,&H00FFFFFF,&H00141010,&H64000000,0,0,0,0,100,100,0,0,1,3,1.2,2,80,80,58,1',
           'Style: TAG,Noto Sans SC Bold,34,&H0080D0FF,&H00FFFFFF,&H00101010,&HA0000000,0,0,0,0,100,100,2,0,3,10,0,9,60,60,50,1',
           'Style: SHOW,Noto Sans SC Bold,30,&H00F0F0F0,&H00FFFFFF,&H00101010,&H80000000,0,0,0,0,100,100,3,0,1,2,0,7,60,60,46,1',
           '', '[Events]', 'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text']
    for a, b, en, zh in CAP:
        s, e = to_edit(a), to_edit(min(b, [x for x in SEGS if x[0] <= a <= x[1]][0][1]))
        if s is None: continue
        ass.append(f'Dialogue: 0,{ts(s)},{ts(e)},EN,,0,0,0,,{{\\fad(80,80)}}{en}')
        ass.append(f'Dialogue: 0,{ts(s)},{ts(e)},ZH,,0,0,0,,{{\\fad(80,80)}}{zh}')
    for a, b, tx in TAGS:
        ass.append(f'Dialogue: 1,{ts(to_edit(a))},{ts(to_edit(b))},TAG,,0,0,0,,{{\\fad(150,150)}}{tx}')
    ass.append(f'Dialogue: 1,{ts(0.2)},{ts(3.6)},SHOW,,0,0,0,,{{\\fad(300,300)}}PICASSO LAB SHORTS  ·  EP.1')
    ap_ = os.path.join(TMP, 'caps.ass'); open(ap_, 'w', encoding='utf-8').write('\n'.join(ass) + '\n')

    out = os.path.join(OUT, 'hotpot_ep1.mp4'), os.path.join(OUT, 'hotpot_ep1_720p.mp4')
    run('ffmpeg', '-y', '-i', joined, '-vf', f"ass={ap_}:fontsdir={A.fonts}", '-c:v', 'libx264', '-crf', '19', '-preset', 'slow',
        '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', out[0])
    run('ffmpeg', '-y', '-i', out[0], '-vf', 'scale=1280:720', '-c:v', 'libx264', '-crf', '24', '-preset', 'slow',
        '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', out[1])
    for o in out: print(o, os.path.getsize(o) // 1024, 'KB')


if __name__ == '__main__':
    main()
