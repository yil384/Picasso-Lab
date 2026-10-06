#!/usr/bin/env python3
"""An episode's drawings: make them with the image tool (art/gen.sh), three at a time with retries; check each file;
pack them for the film; or write the fallback page of ready-to-paste prompts when the tool is out of quota.

    ~/miniforge3/bin/python3 .claude/films/edu/daily/art.py check   EPISODE_DIR/art.json
    ~/miniforge3/bin/python3 .claude/films/edu/daily/art.py gen     EPISODE_DIR/art.json [--jobs 3] [--tries 3]
    ~/miniforge3/bin/python3 .claude/films/edu/daily/art.py pack    EPISODE_DIR/art.json
    ~/miniforge3/bin/python3 .claude/films/edu/daily/art.py prompts EPISODE_DIR/art.json OUT.html [--drop DIR]

art.json (committed with the episode):
    {"episode": "L01-02", "drawings": [
      {"name": "line_tokenizer", "kind": "line", "group": "A", "sweep": "x", "people": true,
       "prompt": "what to draw, framing, image size (the style sentence is added here, not written in the prompt)",
       "refs": ["line_tiny_lab"], "refnote": "optional: what the reference images are"}]}
  kind: "line"  black ink on white (the L01-01 look) -> ink.py packs ink / paper / pen-time into art/cut/<name>.png
        "raw"   used as painted (watercolour swatches, tape): no packing, the film multiplies it from art/src
        "green" a sprite on #00FF00 -> art/key.py keys it into art/cut/<name>.png
  sweep: the order the pen draws strokes: "x" left first (landscape), "y" top first (portrait, square), "c" centre out.
  refs: names in art/src (default: three L01-01 drawings, for the style). people: adds "invented characters".

gen runs art/gen.sh for every drawing not yet in art/src (a file already there is never replaced or moved: it may be
drawn by hand; a failed check is only noted), at most --jobs at once, and checks each new
result (pure white ground, black lines, no grey or colour areas for "line"). A rejected file goes to
~/picasso-work/art/rejects and the drawing is tried again with a stricter sentence, up to --tries times. When the
tool says it is out of quota or not logged in, gen stops starting jobs and reports which drawings are missing:
then write the prompts page and build the film from what exists. Status: ~/picasso-work/art/<episode>.status.json.
Look at every accepted file at full size before using it: the checks here cannot see text, likenesses or wrong content.
"""
import argparse, base64, html, io, json, os, re, shutil, signal, subprocess, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
EDU = os.path.abspath(os.path.join(HERE, '..'))
ART = os.path.join(EDU, 'art')
WORK = os.path.expanduser('~/picasso-work/art')
STY = ('Style: a hand-drawn line illustration for a friendly science-explainer, black ink only on a pure white (#FFFFFF) '
       'background. Confident, clean, continuous pen lines of even medium-bold weight (like a 1.0 mm fineliner), '
       'slightly hand-made but tidy, every shape drawn with closed outlines; NO shading, NO hatching, NO grey tones, '
       'NO colour, NO fills, NO solid black areas, NO gradients, NO paper texture, NO text, NO letters, NO numbers, '
       'NO logos, NO border, NO frame, NO drop shadow. The background must be flat pure white everywhere. Everything '
       'in frame with a margin on every side, nothing cropped.')
GREEN = ('The background must be one flat, pure green (#00FF00) colour everywhere, with no shadow, gradient or floor '
         'line, and nothing else green in the picture.')
PEOPLE = 'These are invented characters, not likenesses of anyone.'
REFS = ['line_tiny_lab', 'line_chat_first', 'line_balance']
REFNOTE = ('The attached images are style references only (line drawings made earlier for this series, black ink on '
           'white): match their line weight, pen feel, simple round faces with dot eyes and level of detail exactly, '
           'but do not copy their content.')
STRICT = {'line': 'IMPORTANT, the last attempt was rejected: pure white background, black lines only, no grey, no '
                  'colour, no filled areas, no text.',
          'green': 'IMPORTANT, the last attempt was rejected: the background must be flat pure #00FF00 green.',
          'raw': ''}
STOP = re.compile(r'hit your usage limit|Quota exceeded|usage_limit_reached|rate_limit_reached|401 Unauthorized|'
                  r'Not logged in|insufficient_quota|command not found|No such file or directory', re.I)
