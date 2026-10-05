#!/usr/bin/env python3
"""Sound for L01-1: fit the scratch voice-over into the timeline, write the caption timing the picture reads, and mix
voice + Prof. Ding's lecture clip + synthesized foley into one stereo track.

    python3 film/mix.py vo   TTS_DIR DING_WAV            # -> film/vo_en.json, film/vo_zh.json (caption timing)
    python3 film/mix.py mix  TTS_DIR DING_WAV OUT_DIR     # -> OUT_DIR/mix_en.wav, mix_zh.wav (-14 LUFS)
    TL=timeline2.json SND=DIR [VODIR=DIR] python3 film/mix.py mix ...  # another timeline; sounds given as files ("f") and music
                                                          # are read from SND (Kenney CC0 packs, music/)

TTS_DIR is tools/tts.py's output (<lang>/<id>.mp3 + .json word marks). The scratch voices are temporary and never
published; the foley is synthesized here (numpy), also temporary until real recordings replace it. No music.
"""
import os, sys, json, subprocess
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
VODIR = os.environ.get('VODIR', HERE)   # where vo_<lang>.json is written/read (another film's folder)
SR = 48000
MAX_TEMPO = 1.2


def load_timeline():
    try:
        return json.load(open(os.path.join(HERE, os.environ.get('TL', 'timeline.json')))), None
    except (OSError, ValueError) as e:
        return None, 'timeline.json: %s' % e


def decode(path, tempo=1.0):
    """Decode any audio file to mono float32 at SR (optionally time-stretched). Returns (array, None) or (None, err)."""
    af = ['-af', 'atempo=%.4f' % tempo] if abs(tempo - 1) > 1e-3 else []
    r = subprocess.run(['ffmpeg', '-v', 'error', '-i', path] + af + ['-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'],
                       capture_output=True)
    if r.returncode != 0:
        return None, 'ffmpeg decode %s: %s' % (path, r.stderr.decode()[-300:])
    return np.frombuffer(r.stdout, np.float32).copy(), None


def fit_vo(tts_dir, ding_wav):
    """Place every line at its timeline start; squeeze lines that run into the next one (atempo <= MAX_TEMPO).
    Writes film/vo_<lang>.json: {id: {t, dur, tempo, lead, words: [[t, d, w], ...]}}. Returns (summary, None)."""
    tl, err = load_timeline()
    if err:
        return None, err
    starts = tl['vo']
    out = {}
    for lang in ('en', 'zh'):
        res, warn = {}, []
        for k, row in enumerate(starts):
            i, t0 = row['id'], row['t']
            nxt = starts[k + 1]['t'] if k + 1 < len(starts) else tl['dur']
            if i == 'd01':
                a, err = decode(ding_wav)
                if err:
                    return None, err
                res[i] = {'t': t0, 'dur': round(len(a) / SR, 3), 'tempo': 1.0, 'lead': 0.0, 'words': []}
                continue
            try:
                marks = json.load(open(os.path.join(tts_dir, lang, i + '.json')))
            except (OSError, ValueError) as e:
                return None, 'marks %s/%s: %s' % (lang, i, e)
            lead = marks[0]['t']
            speech = marks[-1]['t'] + marks[-1]['d'] - lead
            room = nxt - t0 - 0.08
            tempo = max(1.0, speech / room) if room > 0 else MAX_TEMPO
            if tempo > MAX_TEMPO:
                warn.append('%s %.2fx' % (i, tempo))
                tempo = MAX_TEMPO
            words = [[round(t0 + (m['t'] - lead) / tempo, 3), round(m['d'] / tempo, 3), m['w']] for m in marks]
            res[i] = {'t': t0, 'dur': round(speech / tempo, 3), 'tempo': round(tempo, 4), 'lead': lead, 'words': words}
        json.dump(res, open(os.path.join(VODIR, 'vo_%s.json' % lang), 'w'), ensure_ascii=False, indent=0)
        out[lang] = {'squeezed': {i: r['tempo'] for i, r in res.items() if r['tempo'] > 1}, 'over_limit': warn}
    return out, None


# ---------------------------------------------------------------- foley (synthesized, deterministic)
def _rng(k):
    # a seed from the string's characters (Python's hash() is salted per process, so it is not used)
    return np.random.default_rng(sum((j + 1) * ord(c) for j, c in enumerate(k)) * 7919 + len(k))


