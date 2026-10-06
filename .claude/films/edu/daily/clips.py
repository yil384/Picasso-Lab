#!/usr/bin/env python3
"""Her voice clips for an episode: cut them from the lecture recording, then check every quote with two recognizers.

    ~/miniforge3/bin/python3 .claude/films/edu/daily/clips.py cut   EPISODE_DIR/clips.json [--out DIR] [--lecture L01]
    ~/miniforge3/bin/python3 .claude/films/edu/daily/clips.py check EPISODE_DIR/clips.json [--out DIR]
    ~/miniforge3/bin/python3 .claude/films/edu/daily/clips.py words L01 1460 1475     # the words in a window (both recognizers)

clips.json (committed with the episode; the audio is not): a list of
    {"id": "C1", "lecture": "L01", "rec_start": 1096.3, "rec_end": 1104.2, "dur": 7.9, "text": "her exact words"}
"lecture" may be left out when --lecture is given. Ids are C1, C2, ...; the timeline's voice ids are c1, c2, ... (the
mixer plays CLIPDIR/C1.wav for voice id c1 and puts the mic tag on it).

cut: course/<lecture>.mp4 -> DIR/<ID>.wav, 48 kHz mono, the chain used for L01-01 (high-pass 90 Hz, low-pass 9 kHz,
     FFT denoise, loudness -17 LUFS, 80 ms fade in, 150 ms fade out). DIR defaults to ~/picasso-work/clips/<episode dir
     name>; it is outside the repo on purpose: recordings and anything cut from them are never committed.
check: transcribes each cut with two different recognizers and compares both, word for word (case and punctuation
     ignored), with "text". A quote may be shown when it is "exact", or "near": the only words either recognizer
     missed are at most 2 terms printed in her deck (course/LNN.txt) or listed in the clip's "accept" list (e.g.
     a product or method name printed on her slide that the recognizer misspells). "asr-agree": both recognizers hear the
     same words, "text" differs from them, and every differing word is a function word (the, a, of, so, ...) or a term
     printed in her deck: the text may be changed to what they heard (keep the old one in "text_was" and list the clip
     in report.md: the user listens to those first). The two recognizers share a lineage and can mishear alike, so any
     other disagreement with "text" is "differ": re-cut around the disputed words or drop the clip.
     Writes DIR/check.json (with "changed": the differing words); exits 1 unless every clip is exact or near.
"""
import argparse, difflib, json, os, re, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
COURSE = os.path.abspath(os.path.join(HERE, '..', 'course'))
MODELS = ['mlx-community/whisper-large-v3-turbo', 'mlx-community/whisper-medium.en-mlx']
CHAIN = 'highpass=f=90,lowpass=f=9000,afftdn=nf=-38:nr=14,loudnorm=I=-17:TP=-2:LRA=7,afade=t=in:d=0.08,' \
        'afade=t=out:st={fo:.3f}:d=0.15'


def load(path):
    """Returns (list of clips, None) or (None, 'error')."""
    try:
        clips = json.load(open(path))
    except (OSError, ValueError) as e:
        return None, f'cannot read {path}: {e}'
    if not isinstance(clips, list) or not all('id' in c and 'rec_start' in c and 'rec_end' in c for c in clips):
        return None, f'{path}: expected a list of {{id, rec_start, rec_end, text}}'
    return clips, None


def default_out(path):
    return os.path.expanduser(os.path.join('~/picasso-work/clips', os.path.basename(os.path.dirname(os.path.abspath(path)))))