CODEX = os.environ.get('CODEX') or shutil.which('codex') or \
    os.path.expanduser('~/.local/share/picasso-tools/node_modules/.bin/codex')
GEN = os.environ.get('ART_GEN', os.path.join(ART, 'gen.sh'))      # ART_GEN: a stand-in for tests
PACKER = [os.path.join(EDU, 'tools', 'ink.py'), os.path.join(EDU, 'episodes', 'hot-strata', 'bakeoff', 'line', 'ink.py')]


def load(path):
    """Returns (art dict, None) or (None, 'error')."""
    try:
        art = json.load(open(path))
    except (OSError, ValueError) as e:
        return None, f'cannot read {path}: {e}'
    names = [d.get('name', '') for d in art.get('drawings', [])]
    bad = [n for n in names if not re.fullmatch(r'[a-z0-9_]+', n)]
    if bad or len(set(names)) != len(names):
        return None, f'{path}: drawing names must be unique snake_case: {bad or names}'
    for d in art['drawings']:
        if d.get('kind', 'line') not in ('line', 'raw', 'green'):
            return None, f'{d["name"]}: kind must be line, raw or green'
    return art, None


def full_prompt(d, strict=False):
    """The description gen.sh receives (the style sentence is added here)."""
    kind = d.get('kind', 'line')
    p = d['prompt'].strip()
    if kind == 'line':
        p += ' ' + STY
    elif kind == 'green':
        p += ' ' + GREEN
    if d.get('people'):
        p += ' ' + PEOPLE
    if strict and STRICT[kind]:
        p += ' ' + STRICT[kind]
    return p


def refs_of(d):
    return [r if r.endswith('.png') else r + '.png' for r in d.get('refs', REFS if d.get('kind', 'line') == 'line' else [])]


def inspect(path, kind='line'):
    """Mechanical checks of a generated file. Returns ((w, h), None) or (None, 'why it is rejected')."""
    try:
        import numpy as np
        from PIL import Image
        im = Image.open(path)
        im.load()
    except Exception as e:  # not an image, truncated file
        return None, f'unreadable image: {e}'
    w, h = im.size
    if min(w, h) < 512:
        return None, f'too small ({w}x{h})'
    a = np.asarray(im.convert('RGBA')).astype(np.float32) / 255
    alpha = a[..., 3:]
    if kind == 'green':
        if alpha.min() < 0.98:
            return (w, h), None                    # a real cutout: key.py keeps its alpha
        rgb = a[..., :3]
        ring = np.concatenate([rgb[:8].reshape(-1, 3), rgb[-8:].reshape(-1, 3), rgb[:, :8].reshape(-1, 3),
                               rgb[:, -8:].reshape(-1, 3)])
        green = ((ring[:, 1] > 0.6) & (ring[:, 0] < 0.45) & (ring[:, 2] < 0.45)).mean()
        return ((w, h), None) if green > 0.8 else (None, f'background is not green ({green:.0%} of the border)')
    rgb = a[..., :3] * alpha + (1 - alpha)         # a transparent PNG is judged on white
    if kind == 'raw':
        return (w, h), None
    lum = rgb @ np.array([.2126, .7152, .0722], np.float32)
    sat = rgb.max(axis=2) - rgb.min(axis=2)
    ring = np.concatenate([lum[:8].ravel(), lum[-8:].ravel(), lum[:, :8].ravel(), lum[:, -8:].ravel()])
    if ring.mean() < 0.92:
        return None, f'background is not white (border luminance {ring.mean():.2f})'
    ink = (lum < 0.5).mean()
    grey = ((lum > 0.25) & (lum < 0.8)).mean()
    colour = ((sat > 0.25) & (lum < 0.92)).mean()
    if not 0.003 <= ink <= 0.3:
        return None, f'ink covers {ink:.1%} of the image (expected 0.3-30%)'
    if colour > 0.02:
        return None, f'{colour:.1%} of the image is coloured'
    if grey > max(0.08, 2.5 * ink):
        return None, f'too much grey ({grey:.1%}): shading or a tinted ground'
    return (w, h), None


def status_path(art):
    os.makedirs(WORK, exist_ok=True)
    return os.path.join(WORK, f'{art.get("episode", "episode")}.status.json')


