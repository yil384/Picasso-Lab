#!/usr/bin/env python3
"""Sound for a lesson film: fit the scratch voice into the episode's timeline (writes vo_<lang>.json, which the
captions and time expressions read), then mix voice + Prof. Ding's clips + recorded sound effects + the music bed into
one stereo track at -14 LUFS.

    python3 kit-lesson/mix.py vo  EP TTS_DIR            # -> EP/vo_<lang>.json
    python3 kit-lesson/mix.py mix EP TTS_DIR OUT_DIR    # -> OUT_DIR/mix_<lang>.wav

EP = a folder under episodes/ ("l01-01") or a path. TTS_DIR = tools/tts.py's output (<lang>/<id>.mp3 + .json marks).
Languages: LANGS=en,zh, else episode.json "langs" (default en). Clips: a voice id starting with "c" plays
<clipDir>/<ID upper>.wav as is (episode.json voice.clipDir, or CLIPDIR). Sounds and music are files under
episode.json sound.dir (or SND). Override where vo_<lang>.json goes with VODIR.

A clean copy of episodes/l01-1-scale/film/mix.py (fit_vo, loop_track, music_bed, mix), reading the episode folder,
with per-episode languages and without the synthesized foley (house rule: only real recorded / CC0 sounds; an sfx
entry needs "f"). Timeline schema: kit-lesson/README.md.
"""
import os, sys, json, subprocess
import numpy as np

EDU = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
SR = 48000
MAX_TEMPO = 1.2
CLIP_GAP = 0.2         # her clip must end at least this long before the next voice starts


def load_episode(ep):
    """The episode folder, episode.json and timeline.json. Returns ((dir, episode, timeline), None) or (None, err)."""
    d = ep if os.path.isdir(ep) else os.path.join(EDU, 'episodes', ep)
    try:
        e = json.load(open(os.path.join(d, 'episode.json')))
        tl = json.load(open(os.path.join(d, e.get('timeline', 'timeline.json'))))
    except (OSError, ValueError) as x:
        return None, 'episode %s: %s' % (ep, x)
    return (d, e, tl), None


def settings(d, e):
    """Languages, clip folder, sound folder, vo folder for an episode. Returns (dict, None)."""
    langs = os.environ.get('LANGS')
    langs = langs.split(',') if langs else e.get('langs', ['en'])
    clipdir = os.environ.get('CLIPDIR') or (e.get('voice') or {}).get('clipDir', '')
    snd = os.environ.get('SND') or (e.get('sound') or {}).get('dir', '')
    return {'langs': langs, 'clipdir': os.path.expanduser(clipdir), 'snd': os.path.expanduser(snd),
            'vodir': os.environ.get('VODIR', d)}, None


def decode(path, tempo=1.0):
    """Decode any audio file to mono float32 at SR (optionally time-stretched). Returns (array, None) or (None, err)."""
    af = ['-af', 'atempo=%.4f' % tempo] if abs(tempo - 1) > 1e-3 else []
    r = subprocess.run(['ffmpeg', '-v', 'error', '-i', path] + af + ['-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'],
                       capture_output=True)
    if r.returncode != 0:
        return None, 'ffmpeg decode %s: %s' % (path, r.stderr.decode()[-300:])
    return np.frombuffer(r.stdout, np.float32).copy(), None


def clip_path(i, clipdir):
    """The audio file of one of her clips (voice id c*), or None for a narration line. Returns (path, None) or
    (None, err) when a c* clip file is missing."""
    if not i.startswith('c'):
        return None, None
    p = os.path.join(clipdir, i.upper() + '.wav') if clipdir else ''
    if not p or not os.path.exists(p):
        return None, 'clip %s: no %s (set voice.clipDir or CLIPDIR)' % (i, p or i.upper() + '.wav')
    return p, None


