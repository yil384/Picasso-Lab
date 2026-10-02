#!/usr/bin/env python3
"""X (Twitter) kit for @PicassoLabUCSD: the post texts below -> social/x/kit.html (copy buttons, character counts,
the images to attach), the images resized for X under social/x/media/, and a 1500x500 profile banner.

    python3 social/x/build.py --fonts DIR
Opened from GitHub Pages: https://yil384.github.io/Picasso-Lab/social/x/kit.html (noindex). The launch video is
made by reel.py. Post texts are English (the lab's audience); the instructions on the page are Chinese (the user's)."""
import argparse, html, os, re
from PIL import Image, ImageDraw, ImageFont, ImageOps, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
EV = os.path.join(HERE, '..', '..', 'events', 'static')
ap = argparse.ArgumentParser(); ap.add_argument('--fonts', default=os.path.join(HERE, 'fonts')); A = ap.parse_args()

# (id, when, title, [post, reply, ...], images (events/static paths) or a video, note)
POSTS = [
    ('00_launch', '近期唯一一条 · 发完置顶 (Pin)', 'Launch post: the paper wall', [
        'Hello, X! We are Picasso Lab at @UCSanDiego, led by Prof. Yufei Ding.\n\nPhysics x Computer Science x Math: '
        'we work on ML systems, computer architecture and quantum computing. 136 publications so far, 15 at ISCA and 15 at '
        'ASPLOS.\n\nWe are recruiting PhD students.',
        'Highlights: an ISCA 2026 Best Paper, best paper nominations at ISCA 2022 and DAC 2022, an OOPSLA 2020 '
        'Distinguished Paper, and two ASPLOS 2024 Distinguished Artifacts.\n\nAll papers: https://yufeiding.ucsd.edu/publications',
        'Projects and live demos: https://yufeiding.ucsd.edu/projects\n\nInterested in a PhD with us? Reply or reach out '
        'via the website.'],
     'out/picasso_keynote.mp4', '视频直接上传（4:5 竖版，44 秒）。主帖不放链接，链接放在回复里。发完立刻 Pin to profile。'),
    ('01_isca', '以后', 'ISCA 2026 Best Paper (with its own comic)', [
        'Our paper "Patterns behind Chaos: Forecasting Data Movement for Efficient Large-Scale MoE LLM Inference" won '
        'the Best Paper Award at #ISCA2026. A 16-second comic of the idea: expert choices look random, data movement '
        'chokes the system, and the patterns behind the chaos fix it.',
        '4 MoE models (200B-1000B), 24,000+ requests. Guided by the insights: 6.6x average speedup on wafer-scale GPUs, '
        'up to 1.25x on today\'s GPUs. Congrats to lead author Zhongkai Yu and coauthors at IU Bloomington, Columbia, '
        'Samsung and NVIDIA.\n\nhttps://arxiv.org/abs/2510.05497'],
     'out/patterns_comic.mp4', '链接放在回复里。最好请 Zhongkai 本人用自己账号 quote。'),
    ('02_lightstim', 'Day 4', 'LightStim grant', [
        'Xiang Fang received a @unitaryfund grant to keep building LightStim, an open-source framework for constructing '
        'and benchmarking quantum error correction protocols, with detectors and logical observables built '
        'automatically.\n\n#QuantumComputing #QEC',
        'Code: https://github.com/QuTone/LightStim'],
     ['lightstim_grant_0929/1-960.webp', 'lightstim_grant_0929/2-1280.webp', 'lightstim_grant_0929/3-960.webp'],
     '发之前确认 Unitary Foundation 的 X 账号（目前是 @unitaryfund）。'),
    ('04_hezi', 'Day 8', 'Dr. Hezi Zhang', [
        'Congratulations to Dr. Hezi Zhang on her PhD! Hezi joins UW-Madison ECE as an Assistant Professor this fall, '
        'and she is recruiting students.\n\nShe also welcomed a baby during her PhD while publishing top papers. '
        'We are so proud of you, Hezi.',
        'Hezi\'s homepage: https://www.hezizhang.com'],
     ['hezi_defense/1.jpg', 'hezi_defense/4.jpg', 'hezi_defense/2.jpg'],
     '如果 Hezi 有 X 账号，把名字换成 @她的账号；也可 @UWMadison / 她所在系的账号。'),
    ('05_welcome', 'Day 10', 'Welcome new members', [
        'Welcome to Xinwei, who just started a PhD with us, and to all our new interns and master\'s students!\n\n'
        'Prof. Ding hosted a big welcome lunch to kick off the year. Here is to a great one.'],
     ['firespot_welcome_0920/1.jpg', 'firespot_welcome_0920/3.jpg', 'firespot_welcome_0920/2.jpg'],
     '新同学有 X 账号的话直接 @，他们转发会带来第一批关注。'),
    ('06_amma', 'Day 12', 'AMMA at MICRO 2026', [
        'AMMA, by Zhongkai Yu, has been accepted to #MICRO2026. Zhongkai celebrated the only way he knows: buying '
        'everyone milk tea.\n\nPaper: https://arxiv.org/abs/2604.26103'],
     ['alon_sanjose0715/1.JPG'],
     '可以请 Zhongkai 补一句论文核心贡献，替换第二句。'),
    ('07_life', 'Day 14', 'Lab life, summer 2026', [
        'Lab life, summer 2026: a Saturday in San Francisco, hot pot with a face-changing show, a king crab feast, '
        'and a dinner in Cupertino with the Bay Area interns.\n\nGood research needs good food.'],
     ['sf_saturday_trip_0627/10.jpg', 'haidilao_0620/1.jpg', 'crab_day/5.jpg', 'picasso_party_0725/1.jpg'], ''),
    ('08_chang', '之后（Throwback）', 'Dr. Chang Chen', [
        'Throwback: this spring we welcomed Dr. Chang Chen to Picasso Lab. Chang is the first author of Centauri, '
        'winner of the ASPLOS 2024 Best Paper Award.\n\nFun fact: Chang was also the top Gaokao scorer in Wenzhou.'],
     ['firespot4.1/1.jpg'], ''),
    ('09_zheng', '之后（Throwback）', 'Dr. Zheng Wang', [
        'Throwback: congratulations again to Dr. Zheng Wang, who defended his thesis "Overcoming Input Irregularity: '
        'Balanced and Efficient System Designs for Large Scale Model Training."',
        'One of Zheng\'s papers, at OSDI 2025: https://www.usenix.org/conference/osdi25/presentation/wang-zheng'],
     ['zhengwang/3.jpg', 'zhengwang/1.jpg'], ''),
]


