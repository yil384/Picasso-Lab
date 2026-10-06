#!/usr/bin/python3
"""Render a whole edu film: frames in parallel browser workers (tools/snap.py, JPEG), then an H.264 mp4 with audio.

    python3 .claude/films/edu/tools/film.py episodes/X/film.html --frames 2100 --out DIR [--workers 4]
        [--q lang=zh] [--audio mix.wav] [--mp4 out.mp4]

Frames land in DIR (keep it in the scratchpad); the mp4 is H.264 high, CRF 18, yuv420p, 30 fps, +faststart, AAC 192k
(a silent track when no audio is given, so every platform accepts it).

Resumable: frames already in DIR are kept, but only while DIR/stamp[_<query>].txt matches what the frames were made from (the
scene's folder, the query, and for a kit-lesson ?ep= the episode's JSON, slides and the packed drawings in art/cut);
when any of these changed, the old frames are deleted first, so a resumed render never mixes two versions of a film.
The mp4 is encoded to DIR/encode.part.mp4, checked with ffprobe (duration = frames / 30 within 0.1 s) and only then
moved to --mp4, so a killed encode never leaves a half-written file where a finished one is expected.
Killing film.py (SIGTERM, SIGINT, SIGHUP) also kills its browser workers and ffmpeg.
"""
import argparse, glob, hashlib, json, os, re, shutil, signal, subprocess, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
EDU = os.path.abspath(os.path.join(HERE, '..'))
FPS = 30
CHILDREN = []          # Popen objects (each in its own session): killed with film.py


def _die(sig, _frame):
    for p in CHILDREN:
        try:
            os.killpg(p.pid, signal.SIGKILL)
        except (ProcessLookupError, PermissionError):
            pass
    sys.exit(128 + sig)


def stamp(scene, q):
    """A hash of everything the frames depend on. Returns (hex string, None)."""
    h = hashlib.sha256(json.dumps([scene, sorted(q)]).encode())
    paths = []
    sdir = os.path.dirname(os.path.join(EDU, scene))
    paths += sorted(glob.glob(os.path.join(sdir, '*.js')) + glob.glob(os.path.join(sdir, '*.html')))
    ep = next((x.split('=', 1)[1] for x in q if x.startswith('ep=')), None)
    if ep:
        d = os.path.join(EDU, ep) if '/' in ep else os.path.join(EDU, 'episodes', ep)
        paths += sorted(glob.glob(os.path.join(d, '*.json')) + glob.glob(os.path.join(d, 'slides', '*')))
        paths += sorted(glob.glob(os.path.join(EDU, 'art', 'cut', '*.png')))
    for p in paths:
        try:
            st = os.stat(p)
        except OSError:
            continue
        h.update(f'{p}\0{st.st_size}\0{st.st_mtime_ns}\0'.encode())
        if p.endswith('.json') or p.endswith('.js'):
            h.update(open(p, 'rb').read())
    return h.hexdigest()[:16], None


