#!/usr/bin/env python3
"""Transcribe CSE 291P lecture recordings with word times, and find when each slide is on screen.

    ~/miniforge3/bin/python3 .claude/films/edu/tools/transcribe.py L01 L02          # these lectures
    ~/miniforge3/bin/python3 .claude/films/edu/tools/transcribe.py --all            # every course/LNN.mp4 on disk
        [--force] [--slides-only] [--model HF_REPO]

Writes into course/ (git-ignored; never commit these):
  LNN.words.json       {"lecture", "model", "duration", "made", "words": [[start, end, word, prob], ...],
                        "segments": [[start, end, text], ...]}   times in seconds of the recording
  LNN.slides.json      {"lecture", "pdf", "step", "segments": [{"slide", "start", "end", "score"}],
                        "slides": {"12": {"first", "last", "total"}}}   which PDF page is on screen when
  LNN.transcript.md    readable: "=== mm:ss slide N ===" where the slide changes, "[mm:ss] text" per segment,
                        word(?) where the word probability is under 0.5

Machine transcription of accented speech: quotes for the films are re-checked by a second pass on the clip window
(see daily/PROMPT.md). The slide timing compares 64x36 grey thumbnails of the video (one every 2 s) with the deck's
pages (L01's deck is letter-size with the slide letterboxed; the band is cropped). It needs course/LNN.pdf; without it
only the words are written. A lock per lecture lets a background batch and the nightly run share the work: the second
caller waits, then finds the files and skips. The audio goes through the recognizer in 5-minute chunks cut at pauses
(memory stays near 2 GB; finished chunks are cached in ~/picasso-work/cache/asr, so a killed run resumes). On this M1
with low power mode on, an 80-minute lecture takes about 35 min (2.2 min per 5-min chunk).
"""
import argparse, fcntl, glob, json, os, re, shutil, subprocess, sys, tempfile, time

HERE = os.path.dirname(os.path.abspath(__file__))
COURSE = os.path.abspath(os.path.join(HERE, '..', 'course'))
WORK = os.path.expanduser('~/picasso-work/cache/audio')
MODEL = 'mlx-community/whisper-large-v3-turbo'
TW, TH, STEP = 64, 36, 2.0
CHUNK = 300.0                                  # seconds of audio per recognizer pass


def mmss(t):
    return f'{int(t // 60):02d}:{int(t % 60):02d}'


def extract_audio(mp4, wav):
    """16 kHz mono PCM for the recognizer. Returns (wav, None) or (None, 'error')."""
    os.makedirs(os.path.dirname(wav), exist_ok=True)
    r = subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-i', mp4, '-vn', '-ac', '1', '-ar', '16000',
                        '-c:a', 'pcm_s16le', wav], capture_output=True, text=True)
    if r.returncode:
        return None, 'ffmpeg: ' + r.stderr[-400:]
    return wav, None


def cut_points(audio, sr=16000, chunk=CHUNK, search=20.0):
    """Chunk boundaries (samples) near every `chunk` seconds, each moved to the quietest 0.5 s within +-search s, so
    no word is cut in two. Returns a list [0, b1, ..., len(audio)]."""
    import numpy as np
    hop = sr // 10                                           # 0.1 s energy frames
    n = len(audio) // hop
    rms = np.sqrt(np.mean(audio[:n * hop].reshape(n, hop) ** 2, axis=1) + 1e-12)
    win = np.convolve(rms, np.ones(5) / 5, mode='same')       # 0.5 s smoothing
    pts, t = [0], chunk
    while t < len(audio) / sr - chunk * 0.25:
        lo, hi = int((t - search) * 10), int((t + search) * 10)
        k = lo + int(np.argmin(win[lo:hi]))
        pts.append(k * hop)
        t = k / 10 + chunk
    return pts + [len(audio)]