def _noise(n, k):
    return _rng(k).standard_normal(n).astype(np.float32)


def _env(n, a=0.005, d=0.1, shape=4.0):
    t = np.arange(n) / SR
    e = np.minimum(1, t / max(a, 1e-4)) * np.exp(-np.maximum(0, t - a) / max(d, 1e-4) * (shape / 4))
    return e.astype(np.float32)


def _bp(x, lo, hi):
    X = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    X[(f < lo) | (f > hi)] = 0
    return np.fft.irfft(X, len(x)).astype(np.float32)


def _sine(n, f0, f1=None, ph=0.0):
    f1 = f0 if f1 is None else f1
    f = np.linspace(f0, f1, n)
    return np.sin(2 * np.pi * np.cumsum(f) / SR + ph).astype(np.float32)


def _norm(x, peak):
    m = np.max(np.abs(x)) or 1
    return x / m * peak


def sfx(kind, dur=None, seed=''):
    """One foley sound as mono float32 at SR. kind is the timeline's 'k'."""
    k = kind + seed
    S = lambda s: int(s * SR)
    if kind == 'room':
        n = S(dur)
        x = _bp(_noise(n, k), 60, 900) * 0.006 + _sine(n, 58) * 0.0012
        return x
    if kind in ('slap',):
        n = S(.12); x = _bp(_noise(n, k), 600, 5000) * _env(n, .002, .025) + _sine(n, 140, 90) * _env(n, .002, .04) * .6
        return _norm(x, .5)
    if kind == 'pulley':
        n = S(.45); vib = 1 + .03 * np.sin(2 * np.pi * 9 * np.arange(n) / SR)
        x = _sine(n, 1100, 1500) * vib * .25 * np.sin(np.pi * np.arange(n) / n) + _bp(_noise(n, k), 300, 2500) * .08
        return _norm(x, .16)
    if kind == 'flips':
        n = S(dur); x = np.zeros(n, np.float32); t = 0.0; gap = .26
        while t < dur - .05:
            m = S(.03); i = S(t); x[i:i + m] += _bp(_noise(m, k + str(i)), 1500, 7000) * _env(m, .001, .008)[:len(x[i:i + m])]
            t += gap; gap = max(.06, gap * .8)
        return _norm(x, .28)
    if kind in ('whoosh', 'whooshUp'):
        n = S(.45); x = _noise(n, k); env = np.sin(np.pi * np.linspace(0, 1, n)) ** (1.5 if kind == 'whoosh' else 2.5)
        lo = _bp(x, 80, 700); hi = _bp(x, 700, 2500)
        mixk = np.linspace(0, 1, n) if kind == 'whoosh' else np.linspace(1, 0, n)
        return _norm((lo * (1 - mixk * .5) + hi * mixk * .5) * env, .3)
    if kind == 'clack':
        n = S(.09); x = (_sine(n, 900) + .5 * _sine(n, 2150)) * _env(n, .001, .012) + _bp(_noise(n, k), 1000, 6000) * _env(n, .001, .004)
        return _norm(x, .32)
    if kind in ('tick', 'tick3'):
        reps = 3 if kind == 'tick3' else 1; n = S(.09 * reps + .05); x = np.zeros(n, np.float32)
        for j in range(reps):
            m = S(.05); i = S(j * .085); x[i:i + m] += (_sine(m, 1300 + 90 * j) + .4 * _sine(m, 3100)) * _env(m, .001, .01)
        return _norm(x, .3)
    if kind == 'rustle':
        n = S(.35); return _norm(_bp(_noise(n, k), 2000, 9000) * _env(n, .02, .12) * (0.6 + 0.4 * np.abs(_noise(n, k + 'm'))), .14)
    if kind == 'snare':
        n = S(.2); return _norm(_bp(_noise(n, k), 1500, 9000) * _env(n, .001, .06) + _sine(n, 190, 160) * _env(n, .001, .05) * .7, .4)
    if kind == 'gasp':
        n = S(.5); x = _bp(_noise(n, k), 2500, 7000) * np.sin(np.pi * np.linspace(0, 1, n)) ** 2
        return _norm(x, .1)
    if kind in ('confetti', 'crowd', 'applause', 'scritch'):
        n = S(dur); x = np.zeros(n, np.float32); r = _rng(k)
        dens = {'confetti': 40, 'crowd': 260, 'applause': 420, 'scritch': 30}[kind]
        lo, hi, L = {'confetti': (3000, 9000, .006), 'crowd': (1800, 6000, .004), 'applause': (900, 6000, .008), 'scritch': (2500, 8000, .012)}[kind]
        for _ in range(int(dens * dur)):
            m = S(L); i = int(r.uniform(0, n - m)); x[i:i + m] += r.standard_normal(m).astype(np.float32) * _env(m, .0005, L / 3) * r.uniform(.3, 1)
        x = _bp(x, lo, hi)
        env = np.minimum(1, np.linspace(0, dur, n) / .15) * np.minimum(1, (dur - np.linspace(0, dur, n)) / .5)
        return _norm(x * env, {'confetti': .12, 'crowd': .16, 'applause': .3, 'scritch': .08}[kind])
    if kind == 'paper':
        n = S(.45); x = _bp(_noise(n, k), 500, 6000) * _env(n, .03, .15) * (0.5 + 0.5 * np.abs(np.sin(np.linspace(0, 40, n))))
        return _norm(x, .18)
    if kind == 'twang':
        n = S(.35); return _norm(_sine(n, 240, 180) * _env(n, .002, .08), .14)
    if kind in ('pen', 'penLong', 'penStrike'):
        d = {'pen': .18, 'penLong': .6, 'penStrike': .3}[kind]; n = S(d)
        x = _sine(n, 2600, 2900) * (0.4 + 0.6 * np.abs(np.sin(np.linspace(0, d * 30, n)))) * .3 + _bp(_noise(n, k), 3000, 9000) * .5
        env = np.minimum(1, np.linspace(0, d, n) / .02) * np.minimum(1, (d - np.linspace(0, d, n)) / .04)
        return _norm(x * env, .1)
    if kind == 'slide':
        n = S(.5); return _norm(_bp(_noise(n, k), 200, 2500) * np.sin(np.pi * np.linspace(0, 1, n)), .1)
    if kind == 'roller':
        n = S(.6); return _norm(_bp(_noise(n, k), 60, 400) * np.sin(np.pi * np.linspace(0, 1, n)) + _sine(n, 70) * .2 * _env(n, .01, .3), .25)
    if kind in ('flipBoard', 'flipBack', 'flipBig'):
        reps = 2 if kind == 'flipBack' else 1; big = kind == 'flipBig'
        n = S(.3 + .25 * reps); x = np.zeros(n, np.float32)
        for j in range(reps):
            m = S(.22 if big else .14); i = S(j * .25)
            x[i:i + m] += _bp(_noise(m, k + str(j)), 150 if big else 400, 4000 if big else 7000) * _env(m, .004, .05 if big else .03)
            if big: x[i:i + m] += _sine(m, 90) * _env(m, .002, .06) * .5
        return _norm(x, .4 if big else .3)
    if kind in ('thud', 'plop', 'boom', 'stamp'):
        f, d, pk = {'thud': (70, .35, .55), 'plop': (130, .15, .25), 'boom': (48, .9, .8), 'stamp': (95, .4, .75)}[kind]
        n = S(d); x = _sine(n, f * 1.3, f) * _env(n, .002, d / 4) + _bp(_noise(n, k), 200, 3000) * _env(n, .001, .02) * .5
        if kind == 'boom': x += _bp(_noise(n, k + 'dust'), 1500, 8000) * _env(n, .05, .4) * .15
        if kind == 'stamp': x += _bp(_noise(n, k + 'snap'), 2000, 9000) * _env(n, .0005, .006) * .8
        return _norm(x, pk)
    if kind == 'lightsOn':
        n = S(.7); x = np.zeros(n, np.float32)
        for j in range(7):
            m = S(.06); i = S(j * .085); x[i:i + m] += (_bp(_noise(m, k + str(j)), 400, 4000) + _sine(m, 160) * .6) * _env(m, .001, .015)
        return _norm(x, .3)
    if kind == 'buzz':
        n = S(.65); t = np.arange(n) / SR
        x = sum(np.sin(2 * np.pi * 100 * h * t) / h for h in (1, 2, 3, 5)).astype(np.float32) * .3
        gate = (np.sin(2 * np.pi * 7 * t) > -.2).astype(np.float32) * np.linspace(1, .2, n)
        return _norm(x * gate + _bp(_noise(n, k), 3000, 9000) * .1 * gate, .14)
    if kind == 'creak':
        n = S(.45); saw = (np.cumsum(np.full(n, 310 / SR)) % 1 - .5).astype(np.float32)
        return _norm(_bp(saw * (1 + .3 * _noise(n, k)), 250, 2500) * np.sin(np.pi * np.linspace(0, 1, n)), .1)
    raise ValueError('unknown sfx ' + kind)


