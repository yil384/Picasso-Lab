#!/usr/bin/env python3
"""Offline checks of a kit-lesson episode before it is rendered: the facts gate, her quotes, safe zones, times, length.

    ~/miniforge3/bin/python3 kit-lesson/lint.py EP [--lang en] [--post DELIVER/x_post.md] [--checks CLIPDIR/check.json]
                                                   [--no-page] [--json]

EP = a folder under episodes/ (as for lesson.html ?ep=) or a path. Exits 1 when there is an error; warnings are
printed and do not fail. Calibrated on the approved L01-01 (episodes/l01-01, 2026-10-06): the frame limits are the
extents that film uses, and its 11 warnings are deviations it was approved with (text in the rail, the cover's
underline). Its errors are real gaps the hand-made film had: "2017" is said but not in its FACTS.md, and six of its
seven clips (approved by ear) are "differ" or "asr-agree" under the two-recognizer check.

Errors
- facts: a number in strings.json, vo_lines.json or the post (digits, or number words: "thirteen", "forty-four",
  "two hundred"; "one" alone is skipped) that is not in the episode's FACTS.md (episode.json "facts");
- quotes: a caption (strings.<lang>.cap) that is not, letter for letter, the narration line it captions (vo_lines.json)
  or her clip's checked text (clips.json); a clip used in the timeline whose check.json verdict is not exact/near;
- assets: a drawing missing from art/cut; a clip used in the timeline without <ID>.wav in voice.clipDir;
- times: a bare-number time in episode.json ("at": 12.5; use "p3+0.4", "n2@word", "c3@50%", "n2.end");
  (with the page) an item that starts before its panel's camera arrives or after the next panel's;
- frame: a drawing's ink outside x 15-1065, y 340-1530 (the extents L01-01 uses: its cover runs to y 1510, its wide
  drawings to x 25-1055); a label or sans line whose anchor is above y 260 or below y 1480 (the platform's bars);
- length: runtime outside 4-10 min; narration over 160 words per minute; vo_<lang>.json stale against timeline.json.
Warnings
- text in the right rail (x 880-1080, y 700-1480: the like/comment buttons) or below y 1280 (the caption band), by
  an estimate of its width; panel 0 items with "at" (frame 0, the cover and the X thumbnail, will not show them);
  the first narration line ending after 5.5 s (the hook should land in the first 5 s); a caption part over 62 letters.
"""
import argparse, glob, json, os, re, sys

EDU = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
INK_BOX = (15, 340, 1065, 1530)
TEXT_Y = (260, 1480)
RAIL = (880, 700, 1080, 1480)
CAP_TOP = 1280
TIME_KEYS = ('at', 'out', 'until')

ONES = {w: i for i, w in enumerate('zero one two three four five six seven eight nine ten eleven twelve thirteen '
                                    'fourteen fifteen sixteen seventeen eighteen nineteen'.split())}
TENS = {w: 10 * (i + 2) for i, w in enumerate('twenty thirty forty fifty sixty seventy eighty ninety'.split())}
SCALE = {'hundred': 100, 'thousand': 1e3, 'million': 1e6, 'billion': 1e9, 'trillion': 1e12}
SUFFIX = {'k': 1e3, 'm': 1e6, 'b': 1e9, 't': 1e12, 'thousand': 1e3, 'million': 1e6, 'billion': 1e9, 'trillion': 1e12}


def en(v, lang):
    """The per-language value ({"en": a, "zh": b} -> a), as lesson.js byLang does."""
    if isinstance(v, dict) and v and set(v) <= {'en', 'zh'}:
        return en(v.get(lang, v.get('en')), lang)
    return v


def load_episode(ep, lang):
    """Returns ((dir, episode, timeline, strings, vo_lines, clips, vo), None) or (None, 'error')."""
    d = ep if os.path.isdir(ep) else os.path.join(EDU, 'episodes', ep)
    try:
        e = json.load(open(os.path.join(d, 'episode.json')))
        tl = json.load(open(os.path.join(d, e.get('timeline', 'timeline.json'))))
        st = json.load(open(os.path.join(d, e.get('strings', 'strings.json'))))
        st = st.get(lang) or st['en']
        v = e.get('voice') or {}
        lines = json.load(open(os.path.join(d, v.get('lines', 'vo_lines.json'))))
        cpath = os.path.join(d, v.get('clips', 'clips.json'))
        clips = json.load(open(cpath)) if os.path.exists(cpath) else []
    except (OSError, ValueError, KeyError) as x:
        return None, f'episode {ep}: {x}'
    vpath = os.path.join(d, f'vo_{lang}.json')
    vo = json.load(open(vpath)) if os.path.exists(vpath) else None
    return (d, e, tl, st, lines, clips, vo), None


