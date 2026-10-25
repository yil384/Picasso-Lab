#!/usr/bin/env python3
"""Draw the library's missing pictures in the chatgpt.com web app, slowly, in a visible browser the owner can watch.
It does what the prompts pages ask a person to do: one chat per group, the reference images on the first message, the
same prompt text, one picture saved per card into ~/Downloads/edu-art-drop/<episode>/<name>.png.

    ~/miniforge3/bin/python3 .claude/films/edu/daily/web_art.py login            once: log in by hand, then close
    ~/miniforge3/bin/python3 .claude/films/edu/daily/web_art.py list [EP ...]    the queue, nothing sent
    ~/miniforge3/bin/python3 .claude/films/edu/daily/web_art.py run [EP ...] [--max N] [--gap 180-360]

EP is an episode folder name (l03-05); none = every episode with missing drawings, LLM first. A picture already in
the drop folder or the library is skipped, so a run can be stopped and started again. It stops at once on a usage-limit
message, a login page or anything it does not recognise (and says so); it never retries in a loop. No password is
handled here: the login stays in the browser profile (~/picasso-work/chatgpt-profile).
"""
import argparse, glob, json, os, random, re, shutil, sys, time
import art

PROFILE = os.path.expanduser('~/picasso-work/chatgpt-profile')
DROP = os.path.expanduser('~/Downloads/edu-art-drop')
LOG = os.path.expanduser('~/picasso-work/logs/web_art.log')
URL = 'https://chatgpt.com/'
LIMIT = re.compile(r"hit (?:the|your) (?:plan|usage|image|free)[a-z ]*limit|reached (?:our|your) limit|limit resets|"
                   r"too many (?:requests|images)|try again (?:later|in)|unusual activity|"
                   r"达到[^。\n]{0,20}(?:上限|限制)|使用上限|额度已用|请求过多|稍后再试|异常活动", re.I)
BOX = '#prompt-textarea, div[contenteditable="true"]'   # the composer (its id has come and gone)


def say(msg):
    line = f'{time.strftime("%Y-%m-%d %H:%M:%S")} {msg}'
    print(line, flush=True)
    os.makedirs(os.path.dirname(LOG), exist_ok=True)
    with open(LOG, 'a') as f:
        f.write(line + '\n')


def done_path(ep, name):
    """Where a picture is (drop folder first, then the library), or None."""
    p = os.path.join(DROP, ep, name + '.png')
    if os.path.exists(p):
        return p
    return art.ref_path(name + '.png')[0]


def queue(eps):
    """[(episode, group, [drawing, ...])] of drawings not made yet. Returns (list, None) or (None, 'error')."""
    if not eps:
        plans = sorted(glob.glob(os.path.join(art.EDU, 'episodes', '*', 'art.pre.json')),
                       key=lambda p: (not os.path.basename(os.path.dirname(p)).startswith('l'), p))
    else:
        plans = [os.path.join(art.EDU, 'episodes', e, 'art.pre.json') for e in eps]
    try:                                                 # published episodes need no new pictures
        shipped = {k.lower() for k, v in json.load(open(os.path.join(art.HERE, 'state.json')))['episodes'].items()
                   if v.get('status') == 'delivered'}
    except (OSError, ValueError, KeyError):
        shipped = set()
    out = []
    for p in plans:
        if os.path.basename(os.path.dirname(p)) in shipped:
            continue
        a, err = art.load(p)
        if err:
            return None, err
        ep = os.path.basename(os.path.dirname(p))
        groups = {}
        for d in a['drawings']:
            groups.setdefault(d.get('group', 'A'), []).append(d)
        for g, ds in groups.items():
            if any(not done_path(ep, d['name']) for d in ds):
                out.append((ep, g, ds))
    return out, None


def ref_file(ep, r):
    """A reference image: the drop folder of this episode (a drawing made earlier this run), else art.ref_path."""
    p = os.path.join(DROP, ep, r)
    return p if os.path.exists(p) else art.ref_path(r)[0]


def message(d, first):
    lead = 'Please generate ONE image.' if first else (
        'Please generate ONE more image. This is a NEW, SEPARATE image: keep only the line style of the earlier images '
        'in this chat; do not reuse their content or characters unless this prompt asks for them.')
    note = d.get('refnote', art.REFNOTE) if first and art.refs_of(d) else ''
    return ' '.join(x for x in (lead, art.full_prompt(d), note) if x)


def browser(pw):
    return pw.chromium.launch_persistent_context(PROFILE, channel='chrome', headless=False, viewport={'width': 1280,
                                                 'height': 900}, accept_downloads=True)


def page_problem(page):
    """A reason to stop (limit message, login page), or None."""
    if '/auth' in page.url or not page.locator(BOX).count():
        return 'not logged in (run: web_art.py login)'
    txt = page.locator('main').last.inner_text(timeout=5000) if page.locator('main').count() else ''
    m = LIMIT.search(txt[-3000:])
    return f'limit message: "{m.group(0)}"' if m else None


def generated(page):
    """The generated images in the conversation so far (their src)."""
    srcs = page.eval_on_selector_all('img[alt^="已生成图像"], img[alt^="Generated image"], img[alt*="enerated image"]',
                                     'els => els.filter(e => e.naturalWidth > 256).map(e => e.currentSrc || e.src)')
    return [s for s in dict.fromkeys(srcs) if s and not s.startswith('data:')]