def recognize(wav, model=MODEL, cache=None):
    """Word-timed transcription in chunks of about CHUNK s cut at pauses (one 80-min pass needs over 10 GB on this
    Mac and swaps; a 5-min chunk peaks near 2 GB). Each finished chunk is kept in `cache` (a folder), so an interrupted
    run resumes. Returns ({'words': [...], 'segments': [...]}, None) or (None, 'error')."""
    try:
        import numpy as np
        import mlx.core as mx
        import mlx_whisper
        from mlx_whisper.audio import load_audio
        audio = np.array(load_audio(wav), dtype=np.float32)
    except Exception as e:  # missing packages, ffmpeg errors
        return None, f'recognizer setup failed: {type(e).__name__}: {e}'
    sr = 16000
    pts = cut_points(audio, sr)
    if cache:
        os.makedirs(cache, exist_ok=True)
    words, segs = [], []
    for i, (a, b) in enumerate(zip(pts[:-1], pts[1:])):
        cf = os.path.join(cache, f'{i:03d}_{a}_{b}.json') if cache else None
        if cf and os.path.exists(cf):
            part = json.load(open(cf))
        else:
            try:
                r = mlx_whisper.transcribe(audio[a:b], path_or_hf_repo=model, word_timestamps=True, language='en',
                                           condition_on_previous_text=False, hallucination_silence_threshold=2.0,
                                           verbose=None)
            except Exception as e:  # model load, Metal or audio errors
                return None, f'recognizer failed on chunk {i} ({a / sr:.0f}-{b / sr:.0f} s): {type(e).__name__}: {e}'
            off = a / sr
            part = {'segments': [[round(s['start'] + off, 2), round(s['end'] + off, 2), s['text'].strip()]
                                 for s in r.get('segments', [])],
                    'words': [[round(w['start'] + off, 2), round(w['end'] + off, 2), w['word'],
                               round(w.get('probability', 1.0), 3)]
                              for s in r.get('segments', []) for w in s.get('words', [])]}
            if cf:
                with open(cf, 'w') as f:
                    json.dump(part, f)
            mx.clear_cache()
            print(f'  chunk {i + 1}/{len(pts) - 1}  {mmss(a / sr)}-{mmss(b / sr)}  {len(part["words"])} words  '
                  f'peak {mx.get_peak_memory() / 1e9:.1f} GB', flush=True)
        words += part['words']
        segs += part['segments']
    segs, words, dropped = drop_hallucinations(segs, words)
    if not words:
        return None, 'no words recognized'
    if dropped:
        print(f'  dropped {dropped} stock phrases heard in silence ("Thank you." and the like)', flush=True)
    return {'words': words, 'segments': segs}, None


STOCK = {'thank you', 'thanks', 'thank you very much', 'thanks for watching', 'thank you for watching', 'you', 'bye',
         'okay', 'so', 'uh', 'um', 'hmm'}


def drop_hallucinations(segs, words, gap=8.0):
    """The recognizer fills long silences with stock phrases ("Thank you." every 30 s before a lecture starts).
    Drops a segment whose whole text is such a phrase when nothing else is said within `gap` s on either side, with
    its words. Returns (segments, words, number dropped)."""
    bad = []
    for i, (s0, s1, text) in enumerate(segs):
        t = re.sub(r'[^a-z ]', '', text.lower()).strip()
        prev_end = segs[i - 1][1] if i else -1e9
        next_start = segs[i + 1][0] if i + 1 < len(segs) else 1e9
        if t in STOCK and s0 - prev_end >= gap and next_start - s1 >= gap:
            bad.append((s0, s1))
    if not bad:
        return segs, words, 0
    keep = [s for s in segs if (s[0], s[1]) not in set(bad)]
    kw = [w for w in words if not any(a - 0.05 <= w[0] <= b + 0.05 for a, b in bad)]
    return keep, kw, len(bad)


def _norm(a):
    import numpy as np
    a = a.reshape(len(a), -1).astype(np.float32)
    a -= a.mean(axis=1, keepdims=True)
    n = np.linalg.norm(a, axis=1, keepdims=True)
    return a / np.maximum(n, 1e-6)


def page_thumbs(pdf):
    """Grey 64x36 thumbnails of every page, cropped to the 16:9 slide. Returns (array P x 36 x 64, None) or (None, err)."""
    import numpy as np, cv2
    tmp = tempfile.mkdtemp(dir=os.path.expanduser('~/picasso-work/cache'))
    try:
        r = subprocess.run(['pdftoppm', '-r', '30', '-gray', '-png', pdf, os.path.join(tmp, 'p')],
                           capture_output=True, text=True)
        if r.returncode:
            return None, 'pdftoppm: ' + r.stderr[-300:]
        files = sorted(glob.glob(os.path.join(tmp, 'p-*.png')), key=lambda f: int(re.findall(r'-(\d+)\.png$', f)[0]))
        out = []
        for f in files:
            im = cv2.imread(f, cv2.IMREAD_GRAYSCALE)
            h, w = im.shape
            if w / h < 1.6:                       # letter page with the 16:9 slide in the middle
                bh = int(round(w * 9 / 16))
                y0 = (h - bh) // 2
                im = im[y0:y0 + bh]
            out.append(cv2.GaussianBlur(cv2.resize(im, (TW, TH), interpolation=cv2.INTER_AREA), (3, 3), 0))
        if not out:
            return None, f'no pages rendered from {pdf}'
        return np.stack(out), None
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


