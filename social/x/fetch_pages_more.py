"""Second source of real first pages for pages/NNN.jpg (after fetch_pages.py, which takes arXiv): the PDF links in
pubs.json and Prof. Ding's old UCSB publication folder (sites.cs.ucsb.edu/~yufeiding/publication/<venue><yy>.pdf).
A PDF is used only if its first-page text matches the paper's title. --dpi sets the render size (the film's heroes
want >= 1500 px wide).   usage: python3 fetch_pages_more.py [--dpi 150] [--only 111,89]"""
import argparse, difflib, json, os, re, subprocess, time, urllib.request

S = os.path.dirname(os.path.abspath(__file__))
P = json.load(open(f'{S}/pubs.json')); OUT = f'{S}/pages'
ap = argparse.ArgumentParser(); ap.add_argument('--dpi', type=int, default=150); ap.add_argument('--only'); ap.add_argument('--force', action='store_true')
A = ap.parse_args()
UCSB = 'https://sites.cs.ucsb.edu/~yufeiding/publication/'
norm = lambda s: re.sub(r'[^a-z0-9]+', ' ', s.lower()).strip()

def get(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'picasso-lab-site/1.0'})
    with urllib.request.urlopen(req, timeout=60) as r: return r.read()

def first_page_text(pdf):
    return subprocess.run(['pdftotext', '-f', '1', '-l', '1', '-layout', pdf, '-'], capture_output=True, text=True).stdout

def matches(title, text):
    t, x = norm(title), norm(text)[:1500]
    if t[:40] and t[:40] in x: return True
    head = norm(title.split(':')[0])
    return len(head) >= 5 and head in x[:400] and difflib.SequenceMatcher(None, t, x[:len(t) + 200]).ratio() > 0.3

def candidates(p):
    for l in p['links']:
        if re.search(r'\.pdf($|\?)|openreview\.net/pdf|/pdf/', l) and 'dl.acm.org' not in l and 'arxiv' not in l: yield l
    tag = p['tags'][0]
    m = re.match(r"\s*([A-Za-z]+)\s*'?\s*(\d\d)", tag)
    if m:
        v, yy = m.group(1).lower(), m.group(2)
        for suf in ('', 'a', 'b', 'c', '_1', '_2', '-1', '-2'): yield f'{UCSB}{v}{yy}{suf}.pdf'

only = set(map(int, A.only.split(','))) if A.only else None
tmp = f'{OUT}/_t.pdf'
for k, p in enumerate(P):
    if only is not None and k not in only: continue
    dst = f'{OUT}/{k:03d}.jpg'
    if os.path.exists(dst) and not A.force: continue
    ok = False
    for url in candidates(p):
        try:
            data = get(url); time.sleep(1)
        except Exception:
            continue
        if not data.startswith(b'%PDF'): continue
        open(tmp, 'wb').write(data)
        if not matches(p['title'], first_page_text(tmp)): continue
        subprocess.run(['pdftoppm', '-f', '1', '-l', '1', '-r', str(A.dpi), '-jpeg', '-jpegopt', 'quality=88', '-singlefile', tmp, dst[:-4]], check=True)
        print(k, 'ok', url, flush=True); ok = True; break
    if not ok: print(k, 'none', p['tags'][0], p['title'][:60], flush=True)
if os.path.exists(tmp): os.remove(tmp)