def send(page, text, files):
    """Attach files, type the prompt, send. Returns (None, None) or (None, 'error')."""
    box = page.locator(BOX).first
    try:
        box.wait_for(timeout=30000)
    except Exception:
        return None, 'no prompt box on the page (layout changed?)'
    if files:
        inp = page.locator('input[type="file"]:not([capture])')
        imgs = [i for i in range(inp.count()) if 'image' in (inp.nth(i).get_attribute('accept') or '')]
        inp = inp.nth(imgs[0]) if imgs else inp.last
        if not inp.count():
            return None, 'no file input on the page (layout changed?)'
        inp.set_input_files(files)
        time.sleep(4 + 2 * len(files))                   # let the uploads finish before sending
    box.click()
    box.fill(text)
    time.sleep(random.uniform(1.5, 3.0))
    btn = page.locator('[data-testid="send-button"], button#composer-submit-button, button[aria-label="发送"], '
                       'button[aria-label="Send prompt"]')
    for _ in range(30):                                  # the button stays disabled while files upload
        if btn.count() and btn.first.is_enabled():
            break
        time.sleep(2)
    else:
        return None, 'the send button never became ready'
    btn.first.click()
    return None, None


def wait_image(page, before, timeout=900):
    """Wait for one new generated image. Returns (src, None) or (None, 'why')."""
    t0 = time.time()
    while time.time() - t0 < timeout:
        time.sleep(10)
        why = page_problem(page)
        if why:
            return None, why
        new = [s for s in generated(page) if s not in before]
        busy = page.locator('[data-testid="stop-button"], button[aria-label*="停止"], button[aria-label*="Stop"]').count()
        if new and not busy:
            time.sleep(5)                                # the final image replaces the preview
            new = [s for s in generated(page) if s not in before]
            return new[-1], None
    return None, f'no image after {timeout} s'


def save(page, src, path):
    """Read the image inside the page (its src is a blob: URL of this tab) and store it as PNG.
    Returns (path, None) or (None, why)."""
    import base64
    from io import BytesIO
    from PIL import Image
    try:
        b64 = page.evaluate('''async (u) => { const b = await (await fetch(u)).blob();
            return await new Promise(r => { const f = new FileReader(); f.onload = () => r(f.result.split(',')[1]);
            f.readAsDataURL(b); }); }''', src)
        im = Image.open(BytesIO(base64.b64decode(b64)))
        os.makedirs(os.path.dirname(path), exist_ok=True)
        im.convert('RGB').save(path)
    except Exception as e:
        return None, f'could not read the image: {e}'
    return path, None


def run(eps, max_n, gap):
    from playwright.sync_api import sync_playwright
    q, err = queue(eps)
    if err:
        return None, err
    made = 0
    with sync_playwright() as pw:
        ctx = browser(pw)
        page = ctx.pages[0] if ctx.pages else ctx.new_page()
        for ep, g, ds in q:
            page.goto(URL)                               # a new chat for each group
            time.sleep(random.uniform(4, 8))
            why = page_problem(page)
            if why:
                ctx.close()
                return made, why
            first = True
            for d in ds:
                out = os.path.join(DROP, ep, d['name'] + '.png')
                if done_path(ep, d['name']):
                    first = False                        # its style is in the chat only if made here; harmless
                    continue
                if made >= max_n:
                    ctx.close()
                    return made, None
                refs = art.refs_of(d) if first else []
                files = [ref_file(ep, r) for r in refs]
                if None in files:
                    say(f'{ep}/{d["name"]}: a reference is not made yet ({refs}); skipping it this run')
                    continue
                before = generated(page)
                say(f'{ep}/{d["name"]}: sending ({len(files)} refs)')
                _, err = send(page, message(d, first), files)
                if err:
                    ctx.close()
                    return made, f'{ep}/{d["name"]}: {err}'
                src, err = wait_image(page, before)
                if err:
                    ctx.close()
                    return made, f'{ep}/{d["name"]}: {err}'
                _, err = save(page, src, out)
                if err:
                    ctx.close()
                    return made, f'{ep}/{d["name"]}: {err}'
                shutil.copy(out, os.path.join(art.LIB, 'src', d['name'] + '.png'))   # into the library (pack later)
                made += 1
                first = False
                say(f'{ep}/{d["name"]}: saved {out} ({made} this run)')
                pause = random.uniform(*gap)
                say(f'waiting {pause / 60:.1f} min')
                time.sleep(pause)
        ctx.close()
    return made, None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('cmd', choices=['login', 'list', 'run'])
    ap.add_argument('eps', nargs='*')
    ap.add_argument('--max', type=int, default=10, help='pictures per run (default 10)')
    ap.add_argument('--gap', default='180-360', help='seconds between pictures, random in this range')
    a = ap.parse_args()
    if a.cmd == 'list':
        q, err = queue(a.eps)
        if err:
            sys.exit(err)
        n = 0
        for ep, g, ds in q:
            todo = [d['name'] for d in ds if not done_path(ep, d['name'])]
            n += len(todo)
            print(f'{ep} chat {g}: {", ".join(todo)}')
        print(f'{n} pictures to draw')
        return
    if a.cmd == 'login':
        from playwright.sync_api import sync_playwright
        with sync_playwright() as pw:
            ctx = browser(pw)
            page = ctx.pages[0] if ctx.pages else ctx.new_page()
            page.goto(URL)
            print('Log in to chatgpt.com in the window, then close the window.', flush=True)
            page.wait_for_event('close', timeout=0)
            ctx.close()
        return
    lo, hi = (float(x) for x in a.gap.split('-'))
    made, err = run(a.eps, a.max, (lo, hi))
    say(f'run ended: {made} made' + (f'; stopped: {err}' if err else ''))
    if err:
        sys.exit(1)


if __name__ == '__main__':
    main()
