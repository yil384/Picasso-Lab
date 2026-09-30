"""Syntax-check the inline scripts of events/guandan.html and the standalone JS files: python3 parsecheck.py"""
import re, subprocess, sys, tempfile, os
root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', 'events'))
html = open(os.path.join(root, 'guandan.html'), encoding='utf8').read()
ok = True
for i, m in enumerate(re.finditer(r'<script(?: type="module")?>(.*?)</script>', html, re.S)):
    with tempfile.NamedTemporaryFile('w', suffix='.mjs', delete=False, encoding='utf8') as f:
        f.write(m.group(1))
    r = subprocess.run(['node', '--check', f.name], capture_output=True, text=True)
    os.unlink(f.name)
    if r.returncode:
        ok = False
        print(f'guandan.html script #{i}: SYNTAX ERROR\n{r.stderr[:600]}')
for js in ('static/guandan-records.js',):
    r = subprocess.run(['node', '--check', os.path.join(root, js)], capture_output=True, text=True)
    if r.returncode:
        ok = False
        print(js, 'SYNTAX ERROR', r.stderr[:400])
print('parse OK' if ok else 'parse FAILED')
sys.exit(0 if ok else 1)