def cut(path, out=None, lecture=None):
    """Cut and clean every clip. Returns (list of wav paths, None) or (None, 'error')."""
    clips, err = load(path)
    if err:
        return None, err
    out = out or default_out(path)
    os.makedirs(out, exist_ok=True)
    done = []
    for c in clips:
        lec = c.get('lecture') or lecture
        if not lec:
            return None, f'{c["id"]}: no "lecture" in the clip and no --lecture'
        mp4 = os.path.join(COURSE, f'{lec}.mp4')
        if not os.path.exists(mp4):
            return None, f'{c["id"]}: no {mp4} (tools/fetch_recordings.py {lec})'
        d = round(c['rec_end'] - c['rec_start'], 3)
        if not 0.5 <= d <= 30:
            return None, f'{c["id"]}: {d} s is not a clip length (0.5-30 s)'
        wav = os.path.join(out, c['id'].upper() + '.wav')
        r = subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-ss', f'{c["rec_start"]:.3f}', '-t', f'{d:.3f}',
                            '-i', mp4, '-vn', '-ac', '1', '-af', CHAIN.format(fo=max(0.0, d - 0.15)), '-ar', '48000',
                            '-c:a', 'pcm_s16le', wav], capture_output=True, text=True)
        if r.returncode:
            return None, f'{c["id"]}: ffmpeg: {r.stderr[-300:]}'
        done.append(wav)
    return done, None


def norm(text):
    t = text.lower().replace('-', ' ').replace('’', "'")
    t = re.sub(r"[^a-z0-9' ]+", ' ', t)
    return [w.strip("'") for w in t.split() if w.strip("'")]


def hear(wav, model, start=None, end=None):
    """Words of an audio file (or a window of it). Returns (text, None) or (None, 'error')."""
    try:
        import mlx_whisper
        kw = {'clip_timestamps': [start, end]} if start is not None else {}
        r = mlx_whisper.transcribe(wav, path_or_hf_repo=model, language='en', condition_on_previous_text=False,
                                   word_timestamps=start is not None, verbose=None, **kw)
    except Exception as e:  # model missing offline, Metal or audio errors
        return None, f'{model}: {type(e).__name__}: {str(e)[:200]}'
    if start is not None:
        return [[round(w['start'], 2), round(w['end'], 2), w['word']] for s in r.get('segments', [])
                for w in s.get('words', [])], None
    return r.get('text', '').strip(), None


def deck_words(lecture):
    """Words of the lecture's deck text (course/LNN.txt), for terms a recognizer misspells."""
    try:
        return {w for w in norm(open(os.path.join(COURSE, f'{lecture}.txt')).read()) if len(w) >= 4 or re.search(r'\d', w)}
    except (OSError, TypeError):
        return set()


FUNCTION = set('''a an the and or but so of to in on at by for with from as is are was were be been it its it's this that
these those there here i you we they he she me us them my our your his her their do does did not no yes um uh oh ok okay
just very really then than if when what which who how why all some any can could will would should may might has have
had like well right now also up down out about into over'''.split())


def changed_words(want, got):
    """The words of want that got replaced or dropped, and the words got added."""
    sm = difflib.SequenceMatcher(a=want, b=got, autojunk=False)
    return [w for op, a0, a1, b0, b1 in sm.get_opcodes() if op != 'equal' for w in want[a0:a1] + got[b0:b1]]


def near(want, got, vocab, most=2):
    """True when the only words of the text a recognizer missed are terms printed in her deck (or listed in the
    clip's "accept"), at most `most` of them: e.g. a product name on her slide that a recognizer misspells."""
    sm = difflib.SequenceMatcher(a=want, b=got, autojunk=False)
    missed = [w for op, a0, a1, b0, b1 in sm.get_opcodes() if op in ('replace', 'delete') for w in want[a0:a1]]
    extra = [w for op, a0, a1, b0, b1 in sm.get_opcodes() if op == 'insert' for w in got[b0:b1]]
    return len(missed) <= most and not extra and all(w in vocab for w in missed)


def window_words(lec, start, end):
    """Both recognizers' words in [start, end] s of course/<lec>.mp4 (only that window is decoded).
    Returns ({model: [[start, end, word], ...]}, None) or (None, 'error')."""
    mp4 = os.path.join(COURSE, f'{lec}.mp4')
    if not os.path.exists(mp4):
        return None, f'no {mp4}'
    tmp = os.path.expanduser('~/picasso-work/cache/window.wav')
    os.makedirs(os.path.dirname(tmp), exist_ok=True)
    r = subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-y', '-ss', f'{start:.3f}', '-t', f'{end - start:.3f}',
                        '-i', mp4, '-vn', '-ac', '1', '-ar', '16000', '-c:a', 'pcm_s16le', tmp], capture_output=True,
                       text=True)
    if r.returncode:
        return None, 'ffmpeg: ' + r.stderr[-300:]
    out = {}
    for m in MODELS:
        ws, err = hear(tmp, m, 0.0, end - start)
        if err:
            return None, err
        out[m] = [[round(w[0] + start, 2), round(w[1] + start, 2), w[2]] for w in ws]
    return out, None


