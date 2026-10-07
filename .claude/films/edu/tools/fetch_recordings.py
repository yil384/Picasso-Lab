#!/usr/bin/env python3
"""Download the CSE 291P lecture recordings from the course's shared Drive folder into course/LNN.mp4 (git-ignored:
recordings never go into the repo).

    ~/miniforge3/bin/python3 .claude/films/edu/tools/fetch_recordings.py L01 L02    # these lectures
    ~/miniforge3/bin/python3 .claude/films/edu/tools/fetch_recordings.py --all      # every recording in the folder
    ~/miniforge3/bin/python3 .claude/films/edu/tools/fetch_recordings.py --list     # list them, download nothing

Resumable (curl -C - into LNN.mp4.part), skips lectures already on disk, and checks that what arrived is an MP4 that
ffprobe can read: Drive answers virus-scan and quota pages as HTML with status 200. A lock per lecture keeps the
nightly run and a background batch from writing the same file at once (the second one waits, then skips).
The Drive folder has no Lecture 11 recording (deck only) and no Lecture 15 deck (recording only).
"""
import fcntl, html, os, re, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from fetch_course import FOLDER, get  # noqa: E402  (same Drive folder and fetcher as the decks)

OUT = os.path.abspath(os.path.join(HERE, '..', 'course'))
URL = 'https://drive.usercontent.google.com/download?id={}&export=download&confirm=t'
# Drive ids as of 2026-10-06, used only when the folder page cannot be read.
KNOWN = {'L01': '1gzYhZsAf4IDNTfkfuj4VJKz7e5Og4ZFu', 'L02': '1XTY6tvcEH5BI3Laa2fPC6o4C_nw-OjnJ',
         'L03': '1IuTN9xrW6eR-vVISCW6XMHYACZ4p1D3U', 'L04': '1CuXKsynwNRnn7bs1zQ77OiuWMBK5Vgz1',
         'L05': '121v8Gb2OMGhwBXEMIi3x0CEvKCGk8_UY', 'L06': '1SyNSymfwewvLDYiBzd08sU1akmeS8foL',
         'L07': '1k4PwhFVOk-DXG-GQHHciMcO5SFLN0d9m', 'L08': '1uo6JtnkQlvoNXFam6PI7MGhfplT-iv6z',
         'L09': '1rY4ayVpOoeq8VtCX2iVlMO4f5gwT8MGM', 'L10': '1tk4YQ6zyfoIEsH5YrgjqRJ3XzsznZkLp',
         'L12': '1uLAAR-BllMtzJ-MhbmouCwJopi3rlRm5', 'L13': '1YxWfKfvfIeir0GRXPoS6BOpYodIpEUea',
         'L14': '1NogrgLByydnj6lH7vS82ECxqmEN_7Qlj', 'L15': '1QMNvyP1APlDIxlaN4-vZ91RWYgpzyrLZ'}


def recordings():
    """The recordings in the Drive folder. Returns ({'L01': (drive id, name), ...}, None) or (None, 'error').
    Falls back to the ids known on 2026-10-06 when the folder page cannot be read."""
    page, err = get(f'https://drive.google.com/embeddedfolderview?id={FOLDER}')
    if err:
        return {k: (v, f'Lecture {int(k[1:])} (known id)') for k, v in KNOWN.items()}, None
    page = page.decode('utf-8', 'replace')
    items = re.findall(r'<a href="https://drive.google.com/file/d/([^/]+)/view[^"]*"[^>]*>.*?flip-entry-title">([^<]+)<',
                       page, re.S)
    found = {}
    for fid, name in items:
        name = html.unescape(name)
        m = re.search(r'Lecture (\d+)', name)
        if m and name.lower().endswith(('.mp4', '.mov', '.m4v')):
            found[f'L{int(m.group(1)):02d}'] = (fid, name)
    if not found:
        return {k: (v, f'Lecture {int(k[1:])} (known id)') for k, v in KNOWN.items()}, None
    return dict(sorted(found.items())), None