def frames(scene, n, out, workers=4, q=(), width=1080, height=1920):
    """Render frames 0..n-1 of scene into out as JPEG. Returns (frame pattern, None) or (None, 'error')."""
    os.makedirs(out, exist_ok=True)
    tag = '_'.join(x.replace('=', '').replace('/', '-') for x in q)
    pattern = os.path.join(out, 'f%05d' + ('_' + tag if tag else '') + '.jpg')
    sig, _ = stamp(scene, q)
    sfile = os.path.join(out, 'stamp' + ('_' + tag if tag else '') + '.txt')     # one per query (lang=en, lang=zh)
    old = open(sfile).read().strip() if os.path.exists(sfile) else None
    if old != sig:
        mine = re.compile(r'f\d{5}' + re.escape('_' + tag if tag else '') + r'\.jpg(\.part)?$')
        stale = [os.path.join(out, f) for f in os.listdir(out) if mine.fullmatch(f)]
        if stale:
            print('the scene changed since these frames were made (stamp %s -> %s): deleting %d old frames'
                  % (old, sig, len(stale)))
            for f in stale:
                os.remove(f)
        with open(sfile, 'w') as f:
            f.write(sig + '\n')
    todo = [i for i in range(n) if not os.path.exists(pattern % i)]   # resume: skip frames already on disk
    if not todo:
        return pattern, None
    lo, hi = todo[0], todo[-1] + 1
    step = -(-(hi - lo) // workers)
    procs = []
    for w in range(workers):
        a, b = lo + w * step, min(hi, lo + (w + 1) * step)
        if a >= b:
            continue
        cmd = [sys.executable, os.path.join(HERE, 'snap.py'), scene, '--range', f'{a}:{b}', '--fmt', 'jpg', '--out', out,
               '--width', str(width), '--height', str(height)] + sum((['--q', x] for x in q), [])
        log = open(os.path.join(out, f'worker{w}.log'), 'w')
        p = subprocess.Popen(cmd, stdout=log, stderr=subprocess.STDOUT, start_new_session=True)
        CHILDREN.append(p)
        procs.append((p, w))
    t0 = time.time()
    bad = []
    for p, w in procs:
        if p.wait() != 0:
            bad.append(w)
    if bad:
        return None, 'workers %s failed (see %s/worker*.log)' % (bad, out)
    missing = [i for i in range(n) if not os.path.exists(pattern % i)]
    if missing:
        return None, '%d frames missing, first %d' % (len(missing), missing[0])
    print('rendered %d frames in %.0f s' % (len(todo), time.time() - t0))
    return pattern, None


def encode(pattern, n, mp4, audio=None):
    """Encode the frames (and audio) to a part file next to the frames, check it, then move it to mp4.
    Returns (mp4 path, None) or (None, 'error')."""
    part = os.path.join(os.path.dirname(pattern), 'encode.part.mp4')
    cmd = ['ffmpeg', '-y', '-v', 'error', '-framerate', str(FPS), '-i', pattern]
    if audio:
        cmd += ['-i', audio]
    else:
        cmd += ['-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo']
    cmd += ['-frames:v', str(n), '-map', '0:v', '-map', '1:a', '-c:v', 'libx264', '-profile:v', 'high', '-crf', '18',
            '-preset', 'slow', '-pix_fmt', 'yuv420p', '-r', str(FPS), '-c:a', 'aac', '-b:a', '192k', '-ar', '48000',
            '-t', '%.3f' % (n / FPS), '-movflags', '+faststart', '-f', 'mp4', part]
    p = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, start_new_session=True)
    CHILDREN.append(p)
    _, errtext = p.communicate()
    if p.returncode != 0:
        return None, 'ffmpeg: ' + errtext[-800:]
    r = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', part],
                       capture_output=True, text=True)
    try:
        dur = float(r.stdout.strip())
    except ValueError:
        return None, 'ffprobe cannot read %s: %s' % (part, r.stderr[-300:])
    if abs(dur - n / FPS) > 0.1:
        return None, '%s is %.2f s, expected %.2f s (kept for a look)' % (part, dur, n / FPS)
    os.makedirs(os.path.dirname(os.path.abspath(mp4)) or '.', exist_ok=True)
    shutil.move(part, mp4)
    return mp4, None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('scene')
    ap.add_argument('--frames', type=int, required=True)
    ap.add_argument('--out', required=True)
    ap.add_argument('--workers', type=int, default=4)
    ap.add_argument('--q', action='append', default=[])
    ap.add_argument('--audio')
    ap.add_argument('--mp4')
    a = ap.parse_args()
    for sg in (signal.SIGTERM, signal.SIGINT, signal.SIGHUP):
        signal.signal(sg, _die)
    pattern, err = frames(a.scene, a.frames, a.out, a.workers, a.q)
    if err:
        sys.exit(err)
    if a.mp4:
        path, err = encode(pattern, a.frames, a.mp4, a.audio)
        if err:
            sys.exit(err)
        print(path)


if __name__ == '__main__':
    main()