def write_status(art, st):
    st['updated'] = time.strftime('%Y-%m-%d %H:%M:%S')
    with open(status_path(art), 'w') as f:
        json.dump(st, f, indent=1)


def check(art):
    """Which drawings exist and pass the checks. Returns ({name: 'ok' | 'missing' | 'rejected: why'}, None)."""
    out = {}
    for d in art['drawings']:
        p = os.path.join(ART, 'src', d['name'] + '.png')
        if not os.path.exists(p):
            out[d['name']] = 'missing'
            continue
        _, err = inspect(p, d.get('kind', 'line'))
        out[d['name']] = 'ok' if not err else 'rejected: ' + err
    return out, None


def tool_ready():
    """Is the image tool installed and logged in? Returns (True, None) or (None, 'why not'). ART_GEN (a test stand-in)
    skips the check."""
    if 'ART_GEN' in os.environ:
        return True, None
    if not os.path.exists(CODEX):
        return None, f'command not found: {CODEX}'
    try:
        r = subprocess.run([CODEX, 'login', 'status'], capture_output=True, text=True, timeout=60)
    except (OSError, subprocess.TimeoutExpired) as e:
        return None, f'{CODEX} login status: {e}'
    if r.returncode != 0:
        return None, 'Not logged in: ' + (r.stdout + r.stderr).strip()[-200:]
    return True, None


def gen(art, jobs=3, tries=3, timeout=900):
    """Make every missing drawing. Returns (status dict, None) or (None, 'error')."""
    missing = [r for r in refs_of_all(art) if not os.path.exists(os.path.join(ART, 'src', r))]
    if missing:
        return None, f'reference images missing from art/src: {missing}'
    st = {'episode': art.get('episode'), 'drawings': {}, 'stopped': None}
    ok, why = tool_ready()
    if not ok:
        st['stopped'] = why                       # nothing is started; the status says "tool stopped: ..."
    queue = []
    for d in art['drawings']:
        p = os.path.join(ART, 'src', d['name'] + '.png')
        if os.path.exists(p):                     # kept as it is (it may be drawn by hand): only flagged
            _, why = inspect(p, d.get('kind', 'line'))
            st['drawings'][d['name']] = {'state': 'ok', 'tries': 0,
                                         'note': 'already in art/src' + (f' (check: {why}; look at it)' if why else '')}
        else:
            st['drawings'][d['name']] = {'state': 'queued', 'tries': 0}
            queue.append(d)
    running = {}

    def stop(sig, _frame):                        # killed (the night's hard stop): take the image jobs with us
        for proc, _, _ in running.values():
            try:
                os.killpg(proc.pid, signal.SIGKILL)
            except (ProcessLookupError, PermissionError):
                pass
        sys.exit(128 + sig)
    for sg in (signal.SIGTERM, signal.SIGINT, signal.SIGHUP):
        signal.signal(sg, stop)
    write_status(art, st)
    while queue or running:
        while queue and len(running) < jobs and not st['stopped']:
            d = queue.pop(0)
            s = st['drawings'][d['name']]
            s['tries'] += 1
            env = dict(os.environ, SKIP_EXISTING='1', REFNOTE=d.get('refnote', REFNOTE), CODEX=CODEX)
            cmd = ['bash', GEN, d['name'], full_prompt(d, strict=s['tries'] > 1)] + \
                  ['src/' + r for r in refs_of(d)]
            running[d['name']] = (subprocess.Popen(cmd, cwd=ART, env=env, stdout=subprocess.DEVNULL,
                                                   stderr=subprocess.DEVNULL, start_new_session=True), time.time(), d)
            s['state'] = 'running'
            write_status(art, st)
        time.sleep(3)
        for name, (proc, t0, d) in list(running.items()):
            if proc.poll() is None and time.time() - t0 < timeout:
                continue
            if proc.poll() is None:
                os.killpg(proc.pid, signal.SIGTERM)
                proc.wait()
            del running[name]
            s = st['drawings'][name]
            src = os.path.join(ART, 'src', name + '.png')
            log = os.path.join(ART, 'logs', name + '.log')
            logtext = open(log, errors='replace').read() if os.path.exists(log) else ''
            if os.path.exists(src):
                size, why = inspect(src, d.get('kind', 'line'))
                if not why:
                    s.update(state='ok', size=list(size), seconds=round(time.time() - t0))
                    continue
                os.makedirs(os.path.join(WORK, 'rejects'), exist_ok=True)
                shutil.move(src, os.path.join(WORK, 'rejects', f'{name}.{s["tries"]}.png'))
                s['note'] = 'rejected: ' + why
            else:
                m = STOP.search(logtext)
                s['note'] = ('tool stopped: ' + m.group(0)) if m else ('no file (see art/logs/%s.log)' % name)
                if m:
                    st['stopped'] = m.group(0)
            if s['tries'] < tries and not st['stopped']:
                s['state'] = 'queued'
                queue.append(d)
            else:
                s['state'] = 'failed'
        if st['stopped'] and not running:
            for d in queue:
                s = st['drawings'][d['name']]
                s.update(state='not made', note='; '.join(x for x in (s.get('note'), 'tool stopped: ' + st['stopped']) if x))
            queue = []
        write_status(art, st)
    write_status(art, st)
    return st, None


