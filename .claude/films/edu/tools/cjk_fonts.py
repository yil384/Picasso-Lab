#!/usr/bin/python3
"""Fetch subset CJK web fonts for the characters used by the given files (Google Fonts css2 `text=` subsets, OFL).

    python3 .claude/films/edu/tools/cjk_fonts.py look/look.html [more files...]   ->  fonts/cjk.css + fonts/*.woff2

Families: Noto Serif SC (700, statements/titles), Noto Sans SC (500/700, captions), Long Cang (400, handwriting).
Subsets are for drafts and style frames; a final episode vendors full font files (see SERIES.md).
"""
import os, re, sys, urllib.parse, urllib.request

EDU = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
FAM = [('Noto Serif SC', '700'), ('Noto Sans SC', '500;700'), ('Long Cang', '400')]
UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36'


def get(url):
    """Fetch a URL. Returns (bytes, None) or (None, 'error')."""
    try:
        return urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': UA}), timeout=60).read(), None
    except Exception as e:  # network errors of any kind
        return None, f'{url[:80]}: {e}'


def fetch(files):
    """Subset fonts for the CJK characters in files. Returns (number of chars, None) or (None, 'error')."""
    chars = set()
    for f in files:
        try:
            chars |= {c for c in open(os.path.join(EDU, f), encoding='utf-8').read() if ord(c) > 0x2E7F}
        except OSError as e:
            return None, f'cannot read {f}: {e}'
    text = ''.join(sorted(chars)) + '0123456789'
    out = os.path.join(EDU, 'fonts'); os.makedirs(out, exist_ok=True)
    css_all = []
    for fam, w in FAM:
        q = f'family={urllib.parse.quote(fam)}:wght@{w}&text={urllib.parse.quote(text)}&display=block'
        css, err = get('https://fonts.googleapis.com/css2?' + q)
        if err:
            return None, err
        css = css.decode()
        for i, url in enumerate(re.findall(r'url\((https://[^)]+)\)', css)):
            name = f"{fam.lower().replace(' ', '-')}-{i}.woff2"
            data, err = get(url)
            if err:
                return None, err
            open(os.path.join(out, name), 'wb').write(data)
            css = css.replace(url, f'/edu/fonts/{name}')
        css_all.append(css)
    open(os.path.join(out, 'cjk.css'), 'w').write('\n'.join(css_all))
    return len(chars), None


def main():
    n, err = fetch(sys.argv[1:])
    if err:
        sys.exit(err)
    print(n, 'chars -> fonts/cjk.css')


if __name__ == '__main__':
    main()