# ------------------------------------------------------------------ numbers (digits and words) against FACTS.md
def numbers(text):
    """The numbers a text says, as floats (digits, digits with k/M/B/billion, number words). Returns (set, None)."""
    out = set()
    t = text.replace(' ', ' ').replace(' ', ' ')
    for m in re.finditer(r'(?<![\w.])(\d[\d,]*(?:\.\d+)?)\s*(k|m|b|t|thousand|million|billion|trillion)?(?![a-z])', t, re.I):
        try:
            v = float(m.group(1).replace(',', ''))
        except ValueError:
            continue
        out.add(round(v, 6))
        if m.group(2):
            out.add(round(v * SUFFIX[m.group(2).lower()], 6))
    words = re.findall(r"[a-z]+", t.lower().replace('-', ' '))
    i = 0
    while i < len(words):
        if words[i] in ONES or words[i] in TENS:
            total, cur, j = 0, 0, i
            while j < len(words) and (words[j] in ONES or words[j] in TENS or words[j] in SCALE or
                                      (words[j] == 'and' and j + 1 < len(words) and words[j + 1] in ONES)):
                w = words[j]
                if w in ONES:
                    cur += ONES[w]
                elif w in TENS:
                    cur += TENS[w]
                elif w == 'hundred':
                    cur = max(cur, 1) * 100
                elif w in SCALE:
                    total += max(cur, 1) * SCALE[w]
                    cur = 0
                j += 1
            val = total + cur
            if not (j == i + 1 and words[i] in ('one', 'zero')):     # "one idea", "zero" alone: not a claim
                out.add(round(float(val), 6))
            i = j
        else:
            i += 1
    return out, None


def facts_numbers(path):
    """Every number FACTS.md states. Returns (set, None) or (None, 'error')."""
    try:
        text = open(path).read()
    except OSError as x:
        return None, f'FACTS.md: {x}'
    nums, _ = numbers(text)
    return nums | {round(v * 100, 6) for v in nums if v < 1} | {round(v / 100, 6) for v in nums}, None


def strings_of(v, key=''):
    """(key, text) for every string in a strings tree."""
    if isinstance(v, str):
        yield key, v
    elif isinstance(v, list):
        for i, x in enumerate(v):
            yield from strings_of(x, f'{key}.{i}')
    elif isinstance(v, dict):
        for k, x in v.items():
            yield from strings_of(x, f'{key}.{k}' if key else k)


def norm(s):
    return re.sub(r'[^0-9a-z㐀-鿿]', '', s.lower())


# ------------------------------------------------------------------ geometry
def ink_box(src, xy, w):
    """The ink's box on the panel for a packed drawing (art/cut/<src>.png, ink in R) centred at xy, w wide.
    Returns ([x0, y0, x1, y1], None) or (None, 'error')."""
    try:
        import numpy as np
        from PIL import Image
        im = np.asarray(Image.open(os.path.join(EDU, 'art', 'cut', src + '.png')).convert('RGB'))
    except Exception as x:  # missing or unreadable file
        return None, f'art/cut/{src}.png: {x}'
    H, W = im.shape[:2]
    ys, xs = np.nonzero(im[..., 0] > 40)
    if not len(xs):
        return None, f'art/cut/{src}.png has no ink'
    s = w / W
    return [xy[0] + (xs.min() - W / 2) * s, xy[1] + (ys.min() - H / 2) * s,
            xy[0] + (xs.max() - W / 2) * s, xy[1] + (ys.max() - H / 2) * s], None


def text_box(xy, px, align, s):
    """A rough box of a lettered line (Caveat / Inter average 0.5 em per letter)."""
    w = max(len(r) for r in (s if isinstance(s, list) else [s])) * px * 0.5
    rows = len(s) if isinstance(s, list) else 1
    x0 = xy[0] if align == 'left' else xy[0] - w if align == 'right' else xy[0] - w / 2
    return [x0, xy[1] - px / 2, x0 + w, xy[1] + px / 2 + (rows - 1) * px * 1.1]


