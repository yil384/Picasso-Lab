#!/usr/bin/env python3
"""Build blogs/sites-copy.html: the text to paste into Google Sites as native text boxes, so Google can index the
blog on yufeiding.ucsd.edu (the embed code itself is invisible to search: it runs in a sandboxed googleusercontent
frame). The page is noindex and only for copying. Re-run after adding or editing a post:  python3 blogs/sites_copy.py
"""
import html, os, re
from html.parser import HTMLParser

HERE = os.path.dirname(os.path.abspath(__file__))
GH = 'https://yil384.github.io/Picasso-Lab/blogs/'
SITE = 'https://yufeiding.ucsd.edu/blogs'

# newest first, like the list on the site. own=True: the lab's original post, whose full text goes on the Sites page;
# own=False: a mirror whose canonical is the author's site, so only a summary and a link (no duplicate content).
POSTS = [
    dict(slug='reconstructing-a-megakernel-with-pdl', own=False, tags='CUDA, GPU Systems, PDL, Megakernels',
         summary='How an 81-kernel CUDA Graph uses PDL to recover 97.4% of a persistent megakernel\'s end-to-end throughput on H100.'),
    dict(slug='nvidia-ising', own=True, tags='Quantum Error Correction, Neural Decoding, NVIDIA Ising, LDPC Codes', summary=None),
]

KEEP = {'h2', 'h3', 'p', 'li', 'figcaption'}
SKIP = {'pre', 'table', 'nav', 'script', 'style', 'svg', 'button'}
SKIP_CLASS = ('pipeline', 'code-block-wrap')
VOID = {'br', 'img', 'hr', 'input', 'meta', 'link', 'source', 'wbr'}


class Article(HTMLParser):
    """Collects the readable blocks of <article class="content-area"> in order: [(tag, text)]."""
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.inside = False; self.skip = None; self.cur = None; self.buf = []; self.blocks = []

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == 'article' and 'content-area' in (a.get('class') or ''):
            self.inside = True; return
        if not self.inside or tag in VOID:
            if tag == 'br' and self.cur and not self.skip:
                self.buf.append(' ')
            return
        if self.skip:   # inside a skipped element: only count nesting of its own tag
            if tag == self.skip[0]:
                self.skip[1] += 1
            return
        cls = a.get('class') or ''
        if tag in SKIP or any(c in cls for c in SKIP_CLASS):
            self.skip = [tag, 1]; return
        if tag in KEEP and self.cur is None:
            self.cur = tag; self.buf = []

    def handle_endtag(self, tag):
        if not self.inside:
            return
        if self.skip:
            if tag == self.skip[0]:
                self.skip[1] -= 1
                if not self.skip[1]:
                    self.skip = None
            return
        if tag == 'article':
            self.inside = False; return
        if tag == self.cur:
            t = re.sub(r'\s+', ' ', ''.join(self.buf)).strip()
            if t:
                self.blocks.append((self.cur, t))
            self.cur = None

    def handle_data(self, d):
        if self.inside and not self.skip and self.cur:
            self.buf.append(d)


def meta(src, key):
    m = re.search(r'(?:name|property)="%s" content="([^"]*)"' % re.escape(key), src)
    return html.unescape(m.group(1)) if m else ''


def load(p):
    src = open(os.path.join(HERE, p['slug'], 'index.html'), encoding='utf-8').read()
    title = html.unescape(re.sub(r'<[^>]+>', '', re.search(r'<h1[^>]*>(.*?)</h1>', src, re.S).group(1))).strip()
    bm = re.search(r'class="banner-meta"><strong>(.*?)</strong>.*?&middot;.*?&middot;\s*([^<]+)</div>', src, re.S)
    a = Article(); a.feed(src)
    blocks = [b for b in a.blocks]
    # drop the tail sections that do not read as prose on a Sites page
    out, cut = [], False
    for tag, t in blocks:
        if tag == 'h2':
            cut = t in ('Citation', 'AI Usage', 'Code and Artifacts')
        if not cut:
            out.append((tag, t))
    return dict(p, title=title, authors=html.unescape(bm.group(1)).strip(), date=bm.group(2).strip(),
                desc=meta(src, 'description'), canonical=re.search(r'rel="canonical" href="([^"]*)"', src).group(1),
                blocks=out, heads=[t for tag, t in out if tag == 'h2' and t != 'References'])


E = html.escape


def block(id_, label, how, inner):
    return f'''<section class="blk"><div class="bh"><div><b>{label}</b><span>{how}</span></div>
<button data-copy="{id_}">复制</button></div><div class="paste" id="{id_}">{inner}</div></section>'''