def fit_vo(ep, tts_dir):
    """Place every line at its timeline start; squeeze lines that run into the next one (atempo <= MAX_TEMPO).
    Writes vo_<lang>.json: {id: {t, dur, tempo, lead, words: [[t, d, w], ...]}}. Returns (summary, None), or
    (None, 'error') and writes nothing when a voice would run into the next one: one of her clips (never squeezed)
    ending less than CLIP_GAP s before the next slot, or a line that needs more than MAX_TEMPO. Fix the timeline (a
    longer slot, a shorter line) and run it again."""
    got, err = load_episode(ep)
    if err:
        return None, err
    d, e, tl = got
    st, _ = settings(d, e)
    starts, out, bad = tl['vo'], {}, []
    for lang in st['langs']:
        res, warn = {}, []
        for k, row in enumerate(starts):
            i, t0 = row['id'], row['t']
            nxt = starts[k + 1]['t'] if k + 1 < len(starts) else tl['dur']
            cp, err = clip_path(i, st['clipdir'])
            if err:
                return None, err
            if cp:
                a, err = decode(cp)
                if err:
                    return None, err
                res[i] = {'t': t0, 'dur': round(len(a) / SR, 3), 'tempo': 1.0, 'lead': 0.0, 'words': []}
                over = t0 + res[i]['dur'] + CLIP_GAP - nxt
                if over > 1e-3:
                    bad.append('%s: %s (%.2f s) runs %.2f s into %s' % (lang, i, res[i]['dur'], over,
                                                                       starts[k + 1]['id'] if k + 1 < len(starts) else 'the end'))
                continue
            try:
                marks = json.load(open(os.path.join(tts_dir, lang, i + '.json')))
            except (OSError, ValueError) as x:
                return None, 'marks %s/%s: %s' % (lang, i, x)
            lead = marks[0]['t']
            speech = marks[-1]['t'] + marks[-1]['d'] - lead
            room = nxt - t0 - 0.08
            tempo = max(1.0, speech / room) if room > 0 else MAX_TEMPO
            if tempo > MAX_TEMPO:
                warn.append('%s %.2fx' % (i, tempo))
                bad.append('%s: %s needs %.2fx to fit its %.2f s slot (at most %.1fx): it would run %.2f s into %s'
                           % (lang, i, tempo, room + 0.08, MAX_TEMPO, speech / MAX_TEMPO - room,
                              starts[k + 1]['id'] if k + 1 < len(starts) else 'the end'))
                tempo = MAX_TEMPO
            words = [[round(t0 + (m['t'] - lead) / tempo, 3), round(m['d'] / tempo, 3), m['w']] for m in marks]
            res[i] = {'t': t0, 'dur': round(speech / tempo, 3), 'tempo': round(tempo, 4), 'lead': lead, 'words': words}
        out[lang] = ({'squeezed': {i: r['tempo'] for i, r in res.items() if r['tempo'] > 1}, 'over_limit': warn}, res)
    if bad:
        return None, 'voices overlap (vo_*.json not written):\n  ' + '\n  '.join(bad)
    for lang, (summary, res) in out.items():
        json.dump(res, open(os.path.join(st['vodir'], 'vo_%s.json' % lang), 'w'), ensure_ascii=False, indent=0)
        out[lang] = summary
    return out, None


def loop_track(mu, a, b, xfade, loops, need):
    """The track mu (mono, SR) played from its start, jumping back from b to a (seconds) with an equal-power crossfade of
    xfade seconds centred on each jump, `loops` times (None: until `need` samples are filled). Returns (array, None) or
    (None, err)."""
    ai, bi, h = int(a * SR), int(b * SR), int(xfade * SR / 2)
    if not (h <= ai < bi <= len(mu) - h):
        return None, 'loop [%.2f, %.2f] with a %.1f s crossfade does not fit a %.1f s track' % (a, b, xfade, len(mu) / SR)
    k = np.linspace(0, np.pi / 2, 2 * h, dtype=np.float32)
    parts, pos, done = [mu[:bi - h]], bi - h, 0
    while (loops is None and pos < need) or (loops is not None and done < loops):
        parts.append(mu[bi - h:bi + h] * np.cos(k) + mu[ai - h:ai + h] * np.sin(k))   # out of b, into a
        parts.append(mu[ai + h:bi - h])
        pos += 2 * h + (bi - ai - 2 * h); done += 1
    parts[-1] = np.concatenate([parts[-1], mu[bi - h:]])                                  # the last pass plays to the end
    return np.concatenate(parts).astype(np.float32), None