def lookup(st, key):
    v = st
    for p in str(key).split('.'):
        if isinstance(v, list) and p.isdigit() and int(p) < len(v):
            v = v[int(p)]
        elif isinstance(v, dict) and p in v:
            v = v[p]
        else:
            return None
    return v


def walk(items, path, off=(0, 0)):
    """Every item (groups opened; a group's numeric xy offsets its children) with its path."""
    for j, it in enumerate(items or []):
        yield f'{path}[{j}]{"#" + it["id"] if it.get("id") else ""} {it.get("t")}', it, off
        if it.get('items'):
            gx = it.get('xy') if isinstance(it.get('xy'), list) and all(isinstance(c, (int, float)) for c in it['xy']) else (0, 0)
            yield from walk(it['items'], f'{path}[{j}]', (off[0] + gx[0], off[1] + gx[1]))


def page_items(ep, lang):
    """Boot lesson.html and read the compiled panel arrivals and item times. Returns ({arrive, items}, None) or
    (None, 'error')."""
    sys.path.insert(0, os.path.join(EDU, 'tools'))
    try:
        import socketserver, threading
        import snap
        from playwright.sync_api import sync_playwright
        srv = socketserver.ThreadingTCPServer(('127.0.0.1', 0), snap.H)
        srv.daemon_threads = True
        threading.Thread(target=srv.serve_forever, daemon=True).start()
        url = f'http://127.0.0.1:{srv.server_address[1]}/edu/kit-lesson/lesson.html?ep={ep}&lang={lang}&render=1'
        with sync_playwright() as pw:
            b = pw.chromium.launch(channel='chromium', headless=True, args=['--use-angle=metal', '--enable-gpu'])
            page = b.new_page(viewport={'width': 600, 'height': 600})
            page.goto(url, wait_until='load')
            page.wait_for_function('() => window.__pv && (window.__pv.ready || window.__pv.error)', timeout=90000)
            err = page.evaluate('() => window.__pv.error')
            res = None if err else page.evaluate('() => ({arrive: __lesson.arrive, items: __lesson.items, missing: __lesson.missing})')
            b.close()
        srv.shutdown()
    except Exception as x:  # playwright or server errors
        return None, f'page: {type(x).__name__}: {x}'
    if err:
        return None, 'scene error: ' + str(err)
    return res, None