def video_thumbs(mp4):
    """Grey 64x36 thumbnails, one every STEP seconds. Returns (array F x 36 x 64, None) or (None, 'error')."""
    import numpy as np, cv2
    r = subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-i', mp4, '-an', '-vf',
                        f'fps=1/{STEP},scale={TW}:{TH}:flags=area,format=gray', '-f', 'rawvideo', '-'],
                       capture_output=True)
    if r.returncode or not r.stdout:
        return None, 'ffmpeg thumbnails: ' + r.stderr.decode('utf-8', 'replace')[-300:]
    a = np.frombuffer(r.stdout, dtype=np.uint8).reshape(-1, TH, TW)
    return np.stack([cv2.GaussianBlur(f, (3, 3), 0) for f in a]), None


def align_slides(mp4, pdf, min_score=0.55, min_len=3):
    """Which page is on screen when. Returns ({'segments': [...], 'slides': {...}}, None) or (None, 'error')."""
    import numpy as np
    pages, err = page_thumbs(pdf)
    if err:
        return None, err
    frames, err = video_thumbs(mp4)
    if err:
        return None, err
    sim = _norm(frames) @ _norm(pages).T                    # F x P correlation
    best = sim.argmax(axis=1)
    score = sim.max(axis=1)
    lab = np.where(score >= min_score, best + 1, 0)         # 1-based page, 0 = no slide matched (video, camera)
    k = 2                                                   # mode filter over 5 samples (10 s) against flicker
    sm = lab.copy()
    for i in range(len(lab)):
        win = lab[max(0, i - k):i + k + 1]
        vals, counts = np.unique(win, return_counts=True)
        sm[i] = vals[counts.argmax()] if counts.max() > 1 else lab[i]
    runs, i = [], 0
    while i < len(sm):
        j = i
        while j + 1 < len(sm) and sm[j + 1] == sm[i]:
            j += 1
        runs.append([int(sm[i]), i, j])
        i = j + 1
    keep = []
    for r in runs:                                          # a slide flashed past for < min_len samples joins its neighbour
        if keep and (r[2] - r[1] + 1 < min_len or r[0] == keep[-1][0]):
            keep[-1][2] = r[2]
        else:
            keep.append(r)
    segs = []
    for page, a, b in keep:
        if page == 0:
            continue
        sc = float(score[a:b + 1][lab[a:b + 1] == page].mean()) if (lab[a:b + 1] == page).any() else 0.0
        segs.append({'slide': page, 'start': round(a * STEP, 1), 'end': round((b + 1) * STEP, 1), 'score': round(sc, 3)})
    slides = {}
    for s in segs:
        d = slides.setdefault(str(s['slide']), {'first': s['start'], 'last': s['end'], 'total': 0.0})
        d['last'] = max(d['last'], s['end'])
        d['total'] = round(d['total'] + s['end'] - s['start'], 1)
    return {'pdf': os.path.basename(pdf), 'pages': int(len(pages)), 'step': STEP, 'segments': segs,
            'slides': slides}, None


def write_transcript(lec, words, slides, path):
    """The readable transcript. Returns (path, None) or (None, 'error')."""
    marks = [(s['start'], s['slide']) for s in (slides or {}).get('segments', [])]
    lines = [f'# {lec} - machine transcript of the lecture recording (course/{lec}.mp4, git-ignored)', '',
             f'Recognizer: {words["model"]}, English, word times; {mmss(words["duration"])} long; made {words["made"]}.',
             'NOT checked by ear: accented speech, technical words and names are often wrong. word(?) = probability < 0.5.',
             'Quotes for a film are re-cut and re-checked on their own window (daily/PROMPT.md, step "Her clips").',
             '"=== mm:ss slide N ===" marks when PDF page N of course/' + lec + '.pdf comes on screen (thumbnail match; '
             'pages flashed past for under 6 s are folded into their neighbours).' if slides else
             'No slide timing (the deck was missing when this was made).', '']
    segs = words['segments']
    per = [[] for _ in segs]                      # every word goes to exactly one segment: the last one that has
    k = 0                                         # started by the word's start (+0.3 s: word and segment times differ)
    for w in words['words']:
        while k + 1 < len(segs) and segs[k + 1][0] <= w[0] + 0.3:
            k += 1
        if segs:
            per[k].append(w)
    mi = 0
    for (s0, s1, text), ws in zip(segs, per):
        while mi < len(marks) and marks[mi][0] <= s0 + 1.0:
            lines += ['', f'=== {mmss(marks[mi][0])} slide {marks[mi][1]} ===']
            mi += 1
        if ws:
            text = ''.join(w[2] + ('(?)' if w[3] < 0.5 else '') for w in ws).strip()
        lines.append(f'[{mmss(s0)}] {text}')
    while mi < len(marks):
        lines += ['', f'=== {mmss(marks[mi][0])} slide {marks[mi][1]} ===']
        mi += 1
    try:
        with open(path, 'w') as f:
            f.write('\n'.join(lines) + '\n')
    except OSError as e:
        return None, str(e)
    return path, None