def refs_of_all(art):
    return sorted({r for d in art['drawings'] for r in refs_of(d)})


def pack(art):
    """Pack the line drawings (ink.py) and key the green ones (key.py). Returns ({name: result}, None) or (None, err)."""
    packer = next((p for p in PACKER if os.path.exists(p)), None)
    if not packer:
        return None, 'no ink.py found'
    out = {}
    for d in art['drawings']:
        kind, name = d.get('kind', 'line'), d['name']
        if not os.path.exists(os.path.join(ART, 'src', name + '.png')):
            out[name] = 'missing'
            continue
        if kind == 'raw':
            out[name] = 'raw (used from art/src)'
            continue
        if kind == 'line':
            cmd = [sys.executable, packer, f'{name}:{d.get("sweep", "y")}' + ('' if d.get('fill', True) else ':0')]
        else:
            cmd = [sys.executable, os.path.join(ART, 'key.py'), name]
        r = subprocess.run(cmd, cwd=EDU, capture_output=True, text=True)
        out[name] = (r.stdout.strip() or r.stderr.strip())[-200:] if r.returncode == 0 else 'FAILED ' + r.stderr[-300:]
    return out, None


def thumb(name, h=300):
    """A small JPEG data URI of art/src/<name>.png for the prompts page."""
    from PIL import Image
    im = Image.open(os.path.join(ART, 'src', name)).convert('RGB')
    im.thumbnail((h * 2, h))
    buf = io.BytesIO()
    im.save(buf, 'JPEG', quality=82)
    return 'data:image/jpeg;base64,' + base64.b64encode(buf.getvalue()).decode()