def mix(tts_dir, ding_wav, out_dir):
    tl, err = load_timeline()
    if err:
        return None, err
    N = int(tl['dur'] * SR)
    os.makedirs(out_dir, exist_ok=True)
    fol = np.zeros(N, np.float32)
    snd = os.environ.get('SND', '')
    for e in tl['sfx']:
        if 'f' in e:
            x, err = decode(os.path.join(snd, e['f']))
            if err:
                return None, err
            x = x * e.get('g', 1.0)
        else:
            try:
                x = sfx(e['k'], e.get('d'), seed='%.2f' % e['t']) * e.get('g', 1.0)
            except ValueError as ex:
                return None, str(ex)
        i = int(e['t'] * SR); x = x[:N - i]; fol[i:i + len(x)] += x
    # duck the foley (and the room) in the script's silences
    for a, b in tl.get('duck', []):
        i, j = int(a * SR), int(b * SR); fol[i:j] *= 0.35
    outs = {}
    for lang in ('en', 'zh'):
        try:
            vo = json.load(open(os.path.join(VODIR, 'vo_%s.json' % lang)))
        except (OSError, ValueError) as e:
            return None, 'run "vo" first: %s' % e
        voice = np.zeros(N, np.float32)
        ids = {v['id'] for v in tl['vo']}
        for i, r in vo.items():
            if i not in ids:
                continue
            if i == 'd01':
                a, err = decode(ding_wav)
                if err:
                    return None, err
                a = a * 0.95
            else:
                a, err = decode(os.path.join(tts_dir, lang, i + '.mp3'), r['tempo'])
                if err:
                    return None, err
                a = a[int(r['lead'] / r['tempo'] * SR):]          # drop the synth's leading silence
            s = int(r['t'] * SR); a = a[:N - s]; voice[s:s + len(a)] += a
        mixd = voice * 1.0 + fol * 0.9
        m = tl.get('music')
        if m:
            mu, err = decode(os.path.join(snd, m['f']))
            if err:
                return None, err
            mu = mu[int(m.get('from', 0) * SR):]
            bed = np.zeros(N, np.float32); s0 = int(m.get('start', 0) * SR); mu = mu[:N - s0]; bed[s0:s0 + len(mu)] = mu
            # duck under the voice (a smoothed envelope of where the voice is), fade in and out
            env = np.convolve((np.abs(voice) > 0.02).astype(np.float32), np.ones(int(.25 * SR), np.float32) / int(.25 * SR), 'same')
            gain = m.get('gain', .3) * (1 - (1 - m.get('duck', .5)) * np.clip(env * 3, 0, 1))
            fi = np.clip(np.arange(N) / (0.6 * SR), 0, 1); a, b = m.get('fadeOut', [tl['dur'] - 1.5, tl['dur']])
            fo = np.clip((b * SR - np.arange(N)) / ((b - a) * SR), 0, 1)
            mixd = mixd + bed * gain * fi * fo
        st = np.stack([mixd, mixd], 1)
        raw = os.path.join(out_dir, 'raw_%s.f32' % lang); st.astype(np.float32).tofile(raw)
        dst = os.path.join(out_dir, 'mix_%s.wav' % lang)
        r = subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', raw,
                            '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11', '-ar', str(SR), dst], capture_output=True)
        os.remove(raw)
        if r.returncode != 0:
            return None, 'ffmpeg mix: ' + r.stderr.decode()[-300:]
        outs[lang] = dst
    return outs, None


if __name__ == '__main__':
    if len(sys.argv) < 4 or sys.argv[1] not in ('vo', 'mix'):
        sys.exit(__doc__)
    if sys.argv[1] == 'vo':
        res, err = fit_vo(sys.argv[2], sys.argv[3])
    else:
        res, err = mix(sys.argv[2], sys.argv[3], sys.argv[4])
    if err:
        sys.exit(err)
    print(json.dumps(res, ensure_ascii=False, indent=1))