def main():
    posts = [load(p) for p in POSTS]
    S = []
    # 1. the /blogs list page: a short text section under the embed
    li = ''.join(f'<h3><a href="{SITE}/{p["slug"]}">{E(p["title"])}</a></h3>'
                 f'<p><em>{E(p["authors"])} &middot; {E(p["date"])}</em></p><p>{E(p["summary"] or p["desc"])}</p>' for p in posts)
    S.append(block('list', '/blogs 列表页', '放在 embed 下面的一个文本框里（Normal 文字即可，标题会自动带上 Heading 样式）',
                   '<h2>Research Blog</h2><p>Deep dives from Picasso Lab at UC San Diego (Prof. Yufei Ding) on ML systems, GPU kernels, '
                   'compilers, and quantum error correction.</p>' + li))
    for p in posts:
        k = p['slug']
        head = (f'<h1>{E(p["title"])}</h1><p><em>{E(p["authors"])} &middot; Picasso Lab, UC San Diego &middot; {E(p["date"])}</em></p>'
                f'<p><strong>Topics:</strong> {E(p["tags"])}</p><p>{E(p["desc"])}</p>')
        if p['own']:
            S.append(block(k + '-top', f'/blogs/{k} 子页面：页首', '子页面最上方的文本框', head))
            body = ''.join(f'<{t}>{E(x)}</{t}>' if t != 'li' else f'<ul><li>{E(x)}</li></ul>' for t, x in p['blocks'])
            body = body.replace('</ul><ul>', '')
            S.append(block(k + '-full', f'/blogs/{k} 子页面：全文', '放进一个 Collapsible text group（标题写 "Read the full text"），'
                           '或者直接放在 embed 下方', body))
        else:
            secs = ''.join(f'<li>{E(h)}</li>' for h in p['heads'])
            S.append(block(k + '-top', f'/blogs/{k} 子页面', '这篇是转载（原文在作者博客），只放摘要和目录，不放全文',
                           head + f'<p><strong>In this post:</strong></p><ul>{secs}</ul>'
                           f'<p>Originally published on the author\'s blog: <a href="{p["canonical"]}">{E(p["canonical"])}</a></p>'))
    steps = ''.join(f'<li><code>{SITE}/{p["slug"]}</code>：Embed &rarr; By URL &rarr; <code>{GH}{p["slug"]}/</code></li>' for p in posts)
    page = f'''<!doctype html><html lang="zh"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow"><title>Blog Text for Sites</title>
<style>
:root {{ --bg:#f6f7f9; --card:#fff; --ink:#1b1f24; --mut:#5d6672; --line:#e3e6ea; --acc:#1a5fd0; }}
@media (prefers-color-scheme: dark) {{ :root {{ --bg:#111418; --card:#1a1e24; --ink:#e8ebef; --mut:#9aa4b0; --line:#2b313a; --acc:#7fb0ff; }} }}
body {{ margin:0; background:var(--bg); color:var(--ink); font:15px/1.6 -apple-system, "Segoe UI", Roboto, "PingFang SC", sans-serif; }}
main {{ max-width:860px; margin:0 auto; padding:28px 16px 80px; }}
h1.t {{ font-size:24px; margin:0 0 6px; }} .lead {{ color:var(--mut); margin:0 0 22px; }}
ol.steps {{ background:var(--card); border:1px solid var(--line); border-radius:10px; padding:14px 18px 14px 36px; }}
code {{ font-size:13px; word-break:break-all; }}
.blk {{ background:var(--card); border:1px solid var(--line); border-radius:10px; margin:18px 0; overflow:hidden; }}
.bh {{ display:flex; gap:12px; justify-content:space-between; align-items:center; padding:12px 16px; border-bottom:1px solid var(--line); }}
.bh b {{ display:block; }} .bh span {{ color:var(--mut); font-size:13px; }}
button {{ flex:none; border:0; border-radius:8px; background:var(--acc); color:#fff; font:600 14px/1 inherit; padding:9px 16px; cursor:pointer; }}
.paste {{ padding:6px 18px 14px; max-height:420px; overflow:auto; }}
.paste h1 {{ font-size:22px; }} .paste h2 {{ font-size:19px; }} .paste h3 {{ font-size:16px; }}
</style></head><body><main>
<h1 class="t">Blog 文字（复制进 Google Sites）</h1>
<p class="lead">每块右上角点「复制」，到 Sites 的文本框里粘贴（会带着标题样式和链接）。这页设置了 noindex，只给你复制用。新增或修改文章后运行 <code>python3 blogs/sites_copy.py</code> 重新生成。</p>
<ol class="steps">
<li>在 Blogs 页面下新建子页面（页面名就是网址），右键 &rarr; Hide from navigation，导航栏不会变乱。</li>
{steps}
<li>embed 的高度拉到够读完全文；embed 上方或下方放这里复制的文字。</li>
<li>Publish 后在 Search Console 顶部输入子页面网址 &rarr; Request indexing；/blogs 也重新请求一次。</li>
</ol>
{"".join(S)}
</main><script>
document.querySelectorAll('button[data-copy]').forEach(function (b) {{ b.onclick = function () {{
  var el = document.getElementById(b.dataset.copy), done = function () {{ b.textContent = '已复制'; setTimeout(function () {{ b.textContent = '复制'; }}, 1600); }};
  try {{ navigator.clipboard.write([new ClipboardItem({{ 'text/html': new Blob([el.innerHTML], {{ type: 'text/html' }}), 'text/plain': new Blob([el.innerText], {{ type: 'text/plain' }}) }})]).then(done, fallback); }} catch (e) {{ fallback(); }}
  function fallback() {{ var r = document.createRange(); r.selectNodeContents(el); var s = getSelection(); s.removeAllRanges(); s.addRange(r); document.execCommand('copy'); s.removeAllRanges(); done(); }}
}}; }});
</script></body></html>'''
    open(os.path.join(HERE, 'sites-copy.html'), 'w', encoding='utf-8').write(page)
    for p in posts:
        print(p['slug'], '|', p['authors'], '|', p['date'], '|', len(p['blocks']), 'blocks')


if __name__ == '__main__':
    main()