def check(path, out=None, lecture=None):
    """Two recognizers against each clip's text. Returns (list of results, None) or (None, 'error')."""
    clips, err = load(path)
    if err:
        return None, err
    out = out or default_out(path)
    wavs = [os.path.join(out, c['id'].upper() + '.wav') for c in clips]
    for c, wav in zip(clips, wavs):
        if not os.path.exists(wav):
            return None, f'{c["id"]}: no {wav} (run cut first)'
    heards = [{} for _ in clips]
    for m in MODELS:                              # one model at a time: the recognizer keeps the last model loaded
        for heard, wav in zip(heards, wavs):
            txt, err = hear(wav, m)
            heard[m] = txt if not err else None
            if err:
                heard[m + ' error'] = err
    res = []
    for c, heard in zip(clips, heards):
        want = norm(c.get('text', ''))
        got = [norm(heard[m]) for m in MODELS if heard.get(m) is not None]
        vocab = deck_words(c.get('lecture') or lecture) | set(norm(' '.join(c.get('accept', []))))
        if len(got) < 2:
            verdict = 'unchecked'
        elif all(g == want for g in got):
            verdict = 'exact'
        elif all(near(want, g, vocab) for g in got):
            verdict = 'near'
        elif got[0] == got[1] and all(w in FUNCTION or w in vocab for w in changed_words(want, got[0])):
            verdict = 'asr-agree'
        else:
            verdict = 'differ'
        diffs = {m: [d for d in difflib.ndiff(want, norm(heard[m])) if d[0] in '+-']
                 for m in MODELS if heard.get(m) is not None}
        res.append({'id': c['id'], 'verdict': verdict, 'text': c.get('text', ''), 'heard': heard, 'diff': diffs,
                    'changed': changed_words(want, got[0]) if got else [],
                    **({'text_was': c['text_was']} if c.get('text_was') else {})})
    with open(os.path.join(out, 'check.json'), 'w') as f:
        json.dump(res, f, indent=1, ensure_ascii=False)
    return res, None


def main():
    ap = argparse.ArgumentParser(description='cut and check the voice clips; see the module doc')
    ap.add_argument('cmd', choices=['cut', 'check', 'words'])
    ap.add_argument('args', nargs='+')
    ap.add_argument('--out')
    ap.add_argument('--lecture')
    a = ap.parse_args()
    if a.cmd == 'words':
        lec, s, e = a.args[0].upper(), float(a.args[1]), float(a.args[2])
        res, err = window_words(lec, s, e)
        if err:
            sys.exit(err)
        for m, ws in res.items():
            print(f'--- {m}')
            print('\n'.join(f'{w[0]:8.2f} {w[1]:8.2f} {w[2]}' for w in ws))
        return
    if a.cmd == 'cut':
        done, err = cut(a.args[0], a.out, a.lecture)
        if err:
            sys.exit(err)
        print('\n'.join(done))
        return
    res, err = check(a.args[0], a.out, a.lecture)
    if err:
        sys.exit(err)
    for r in res:
        print(f'{r["id"]:4s} {r["verdict"]:10s} {r["text"][:70]}' + ('   (text changed from the transcript: listen first)'
                                                                       if r.get('text_was') else ''))
        if r['verdict'] not in ('exact',):
            for m, d in r['diff'].items():
                print(f'      {m.split("/")[-1]}: {" ".join(d) or "(same as text)"}')
    bad = [r['id'] for r in res if r['verdict'] not in ('exact', 'near')]
    if bad:
        sys.exit(f'not usable yet: {" ".join(bad)} (fix the text, re-cut, or drop them)')


if __name__ == '__main__':
    main()
