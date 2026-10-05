#!/usr/bin/python3
"""Render a whole edu film: frames in parallel browser workers (tools/snap.py, JPEG), then an H.264 mp4 with audio.

    python3 .claude/films/edu/tools/film.py episodes/X/film.html --frames 2100 --out DIR [--workers 4]
        [--q lang=zh] [--audio mix.wav] [--mp4 out.mp4]

Frames land in DIR (keep it in the scratchpad); the mp4 is H.264 high, CRF 18, yuv420p, 30 fps, +faststart, AAC 192k
(a silent track when no audio is given, so every platform accepts it).
"""
import argparse, os, subprocess, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
FPS = 30


def frames(scene, n, out, workers=4, q=(), width=1080, height=1920):
    """Render frames 0..n-1 of scene into out as JPEG. Returns (frame pattern, None) or (None, 'error')."""
    os.makedirs(out, exist_ok=True)
    tag = '_'.join(x.replace('=', '') for x in q)
    pattern = os.path.join(out, 'f%05d' + ('_' + tag if tag else '') + '.jpg')
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
        procs.append((subprocess.Popen(cmd, stdout=log, stderr=subprocess.STDOUT), w))
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
    """Encode the frames (and audio) to mp4. Returns (mp4 path, None) or (None, 'error')."""
    cmd = ['ffmpeg', '-y', '-v', 'error', '-framerate', str(FPS), '-i', pattern]
    if audio:
        cmd += ['-i', audio]
    else:
        cmd += ['-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo']
    cmd += ['-frames:v', str(n), '-map', '0:v', '-map', '1:a', '-c:v', 'libx264', '-profile:v', 'high', '-crf', '18',
            '-preset', 'slow', '-pix_fmt', 'yuv420p', '-r', str(FPS), '-c:a', 'aac', '-b:a', '192k', '-ar', '48000',
            '-t', '%.3f' % (n / FPS), '-movflags', '+faststart', mp4]
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        return None, 'ffmpeg: ' + r.stderr[-800:]
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