def probe(path):
    """Check that path is a readable MP4. Returns (duration in s, None) or (None, 'why not')."""
    try:
        with open(path, 'rb') as f:
            head = f.read(12)
    except OSError as e:
        return None, f'cannot read {path}: {e}'
    if head[4:8] != b'ftyp':
        return None, f'{os.path.basename(path)} is not an MP4 (Drive sent a web page: quota or scan warning?)'
    r = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path],
                       capture_output=True, text=True)
    try:
        dur = float(r.stdout.strip())
    except ValueError:
        return None, f'ffprobe cannot read {os.path.basename(path)} (incomplete download?)'
    if dur < 60:
        return None, f'{os.path.basename(path)} is only {dur:.0f} s long'
    return dur, None


def remote_size(fid):
    """Size of the Drive file from a one-byte range request. Returns (bytes, None) or (None, 'error')."""
    r = subprocess.run(['curl', '-sfL', '--retry', '3', '--connect-timeout', '30', '-r', '0-0', '-D', '-',
                        '-o', '/dev/null', URL.format(fid)], capture_output=True, text=True)
    sizes = re.findall(r'(?im)^content-range:\s*bytes\s+0-0/(\d+)', r.stdout)
    if r.returncode or not sizes:
        return None, f'no size from Drive (curl exit {r.returncode})'
    return int(sizes[-1]), None


def download(lec, fid):
    """Download one recording to course/LEC.mp4 (resumable, skips it if present).
    Returns ((path, 'skipped'|'downloaded', seconds), None) or (None, 'error')."""
    os.makedirs(os.path.join(OUT, '.locks'), exist_ok=True)
    dst = os.path.join(OUT, f'{lec}.mp4')
    part = dst + '.part'
    with open(os.path.join(OUT, '.locks', f'{lec}.fetch.lock'), 'w') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)          # wait for another process fetching the same lecture
        if os.path.exists(dst):                   # only ever renamed into place after a full, checked download
            dur, err = probe(dst)
            if not err:
                return (dst, 'skipped', dur), None
            os.replace(dst, part)                 # unreadable: try to finish it
        if os.path.exists(part):
            with open(part, 'rb') as f:
                if f.read(12)[4:8] != b'ftyp':    # an HTML page saved by an earlier attempt: start over
                    os.remove(part)
        total, err = remote_size(fid)
        if err:
            return None, f'{lec}: {err}'
        have = os.path.getsize(part) if os.path.exists(part) else 0
        if have > total:
            os.remove(part)
            have = 0
        if have < total:
            r = subprocess.run(['curl', '-fsSL', '--retry', '5', '--retry-delay', '5', '--connect-timeout', '30',
                                '-C', '-', '-o', part, URL.format(fid)], capture_output=True, text=True)
            have = os.path.getsize(part) if os.path.exists(part) else 0
            if have != total:
                return None, (f'{lec}: {have / 1e6:.1f} of {total / 1e6:.1f} MB after curl exit {r.returncode} '
                              f'{r.stderr.strip()[-200:]} (run again to resume)')
        dur, err = probe(part)
        if err:
            return None, f'{lec}: {err}'
        os.replace(part, dst)
        return (dst, 'downloaded', dur), None


def fetch(wanted=None):
    """Download the wanted lectures (None = all). Returns (list of report lines, None) or (None, 'error')."""
    recs, err = recordings()
    if err:
        return None, err
    lines, errors = [], []
    for lec in (wanted or list(recs)):
        if lec not in recs:
            errors.append(f'{lec}: no recording in the Drive folder')
            continue
        res, err = download(lec, recs[lec][0])
        if err:
            errors.append(err)
            continue
        path, how, dur = res
        lines.append(f'{lec}  {how:10s} {dur / 60:5.1f} min  {os.path.getsize(path) / 1e6:6.1f} MB  {path}')
    if errors:
        return None, '\n'.join(lines + ['ERROR ' + e for e in errors])
    return lines, None


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    if '--list' in sys.argv:
        recs, err = recordings()
        if err:
            sys.exit(err)
        for lec, (fid, name) in recs.items():
            have = 'on disk' if os.path.exists(os.path.join(OUT, f'{lec}.mp4')) else '-'
            print(f'{lec}  {have:8s} {fid}  {name}')
        return
    wanted = None if '--all' in sys.argv else [f'L{int(re.sub(r"\D", "", a)):02d}' for a in args]
    if wanted == []:
        sys.exit(__doc__)
    lines, err = fetch(wanted)
    if err:
        sys.exit(err)
    print('\n'.join(lines))


if __name__ == '__main__':
    main()
