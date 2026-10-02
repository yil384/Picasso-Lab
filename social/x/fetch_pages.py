"""Fetch first pages of the lab's publications from arXiv (pages/NNN.jpg) for paperwall.py."""
import json, re, os, time, subprocess, urllib.parse, urllib.request, difflib
S=os.path.dirname(os.path.abspath(__file__))   # needs pubs.json (the site's publication list) next to it
P=json.load(open(f'{S}/pubs.json')); out=f'{S}/pages'
def get(url, binary=False):
    req=urllib.request.Request(url, headers={'User-Agent':'picasso-lab-site/1.0 (zhc086@ucsd.edu)'})
    with urllib.request.urlopen(req, timeout=60) as r: return r.read() if binary else r.read().decode('utf8','ignore')
norm=lambda s: re.sub(r'[^a-z0-9 ]','',s.lower())
for k,p in enumerate(P):
    dst=f'{out}/{k:03d}.jpg'
    if os.path.exists(dst) or os.path.exists(dst+'.none'): continue
    aid=None
    for l in p['links']:
        m=re.search(r'arxiv\.org/(?:abs|pdf)/([0-9.]+)',l)
        if m: aid=m.group(1)
    if not aid:
        q=urllib.parse.quote('ti:"%s"'%re.sub(r'[^A-Za-z0-9 \-]',' ',p['title'].split(':')[0] if len(p['title'].split(':')[0])>12 else p['title']))
        try:
            q=urllib.parse.quote_plus(re.sub(r'[^A-Za-z0-9 \-]',' ',p['title']))
            x=get(f'https://arxiv.org/search/?query={q}&searchtype=title'); time.sleep(4)
            for a_id,t in re.findall(r'(?s)arxiv\.org/abs/([0-9.]+)".*?<p class="title is-5 mathjax">\s*(.*?)\s*</p>',x):
                t=re.sub(r'<[^>]+>','',t)
                if difflib.SequenceMatcher(None,norm(t),norm(p['title'])).ratio()>0.85: aid=a_id; break
        except Exception as ex: print('q fail',k,ex,flush=True)
    if not aid: open(dst+'.none','w').close(); print(k,'none'); continue
    try:
        pdf=get(f'https://arxiv.org/pdf/{aid}',True); time.sleep(3)
        open(f'{out}/t.pdf','wb').write(pdf)
        subprocess.run(['pdftoppm','-f','1','-l','1','-r','90','-jpeg','-jpegopt','quality=82','-singlefile',f'{out}/t.pdf',dst[:-4]],check=True)
        os.remove(f'{out}/t.pdf'); print(k,aid,'ok',flush=True)
    except Exception as ex: print('pdf fail',k,aid,ex,flush=True)