def transcribe(lec, force=False, slides_only=False, model=MODEL):
    """Words, slide timing and the readable transcript for one lecture. Returns (summary line, None) or (None, 'error')."""
    mp4 = os.path.join(COURSE, f'{lec}.mp4')
    pdf = os.path.join(COURSE, f'{lec}.pdf')
    wj, sj, md = (os.path.join(COURSE, f'{lec}.{x}') for x in ('words.json', 'slides.json', 'transcript.md'))
    if not os.path.exists(mp4):
        return None, f'{lec}: no recording (run tools/fetch_recordings.py {lec})'
    os.makedirs(os.path.join(COURSE, '.locks'), exist_ok=True)
    os.makedirs(WORK, exist_ok=True)
    with open(os.path.join(COURSE, '.locks', f'{lec}.transcribe.lock'), 'w') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        t0 = time.time()
        did = []
        words = None
        if os.path.exists(wj) and (not force or slides_only):
            try:
                words = json.load(open(wj))
            except (OSError, ValueError):
                words = None
        if words is None:
            if slides_only:
                return None, f'{lec}: no {os.path.basename(wj)} yet (run without --slides-only)'
            wav, err = extract_audio(mp4, os.path.join(WORK, f'{lec}.wav'))
            if err:
                return None, f'{lec}: {err}'
            cache = os.path.join(os.path.dirname(WORK), 'asr', f'{lec}_{model.split("/")[-1]}')
            res, err = recognize(wav, model, cache)
            if err:
                return None, f'{lec}: {err}'
            os.remove(wav)
            r = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', mp4],
                               capture_output=True, text=True)
            words = {'lecture': lec, 'model': model, 'duration': round(float(r.stdout.strip() or 0), 2),
                     'made': time.strftime('%Y-%m-%d %H:%M'), **res}
            with open(wj + '.part', 'w') as f:
                json.dump(words, f, ensure_ascii=False, separators=(',', ':'))
            os.replace(wj + '.part', wj)
            did.append(f'{len(words["words"])} words')
        slides = None
        if os.path.exists(sj) and not force and not slides_only:
            try:
                slides = json.load(open(sj))
            except (OSError, ValueError):
                slides = None
        if slides is None and os.path.exists(pdf):
            slides, err = align_slides(mp4, pdf)
            if err:
                return None, f'{lec}: slide timing: {err}'
            slides = {'lecture': lec, **slides}
            with open(sj, 'w') as f:
                json.dump(slides, f, indent=1)
            did.append(f'{len(slides["slides"])} of {slides["pages"]} slides timed')
        if did or not os.path.exists(md):
            _, err = write_transcript(lec, words, slides, md)
            if err:
                return None, f'{lec}: {err}'
            did.append('transcript.md')
        return f'{lec}  {", ".join(did) or "up to date"}  ({time.time() - t0:.0f} s)', None


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('lectures', nargs='*')
    ap.add_argument('--all', action='store_true')
    ap.add_argument('--force', action='store_true')
    ap.add_argument('--slides-only', action='store_true')
    ap.add_argument('--model', default=MODEL)
    a = ap.parse_args()
    lecs = sorted(os.path.basename(p)[:3] for p in glob.glob(os.path.join(COURSE, 'L[0-9][0-9].mp4'))) if a.all else \
        [f'L{int(re.sub(r"[^0-9]", "", x)):02d}' for x in a.lectures]
    if not lecs:
        sys.exit('nothing to do: name lectures (L01 L02) or --all')
    bad = []
    for lec in lecs:
        line, err = transcribe(lec, a.force, a.slides_only, a.model)
        print(err or line, flush=True)
        if err:
            bad.append(lec)
    if bad:
        sys.exit(f'failed: {" ".join(bad)}')


if __name__ == '__main__':
    main()