def xlen(s):
    """X's count: every URL is 23 characters"""
    return len(re.sub(r'https?://\S+', 'x' * 23, s))


def export(src, dst):
    im = ImageOps.exif_transpose(Image.open(os.path.join(EV, src))).convert('RGB')
    im.thumbnail((2048, 2048), Image.LANCZOS); im.save(dst, quality=87, optimize=True, progressive=True)


def banner(dst):
    """1500x500: the welcome group photo, no type (the profile name says it, and type would sit on faces); cropped
    with headroom so no head is cut. X puts the round avatar over the lower left: only legs there."""
    im = ImageOps.exif_transpose(Image.open(os.path.join(EV, 'firespot_welcome_0920/1.jpg'))).convert('RGB')
    s = 1500 / im.width; im = im.resize((1500, round(im.height * s)), Image.LANCZOS)
    y0 = int(im.height * 0.17); im = im.crop((0, y0, 1500, y0 + 500))
    # paint the restaurant's no-trespassing sign (top left) out: the plain green wall's colour per row (taken right of
    # the sign) plus its grain, keeping the head in front of the sign
    import cv2, numpy as np
    a = np.asarray(im).astype(np.float32)
    r = np.zeros((500, 1500), np.float32); cv2.rectangle(r, (0, 0), (214, 178), 1, -1)
    r = cv2.GaussianBlur(r, (0, 0), 7) * (cv2.GaussianBlur(r, (0, 0), 7) > 0.02); r[:150, :200] = 1
    h = np.ones((500, 1500), np.float32); cv2.ellipse(h, (140, 186), (52, 50), 0, 0, 360, 0, -1)
    m = (r * cv2.GaussianBlur(h, (0, 0), 1.2) * 255).astype(np.uint8)
    rows = np.median(a[:140, 215:340], axis=1); rows = np.concatenate([rows, np.repeat(rows[-1:], 60, 0)])[:, None]
    wall = a[0:95, 420:610]; grain = wall - cv2.GaussianBlur(wall, (0, 0), 6)
    fill = np.broadcast_to(rows, (200, 240, 3)) + np.tile(grain, (3, 2, 1))[:200, :240]
    mm = (m[:200, :240] / 255.0)[..., None]
    a[:200, :240] = a[:200, :240] * (1 - mm) + fill * mm
    im = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))
    im.save(dst, quality=90, optimize=True)