def music_bed(m, N, snd, dur):
    """One music entry as a bed of N samples (before ducking): the track from m['from'], placed at m['start'], looped
    if m['loop'] is given, faded in over m['fadeIn'] and out over m['fadeOut'] (film seconds). Returns (array, None) or
    (None, err)."""
    mu, err = decode(os.path.join(snd, m['f']))
    if err:
        return None, err
    s0 = int(m.get('start', 0) * SR)
    if m.get('loop'):
        a, b = m['loop']
        mu, err = loop_track(mu, a, b, m.get('xfade', 2.0), m.get('loops'), N - s0 + int(m.get('from', 0) * SR))
        if err:
            return None, '%s: %s' % (m['f'], err)
    mu = mu[int(m.get('from', 0) * SR):][:max(0, N - s0)]
    bed = np.zeros(N, np.float32); bed[s0:s0 + len(mu)] = mu
    t = np.arange(N, dtype=np.float32) / SR
    fi = np.clip((t - m.get('start', 0)) / max(m.get('fadeIn', .6), 1e-3), 0, 1)
    a, b = m.get('fadeOut', [dur - 1.5, dur])
    fo = np.clip((b - t) / max(b - a, 1e-3), 0, 1)
    return bed * fi * fo, None


def mix(ep, tts_dir, out_dir):
    """Mix every language to out_dir/mix_<lang>.wav (-14 LUFS). Returns ({lang: path}, None) or (None, err)."""
    got, err = load_episode(ep)
    if err:
        return None, err
    d, e, tl = got
    st, _ = settings(d, e)
    N = int(tl['dur'] * SR)
    os.makedirs(out_dir, exist_ok=True)
    fol = np.zeros(N, np.float32)
    for ev in tl.get('sfx', []):
        if 'f' not in ev:
            return None, 'sfx at %.2f has no file "f" (synthesized effects are not used)' % ev.get('t', -1)
        x, err = decode(os.path.join(st['snd'], ev['f']))
        if err:
            return None, err
        x = x * ev.get('g', 1.0)
        i = int(ev['t'] * SR); x = x[:N - i]; fol[i:i + len(x)] += x
    for a, b in tl.get('duck', []):          # duck the effects in the script's silences
        i, j = int(a * SR), int(b * SR); fol[i:j] *= 0.35
    outs = {}
    for lang in st['langs']:
        try:
            vo = json.load(open(os.path.join(st['vodir'], 'vo_%s.json' % lang)))
        except (OSError, ValueError) as x:
            return None, 'run "vo" first: %s' % x
        voice = np.zeros(N, np.float32)
        ids = {v['id'] for v in tl['vo']}
        for i, r in vo.items():
            if i not in ids:
                continue
            cp, err = clip_path(i, st['clipdir'])
            if err:
                return None, err
            if cp:
                a, err = decode(cp)
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
        ms = tl.get('music') or []
        if isinstance(ms, dict):
            ms = [ms]
        if ms:   # duck under the voice (a smoothed envelope of where the voice is)
            env = np.convolve((np.abs(voice) > 0.02).astype(np.float32), np.ones(int(.25 * SR), np.float32) / int(.25 * SR), 'same')
        for m in ms:
            bed, err = music_bed(m, N, st['snd'], tl['dur'])
            if err:
                return None, err
            gain = m.get('gain', .3) * (1 - (1 - m.get('duck', .5)) * np.clip(env * 3, 0, 1))
            mixd = mixd + bed * gain
        st2 = np.stack([mixd, mixd], 1)
        raw = os.path.join(out_dir, 'raw_%s.f32' % lang); st2.astype(np.float32).tofile(raw)
        dst = os.path.join(out_dir, 'mix_%s.wav' % lang)
        r = subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(SR), '-ac', '2', '-i', raw,
                            '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11', '-ar', str(SR), dst], capture_output=True)
        os.remove(raw)
        if r.returncode != 0:
            return None, 'ffmpeg mix: ' + r.stderr.decode()[-300:]
        outs[lang] = dst
    return outs, None


if __name__ == '__main__':
    if len(sys.argv) < 4 or sys.argv[1] not in ('vo', 'mix') or (sys.argv[1] == 'mix' and len(sys.argv) < 5):
        sys.exit(__doc__)
    if sys.argv[1] == 'vo':
        res, err = fit_vo(sys.argv[2], sys.argv[3])
    else:
        res, err = mix(sys.argv[2], sys.argv[3], sys.argv[4])
    if err:
        sys.exit(err)
    print(json.dumps(res, ensure_ascii=False, indent=1))
