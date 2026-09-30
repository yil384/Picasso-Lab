import re, sys, glob, hashlib
files = sorted(f for f in glob.glob('/home/user/Picasso-Lab/people/*.html') if 'data-fx=' in open(f).read())
out = {}
for f in files:
    s = open(f).read()
    s = re.sub(r'^<!--[\s\S]*?-->\n', '<!--HEADER-->\n', s, count=1)
    s = re.sub(r'data-fx="[^"]*"', 'data-fx="X"', s)
    s = re.sub(r'aria-label="[^"]*"', 'aria-label="X"', s)
    s = re.sub(r'(<img class="avatar pfx-photo" src=")[^"]*"', r'\1X"', s)
    out[f] = s
    print(hashlib.sha1(s.encode()).hexdigest()[:12], f.split('/')[-1], len(s))
base = out[files[0]]
import difflib
for f, s in out.items():
    if s != base:
        print('DIFF', f); print(''.join(difflib.unified_diff(base.splitlines(1), s.splitlines(1))))
