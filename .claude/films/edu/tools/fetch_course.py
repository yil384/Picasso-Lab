#!/usr/bin/python3
"""Download Prof. Ding's CSE 291P "LLM System Optimization" slide decks from the shared Drive folder and extract their
text, into .claude/films/edu/course/ (git-ignored: course material stays out of the public repo).

    python3 .claude/films/edu/tools/fetch_course.py            # PDFs + text (L01.pdf, L01.txt, ...)
    python3 .claude/films/edu/tools/fetch_course.py --videos   # also list the lecture recordings (not downloaded)

Needs pdftotext (poppler). Recordings are only for voice and anecdotes; every picture is rebuilt in code.
"""
import html, os, re, subprocess, sys, urllib.request

FOLDER = '12YyaIhRsSVn0mHIoWen1e9EPJbX-j3Yd'
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'course')
UA = {'User-Agent': 'Mozilla/5.0'}


def get(url):
    """Fetch a URL. Returns (bytes, None) or (None, 'error')."""
    try:
        return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=120).read(), None
    except Exception as e:  # network errors of any kind
        return None, f'{url[:80]}: {e}'


def fetch(videos=False):
    """Download the decks and extract their text. Returns (list of lecture names, None) or (None, 'error')."""
    os.makedirs(OUT, exist_ok=True)
    page, err = get(f'https://drive.google.com/embeddedfolderview?id={FOLDER}')
    if err:
        return None, err
    page = page.decode('utf-8', 'replace')
    items = re.findall(r'<a href="https://drive.google.com/file/d/([^/]+)/view[^"]*"[^>]*>.*?flip-entry-title">([^<]+)<', page, re.S)
    if not items:
        return None, 'no files found in the Drive folder (is it still shared?)'
    done = []
    for fid, name in items:
        name = html.unescape(name)
        m = re.search(r'Lecture (\d+)', name)
        if not m:
            continue
        n = int(m.group(1))
        if name.endswith('.pdf'):
            pdf = os.path.join(OUT, f'L{n:02d}.pdf')
            if not os.path.exists(pdf):
                data, err = get(f'https://drive.usercontent.google.com/download?id={fid}&export=download&confirm=t')
                if err:
                    return None, err
                open(pdf, 'wb').write(data)
            r = subprocess.run(['pdftotext', '-layout', pdf, pdf[:-4] + '.txt'])
            if r.returncode:
                return None, f'pdftotext failed on {pdf}'
            done.append(f'L{n:02d}  {name}')
        elif videos:
            done.append(f'L{n:02d}  {name}  https://drive.google.com/file/d/{fid}/view')
    return done, None


def main():
    done, err = fetch('--videos' in sys.argv)
    if err:
        sys.exit(err)
    print('\n'.join(done))


if __name__ == '__main__':
    main()
