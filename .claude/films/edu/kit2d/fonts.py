#!/usr/bin/python3
"""Subset CJK web fonts for the Chinese strings in kit2d pages (Google Fonts css2 `text=` subsets, SIL OFL 1.1).

    python3 .claude/films/edu/kit2d/fonts.py kit2d/test.html [more files, relative to .claude/films/edu]

Writes kit2d/fonts/cjk2d.css + kit2d/fonts/*.woff2 (served as /edu/kit2d/fonts/...). Kept apart from the shared
fonts/cjk.css (tools/cjk_fonts.py), which subsets only the files it is given and would drop other scenes' characters.
Families: Noto Serif SC 900 (riso titles), Noto Sans SC 700 (labels), Long Cang 400 and ZCOOL KuaiLe 400 (handwriting).
"""
import os, re, sys, urllib.parse, urllib.request

EDU = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
OUT = os.path.join(EDU, 'kit2d', 'fonts')
FAM = [('Noto Serif SC', '900'), ('Noto Sans SC', '700'), ('Long Cang', '400'), ('ZCOOL KuaiLe', '400')]
UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36'


def get(url):
    """Fetch a URL. Returns (bytes, None) or (None, 'error')."""
    try:
        return urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': UA}), timeout=60).read(), None
    except Exception as e:  # network errors of any kind
        return None, f'{url[:80]}: {e}'


def fetch(files):
    """Subset the fonts for the CJK characters in files. Returns (number of chars, None) or (None, 'error')."""
    chars = set()
    for f in files:
        try:
            chars |= {c for c in open(os.path.join(EDU, f), encoding='utf-8').read() if ord(c) > 0x2E7F}
        except OSError as e:
            return None, f'cannot read {f}: {e}'
    text = ''.join(sorted(chars)) + '0123456789'
    os.makedirs(OUT, exist_ok=True)
    css_all = []
    for fam, w in FAM:
        q = f'family={urllib.parse.quote(fam)}:wght@{w}&text={urllib.parse.quote(text)}&display=block'
        css, err = get('https://fonts.googleapis.com/css2?' + q)
        if err:
            return None, err
        css = css.decode()
        for i, url in enumerate(re.findall(r'url\((https://[^)]+)\)', css)):
            name = f"{fam.lower().replace(' ', '-')}-{w}-{i}.woff2"
            data, err = get(url)
            if err:
                return None, err
            with open(os.path.join(OUT, name), 'wb') as fh:
                fh.write(data)
            css = css.replace(url, f'/edu/kit2d/fonts/{name}')
        css_all.append(css)
    with open(os.path.join(OUT, 'cjk2d.css'), 'w') as fh:
        fh.write('\n'.join(css_all))
    return len(chars), None


def main():
    n, err = fetch(sys.argv[1:] or ['kit2d/test.html'])
    if err:
        sys.exit(err)
    print(n, 'chars -> kit2d/fonts/cjk2d.css')


if __name__ == '__main__':
    main()