def main():
    os.makedirs(os.path.join(HERE, 'media'), exist_ok=True)
    banner(os.path.join(HERE, 'media', 'banner.jpg'))
    cards = []
    for pid, when, title, texts, media, note in POSTS:
        tw = []
        for k, t in enumerate(texts):
            n = xlen(t); assert n <= 280, (pid, k, n)
            tw.append(f'<div class="tw"><div class="th"><span>{"主帖" if k == 0 else f"回复 {k}（回复在自己上一条下面）"}</span>'
                      f'<span class="n">{n}/280</span><button data-c>复制</button></div><pre>{html.escape(t)}</pre></div>')
        if isinstance(media, str):
            m = f'<a class="vid" href="{media}" download>下载视频：{os.path.basename(media)}</a>'
        else:
            os.makedirs(os.path.join(HERE, 'media', pid), exist_ok=True); ims = []
            for i, src in enumerate(media):
                rel = f'media/{pid}/{i + 1}.jpg'; export(src, os.path.join(HERE, rel))
                ims.append(f'<a href="{rel}" download><img src="{rel}" alt="" loading="lazy"><span>{i + 1}</span></a>')
            m = '<div class="ims">' + ''.join(ims) + '</div>'
        cards.append(f'<section class="card"><div class="ch"><b>{html.escape(title)}</b><span>{html.escape(when)}</span></div>'
                     + ''.join(tw) + m + (f'<p class="note">{html.escape(note)}</p>' if note else '') + '</section>')
    page = TPL.replace('{{CARDS}}', '\n'.join(cards))
    open(os.path.join(HERE, 'kit.html'), 'w', encoding='utf-8').write(page)
    print('kit.html', len(POSTS), 'posts')