# ------------------------------------------------------------------ the lint
def lint(ep, lang='en', post=None, checks=None, page=True):
    """All checks. Returns ({'errors': [...], 'warnings': [...], 'stats': {...}}, None) or (None, 'error')."""
    got, err = load_episode(ep, lang)
    if err:
        return None, err
    d, e, tl, st, lines, clips, vo = got
    E, W = [], []
    used = [v['id'] for v in tl.get('vo', [])]
    vl = {v['id']: v.get(lang) or '' for v in lines}
    cl = {c['id'].lower(): c for c in clips}

    # the facts gate: numbers
    fpath = os.path.normpath(os.path.join(d, e.get('facts', 'FACTS.md')))
    fnums, ferr = facts_numbers(fpath)
    if ferr:
        E.append(ferr)
    else:
        texts = [(f'strings.{k}', s) for k, s in strings_of(st) if not k.startswith(('fine', 'end'))]
        texts += [(f'vo_lines.{i}', vl[i]) for i in used if i in vl]
        if post and os.path.exists(post):
            body = '\n'.join(x for x in open(post).read().splitlines() if not x.lstrip().startswith('#'))  # not headings
            texts += [(os.path.basename(post), body)]
        for where, s in texts:
            ns, _ = numbers(s)
            miss = sorted(n for n in ns if n not in fnums)
            if miss:
                E.append(f'facts: {where} says {", ".join(f"{n:g}" for n in miss)}, not in {os.path.relpath(fpath, EDU)}: "{s[:80]}"')

    # her quotes and the captions
    cap = st.get('cap') or {}
    for i in used:
        c = cap.get(i)
        if c is None:
            E.append(f'quotes: strings.{lang}.cap has no "{i}"')
            continue
        shown = norm(c.replace('|', ' ').replace('/', ' '))
        if i.startswith('c'):
            src = (cl.get(i) or {}).get('text')
            if src is None:
                E.append(f'quotes: {i} is in the timeline but {i.upper()} is not in clips.json')
            elif shown != norm(src):
                E.append(f'quotes: cap.{i} is not her checked words: "{c}" vs clips.json "{src}"')
        elif i in vl:
            if shown != norm(vl[i]):
                E.append(f'quotes: cap.{i} is not the narration: "{c}" vs vo_lines.json "{vl[i]}"')
        else:
            E.append(f'quotes: {i} is in the timeline but not in vo_lines.json')
        for p in c.split('|'):
            if len(p.replace('/', '')) > 62:
                W.append(f'caption {i}: a part of {len(p)} letters may not fit 2 rows: "{p[:40]}..."')
            if p.count('/') > 1:
                E.append(f'caption {i}: more than 2 rows: "{p}"')
    clipdir = os.path.expanduser(os.environ.get('CLIPDIR') or (e.get('voice') or {}).get('clipDir', ''))
    her = [i for i in used if i.startswith('c')]
    if her:
        cpath = checks or os.path.join(clipdir, 'check.json')
        try:
            ver = {r['id'].lower(): r['verdict'] for r in json.load(open(cpath))}
        except (OSError, ValueError) as x:
            ver = None
            E.append(f'quotes: no clip check ({cpath}: {x}); run daily/clips.py check')
        for i in her:
            if not os.path.exists(os.path.join(clipdir, i.upper() + '.wav')):
                E.append(f'assets: {i}: no {i.upper()}.wav in {clipdir}')
            if ver is not None and ver.get(i) not in ('exact', 'near'):
                E.append(f'quotes: {i} is "{ver.get(i, "not checked")}" in check.json (only exact or near may be shown)')

    # assets and geometry
    D = en((e.get('assets') or {}).get('drawings', {}), lang) or {}
    for k, v in D.items():
        if not os.path.exists(os.path.join(EDU, 'art', 'cut', v['src'] + '.png')):
            E.append(f'assets: drawing {k}: art/cut/{v["src"]}.png is missing (daily/art.py pack)')
    panels = en(e.get('panels', []), lang)

    def bare_times(v, where):
        if isinstance(v, dict):
            for k, x in v.items():
                if k in TIME_KEYS and isinstance(en(x, lang), (int, float)) and not isinstance(en(x, lang), bool):
                    E.append(f'times: {where}.{k} is a bare number ({en(x, lang)}); use a cue, voice or panel time')
                elif k in ('fadeIn', 'fadeOut') and isinstance(x, list) and any(isinstance(y, (int, float)) for y in x):
                    E.append(f'times: {where}.{k} has a bare number')
                else:
                    bare_times(x, f'{where}.{k}')
        elif isinstance(v, list):
            for j, x in enumerate(v):
                bare_times(x, f'{where}[{j}]')
    bare_times(e.get('panels', []), 'panels')

    for k, P in enumerate(panels):
        for where, it, off in walk(P.get('items'), f'p{k}'):
            it = {kk: en(vv, lang) for kk, vv in it.items()}
            if k == 0 and it.get('at') is not None:
                W.append(f'{where}: panel 0 item with "at" ({it["at"]}): frame 0 (the cover, the thumbnail) will not show it')
            xy = it.get('xy')
            num = isinstance(xy, list) and len(xy) == 2 and all(isinstance(c, (int, float)) for c in xy)
            if not num:
                continue
            xy = (xy[0] + off[0], xy[1] + off[1])
            if it.get('t') == 'draw' and it.get('d') in D:
                box, berr = ink_box(D[it['d']]['src'], xy, it.get('w') or D[it['d']].get('w'))
                if berr:
                    E.append(f'{where}: {berr}')
                elif box[0] < INK_BOX[0] or box[1] < INK_BOX[1] or box[2] > INK_BOX[2] or box[3] > INK_BOX[3]:
                    E.append(f'frame: {where} ink spans x {box[0]:.0f}-{box[2]:.0f}, y {box[1]:.0f}-{box[3]:.0f} '
                             f'(keep it inside x {INK_BOX[0]}-{INK_BOX[2]}, y {INK_BOX[1]}-{INK_BOX[3]})')
            if it.get('t') in ('label', 'sans') and it.get('text') is not None and off == (0, 0):
                s = lookup(st, it['text'])
                if s is None:
                    E.append(f'{where}: no string "{it["text"]}"')
                    continue
                if not TEXT_Y[0] <= xy[1] <= TEXT_Y[1]:
                    E.append(f'frame: {where} "{str(s)[:30]}" at y {xy[1]}: outside y {TEXT_Y[0]}-{TEXT_Y[1]} (platform bars)')
                b = text_box(xy, it.get('px') or 50, it.get('align', 'center'), s)
                if b[2] > RAIL[0] and b[3] > RAIL[1] and b[1] < RAIL[3]:
                    W.append(f'{where} "{str(s)[:30]}" reaches x {b[2]:.0f} at y {xy[1]}: the right rail (x 880-1080, y 700-1480)')
                if b[3] > CAP_TOP:
                    W.append(f'{where} "{str(s)[:30]}" reaches y {b[3]:.0f}: the caption band starts at {CAP_TOP}')

    # length, pace, voice timing
    dur = float(tl.get('dur', 0))
    words = sum(len(vl[i].split()) for i in used if i in vl)
    wpm = words / (dur / 60) if dur else 0
    if not 240 <= dur <= 600:
        E.append(f'length: {dur:.1f} s is outside 4-10 min')
    if wpm > 160:
        E.append(f'length: {words} narration words in {dur / 60:.2f} min = {wpm:.0f} per minute (at most 160)')
    if vo is None and used:
        E.append(f'timing: no vo_{lang}.json (kit-lesson/mix.py vo)')
    elif vo:
        for v in tl.get('vo', []):
            if v['id'] not in vo:
                E.append(f'timing: vo_{lang}.json has no {v["id"]} (rerun mix.py vo)')
            elif abs(vo[v['id']]['t'] - v['t']) > 0.01:
                E.append(f'timing: vo_{lang}.json is stale at {v["id"]} ({vo[v["id"]]["t"]} vs {v["t"]}): rerun mix.py vo')
        first = next((v for v in tl.get('vo', []) if v['id'].startswith('n')), None)
        if first and first['t'] > 1.0:
            W.append(f'hook: the first narration starts at {first["t"]} s (at most 1 s)')
        if first and first['id'] in vo and vo[first['id']]['t'] + vo[first['id']]['dur'] > 5.5:
            W.append(f'hook: the first narration ends at {vo[first["id"]]["t"] + vo[first["id"]]["dur"]:.1f} s; '
                     'the puzzle should be posed in the first 5 s')

    # with the page: compiled times against the camera
    stats = {'dur': dur, 'words': words, 'wpm': round(wpm), 'panels': len(panels), 'clips': len(her)}
    if page:
        res, perr = page_items(ep, lang)
        if perr:
            E.append(perr)
        else:
            ar = res['arrive']
            for k, items in enumerate(res['items']):
                lo = ar[k] - 0.05 if k else 0
                hi = ar[k + 1] if k + 1 < len(ar) else dur
                for j, it in enumerate(items):
                    if k and it['at'] is not None and not lo <= it['at'] < hi:
                        E.append(f'times: p{k}[{j}]{"#" + it["id"] if it.get("id") else ""} {it["t"]} starts at '
                                 f'{it["at"]:.2f} s, outside its panel ({ar[k]:.2f}-{hi:.2f} s)')
            if res.get('missing'):
                E.append('assets: placeholders for ' + ' '.join(res['missing']))
    return {'errors': E, 'warnings': W, 'stats': stats}, None


def main():
    ap = argparse.ArgumentParser(description='offline checks of a kit-lesson episode; see the module doc')
    ap.add_argument('ep')
    ap.add_argument('--lang', default='en')
    ap.add_argument('--post')
    ap.add_argument('--checks')
    ap.add_argument('--no-page', action='store_true')
    ap.add_argument('--json', action='store_true')
    a = ap.parse_args()
    res, err = lint(a.ep, a.lang, a.post, a.checks, not a.no_page)
    if err:
        sys.exit(err)
    if a.json:
        print(json.dumps(res, indent=1, ensure_ascii=False))
    else:
        for w in res['warnings']:
            print('warning:', w)
        for x in res['errors']:
            print('ERROR:', x)
        print(f'{len(res["errors"])} error(s), {len(res["warnings"])} warning(s); {res["stats"]}')
    sys.exit(1 if res['errors'] else 0)


if __name__ == '__main__':
    main()