def prompts_page(art, out, drop=None, only_missing=True):
    """The fallback page: one card per drawing, grouped into chats, with its reference images, the prompt and the
    file name to save as. Returns (path, None) or (None, 'error')."""
    rows = [d for d in art['drawings'] if not (only_missing and os.path.exists(os.path.join(ART, 'src', d['name'] + '.png')))]
    if not rows:
        return None, 'every drawing is already in art/src'
    groups = {}
    for d in rows:
        groups.setdefault(d.get('group', 'A'), []).append(d)
    drop = drop or os.path.join(ART, 'src')
    thumbs = {r: thumb(r) for r in refs_of_all({'drawings': rows})}
    cards, n = [], 0
    for g, ds in groups.items():
        cards.append(f'<h2>对话 {html.escape(g)} · {len(ds)} 张</h2>')
        for i, d in enumerate(ds):
            n += 1
            lead = 'Please generate ONE image.' if i == 0 else (
                'Please generate ONE more image. This is a NEW, SEPARATE image: keep only the line style of the '
                'earlier images in this chat; do not reuse their content or characters unless this prompt asks for them.')
            refs = refs_of(d)
            note = d.get('refnote', REFNOTE) if refs and i == 0 else ''
            text = ' '.join(x for x in (lead, full_prompt(d), note) if x)
            imgs = ''.join(f'<figure><img src="{thumbs[r]}" alt=""><figcaption>{html.escape(r)}</figcaption></figure>'
                           for r in refs) if i == 0 else ''
            attach = ('附图（拖进对话）：' + ', '.join(refs)) if (refs and i == 0) else '不用再附图'
            cards.append(f'''<section class="card"><div class="head"><span class="n">{n}</span>
<b>{html.escape(d["name"])}.png</b><span class="k">{html.escape(d.get("kind", "line"))}</span></div>
<p class="att">{html.escape(attach)}</p><div class="refs">{imgs}</div>
<pre id="p{n}">{html.escape(text)}</pre><button onclick="cp('p{n}', this)">复制提示词</button></section>''')
    page = f'''<!doctype html><html lang="zh"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>{html.escape(art.get("episode", ""))} art prompts</title><style>
:root{{--paper:#faf6ed;--ink:#1d1b18;--red:#d43828;--line:#d9d2c3}}
body{{margin:0;background:var(--paper);color:var(--ink);font:15px/1.55 -apple-system,"PingFang SC",sans-serif}}
main{{max-width:860px;margin:0 auto;padding:24px 16px 64px}} h1{{font-size:22px;margin:0 0 8px}}
h2{{font-size:17px;margin:32px 0 8px;border-bottom:2px solid var(--ink);padding-bottom:4px}}
.card{{background:#fff;border:1px solid var(--line);border-radius:8px;padding:14px;margin:12px 0}}
.head{{display:flex;gap:10px;align-items:baseline}} .n{{color:var(--red);font-weight:700}} .k{{color:#8a8172;font-size:13px}}
.att{{margin:6px 0;color:#5b544a;font-size:14px}} .refs{{display:flex;gap:8px;flex-wrap:wrap}}
figure{{margin:0}} img{{height:120px;border:1px solid var(--line)}} figcaption{{font-size:12px;color:#8a8172}}
pre{{white-space:pre-wrap;word-break:break-word;background:var(--paper);padding:10px;border-radius:6px;font-size:13px}}
button{{font:inherit;padding:6px 14px;border:1px solid var(--ink);background:var(--ink);color:#fff;border-radius:6px;cursor:pointer}}
code{{background:#efe8d8;padding:1px 4px;border-radius:4px}}</style></head><body><main>
<h1>{html.escape(art.get("episode", ""))} · 补图 {n} 张</h1>
<p>今晚出图工具没能画完这些图，片子先用已有的图和讲义页做了。请像上次 L01 补图那样在网页版出图对话里按分组生成：每组开一个新对话，按顺序发；
每组第一张把列出的参考图拖进去（参考图都在 <code>.claude/films/edu/art/src/</code>，下面有缩略图）。</p>
<p>下载后按卡片标题的文件名存到 <code>{html.escape(drop)}</code>。人物都是虚构的，不画任何真人（也不画丁老师）。
存好后开一个会话说“{html.escape(art.get("episode", ""))} 补图到了，重渲”：会检查、打包这些图并重新渲染这一集。
夜间运行<b>不会</b>自动重渲已经交付的一集（它只做下一集）。</p>
{"".join(cards)}</main><script>
function cp(id, b){{navigator.clipboard.writeText(document.getElementById(id).textContent).then(()=>{{b.textContent='已复制';setTimeout(()=>b.textContent='复制提示词',1500)}})}}
</script></body></html>'''
    try:
        os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
        with open(out, 'w') as f:
            f.write(page)
    except OSError as e:
        return None, str(e)
    return out, None


def main():
    ap = argparse.ArgumentParser(description='the episode drawings; see the module doc')
    ap.add_argument('cmd', choices=['check', 'gen', 'pack', 'prompts'])
    ap.add_argument('art_json')
    ap.add_argument('out', nargs='?')
    ap.add_argument('--jobs', type=int, default=3)
    ap.add_argument('--tries', type=int, default=3)
    ap.add_argument('--drop')
    ap.add_argument('--all', action='store_true', help='prompts: include drawings that already exist')
    a = ap.parse_args()
    art, err = load(a.art_json)
    if err:
        sys.exit(err)
    if a.cmd == 'check':
        res, err = check(art)
    elif a.cmd == 'gen':
        res, err = gen(art, a.jobs, a.tries)
    elif a.cmd == 'pack':
        res, err = pack(art)
    else:
        if not a.out:
            sys.exit('prompts needs OUT.html')
        res, err = prompts_page(art, a.out, a.drop, not a.all)
    if err:
        sys.exit(err)
    print(json.dumps(res, indent=1, ensure_ascii=False) if not isinstance(res, str) else res)
    if a.cmd == 'gen' and any(v['state'] != 'ok' for v in res['drawings'].values()):
        sys.exit(1)


if __name__ == '__main__':
    main()