TPL = '''<!doctype html><html lang="zh"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>X Post Kit</title>
<style>
:root{--bg:#f6f3ef;--card:#fff;--ink:#1d1a18;--mute:#6f6760;--line:#e4ddd5;--acc:#c2541c;--pre:#faf8f5}
@media (prefers-color-scheme:dark){:root{--bg:#141110;--card:#1e1a18;--ink:#efe9e3;--mute:#a69c93;--line:#342d29;--acc:#f0a060;--pre:#181513}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.6 -apple-system,"Segoe UI",Roboto,"PingFang SC","Noto Sans SC",sans-serif}
main{max-width:860px;margin:0 auto;padding:28px 16px 80px}h1{font-size:26px;margin:0 0 4px}h2{font-size:18px;margin:34px 0 10px}
.sub{color:var(--mute);margin:0 0 18px}.guide{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:6px 20px}
.guide li{margin:6px 0}.card{background:var(--card);border:1px solid var(--line);border-radius:12px;padding:16px;margin:16px 0}
.ch{display:flex;justify-content:space-between;gap:10px;align-items:baseline;margin-bottom:10px}.ch span{color:var(--acc);font-size:13px;font-weight:600}
.tw{border:1px solid var(--line);border-radius:10px;margin:8px 0;overflow:hidden}.th{display:flex;gap:10px;align-items:center;padding:6px 10px;border-bottom:1px solid var(--line);font-size:13px;color:var(--mute)}
.th .n{margin-left:auto}button{font:inherit;font-size:13px;border:1px solid var(--line);background:var(--bg);color:var(--ink);border-radius:6px;padding:2px 10px;cursor:pointer}
button.ok{border-color:var(--acc);color:var(--acc)}pre{margin:0;padding:10px 12px;white-space:pre-wrap;word-wrap:break-word;font:inherit;background:var(--pre)}
.ims{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:10px}.ims a{position:relative;display:block}
.ims img{width:100%;aspect-ratio:1;object-fit:cover;border-radius:8px;display:block}.ims span{position:absolute;left:6px;top:6px;background:rgba(0,0,0,.6);color:#fff;font-size:12px;border-radius:4px;padding:0 6px}
.vid{display:inline-block;margin-top:10px;color:var(--acc);font-weight:600}.note{color:var(--mute);font-size:13.5px;margin:10px 0 0}
.top{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px}.top img,.top video{width:100%;border-radius:10px;display:block;border:1px solid var(--line)}
@media (max-width:600px){.ims{grid-template-columns:repeat(2,1fr)}.top{grid-template-columns:1fr}}
</style></head><body><main>
<h1>@PicassoLabUCSD 发帖工具包</h1><p class="sub">英文帖子文案可直接复制；图片点击即下载，按编号顺序上传。字数按 X 规则计算（链接算 23）。</p>
<div class="top"><div><b>首帖视频（3D 发布会风格，4:5，44 秒）</b><video src="out/picasso_keynote.mp4" controls muted playsinline poster="media/keynote_poster.jpg"></video><a class="vid" href="out/picasso_keynote.mp4" download>下载 picasso_keynote.mp4</a></div>
<div><b>主页头图（1500x500）</b><img src="media/banner.jpg" alt=""><a class="vid" href="media/banner.jpg" download>下载 banner.jpg</a>
<p class="note">Edit profile → Header 上传。头像建议用 lab logo；Bio 建议：<br>Picasso Lab @UCSanDiego, led by Prof. Yufei Ding. Systems for quantum computing, AI and computer architecture. Lab life: lots of hot pot.<br>Website 填 yufeiding.ucsd.edu</p></div></div>
<h2>第一条帖子怎么发才有流量</h2><ol class="guide">
<li><b>先把主页装修好再发</b>：头图、头像、Bio、网址。新访客会先看主页，没装修好的主页很少有人关注。</li>
<li><b>首帖 = 视频 + thread</b>：原生上传的视频会自动播放，曝光比纯文字、外链高很多。视频是静音自动播放的，所以画面里的大字已经把故事讲清楚了。</li>
<li><b>发的时间</b>：美国太平洋时间周二到周四早上 8-10 点（北京时间当晚 23 点到次日 1 点），美国和欧洲的学术圈都在线。</li>
<li><b>第一个小时最关键</b>：发之前在组里群里通知好，发出后 30 分钟内请 Yufei 老师和组员用个人号<b>引用转发（Quote）并写一句话</b>，再加上点赞和回复。X 的推荐算法很看重早期互动，回复和引用比点赞的权重高。</li>
<li><b>@ 合适的账号</b>：正文里的 @UCSanDiego，加上作者本人、合作方、会议和基金会，他们转发就能带来第一批精准关注。一条帖子 @ 不超过 2-3 个。</li>
<li><b>外链放回复里</b>：正文带外链会被降低推荐，所以论文和网站链接都放在第一条回复里。</li>
<li><b>节奏</b>：前两周每 2 天发一条（按下面的顺序），之后每周 2-3 条。成果帖和生活帖穿插着发，火锅短剧这类轻松内容放在周末。</li>
<li><b>平时多互动</b>：关注并回复领域里的大号（会议、同行实验室、相关研究者），在别人的热帖下面做有内容的回复，这是新账号涨粉最快的方法。</li>
<li><b>图片的 Alt text</b>：上传图片后点 "+Alt"，写一句描述，有利于无障碍访问和搜索。</li>
</ol>
<h2>帖子</h2><p class="sub">第一条是近期唯一要发的；后面几条留作以后的素材。</p>
{{CARDS}}
</main><script>
document.querySelectorAll('button[data-c]').forEach(b=>b.onclick=()=>{const t=b.closest('.tw').querySelector('pre').innerText;
navigator.clipboard.writeText(t).then(()=>{b.textContent='已复制';b.classList.add('ok');setTimeout(()=>{b.textContent='复制';b.classList.remove('ok')},1500)})});
</script></body></html>'''

if __name__ == '__main__':
    main()
