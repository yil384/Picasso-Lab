"""summarise fx4_reg.sh logs: per run console, after-off state, t0 / zoff diffs, worst overflow, tile-edge px (non-tilt)"""
import sys, re
rows = []
for f in sys.argv[1:]:
    cur = None
    for line in open(f):
        m = re.match(r'=== (\S+) (\S+)', line)
        if m: cur = {'s': m.group(1), 'c': m.group(2), 'ov': 0, 'ovf': '', 'edge': 0, 'con': None, 'off': None, 't0': None, 'zoff': None}; rows.append(cur); continue
        if cur is None: continue
        if line.startswith('console:'): cur['con'] = line.split(':', 1)[1].strip()
        if line.startswith('after off'): cur['off'] = line.split(':', 1)[1].strip()
        m = re.search(r'(t000|zoff) vs photo: mean ([\d.]+)', line)
        if m: cur['t0' if m.group(1) == 't000' else 'zoff'] = float(m.group(2))
        m = re.match(r'\s+(\S+)\s+overflow\s+([\d.]+) css px =\s+([\d.]+) logical.*tile-edge px (\d+)', line)
        if m:
            n, lo, e = m.group(1), float(m.group(3)), int(m.group(4))
            if lo > cur['ov']: cur['ov'], cur['ovf'] = lo, n
            if n != 'tilt': cur['edge'] = max(cur['edge'], e)
bad = 0
for r in rows:
    flag = []
    if r['con'] != '[]': flag.append('CONSOLE')
    if r['off'] != '[false,"","false"]': flag.append('OFF')
    if r['zoff'] is None or r['zoff'] > 0.005: flag.append('ZOFF')
    if r['ov'] > 8: flag.append('OVERFLOW')
    if r['edge']: flag.append('EDGE')
    bad += bool(flag)
    print(f"{r['s']:22s} {r['c']:5s} con {r['con']:3s} off {r['off']} t0 {r['t0']} zoff {r['zoff']} maxov {r['ov']:.1f}@{r['ovf']} edge {r['edge']} {' '.join(flag)}")
print(len(rows), 'runs,', bad, 'flagged')
