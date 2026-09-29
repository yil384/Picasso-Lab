#!/usr/bin/env python3
"""Flag code that ended up after a // line comment (a statement appended to a commented line never runs).
Usage: tools/lint_comments.py [files...]  (default: the scene modules). Exit 1 if anything is flagged."""
import glob, re, sys
files = sys.argv[1:] or glob.glob('tg_*.js') + glob.glob('npr/*.js')
bad = 0
for f in files:
    for i, line in enumerate(open(f).read().split('\n'), 1):
        s = line.strip()
        if s.startswith('//') or s.startswith('*') or '//' not in line or 'http' in line:
            continue
        c = line[line.index('//') + 2:]
        pats = [r'\b(const|let|var)\s+\w+\s*=', r'\breturn\s+[\w\[({]', r'\b(if|for)\s*\(', r'\b[A-Za-z_][\w.\[\]]*\s*=\s*[^=>].*;', r'\)\s*;\s*($|\w[\w.]*\s*[=(.])']
        if any(re.search(p_, c) for p_ in pats):
            print(f'{f}:{i}: {c.strip()[:120]}'); bad += 1
sys.exit(1 if bad else 0)
