"""Timeline planner for L01-02: plan.json (voice order, breaths, panel arrivals) + TTS lengths + clip lengths
-> EP/timeline.json. Rules measured on L01-01 (slot = take + 0.4 s; pK 0.6 s before its first line; title inside
the first line; endCard 0.5 s after the last line; dur = endCard + 4 s; sounds by rule; the music bed).
    ~/miniforge3/bin/python3 plan.py EP_DIR TTS_DIR CLIP_DIR
plan.json: {"order": [{"id": "n0"}, {"id": "c1", "pre": 0.3}, {"panel": 1, "id": "n1", "pre": 1.0}, ...],
            "lead": 0.6, "extra": {"name": ["n3", 0.4]}, "tapes": [3, 6], "impacts": ["n5", ...]}
"""
import json, os, subprocess, sys


def dur_of(path):
    """Returns (seconds, None) or (None, 'error')."""
    try:
        out = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path],
                             capture_output=True, text=True, check=True).stdout.strip()
        return float(out), None
    except (subprocess.CalledProcessError, ValueError, OSError) as e:
        return None, 'ffprobe failed on %s: %s' % (path, e)


def plan(ep, tts, clips):
    """Returns (timeline dict, None) or (None, 'error')."""
    try:
        P = json.load(open(os.path.join(ep, 'plan.json')))
    except (OSError, ValueError) as e:
        return None, 'plan.json: %s' % e
    lead, pad = P.get('lead', 0.6), 0.4
    t, vo, cue, last_p = P.get('start', 0.5), [], {}, -9.0
    lens = {}
    for k, o in enumerate(P['order']):
        i = o['id']
        f = os.path.join(clips, i.upper() + '.wav') if i[0] == 'c' else os.path.join(tts, 'en', i + '.mp3')
        d, err = dur_of(f)
        if err:
            return None, err
        t += o.get('pre', 0.0)
        if 'panel' in o:
            p = round(t - o.get('lead', lead), 2)
            if p < last_p + 1.3:
                t += last_p + 1.3 - p
                p = round(t - o.get('lead', lead), 2)
            cue['p%d' % o['panel']] = p
            last_p = p
        vo.append({'id': i, 't': round(t, 2)})
        lens[i] = d
        t += d + pad + (P.get('afterClip', 0.8) if i[0] == 'c' else 0.0)
    end_last = vo[-1]['t'] + lens[vo[-1]['id']]
    cue['title'] = round(vo[0]['t'] + 0.6 * lens[vo[0]['id']], 2)
    for name, (ref, off) in P.get('extra', {}).items():
        base = next(v['t'] for v in vo if v['id'] == ref)
        cue[name] = round(base + off, 2)
    cue['endCard'] = round(end_last + 0.5 + P.get('tail', 0.0), 2)
    dur = round(cue['endCard'] + 4.0, 2)
    cue['dur'] = dur
    sfx = []
    for k, v in sorted(cue.items(), key=lambda kv: kv[1]):
        if k[0] == 'p' and k[1:].isdigit():
            sfx.append({'t': round(v + 0.2, 2), 'f': 'rpg/Audio/bookFlip2.ogg', 'g': 0.22})
    for k in P.get('tapes', []):
        sfx.append({'t': cue['tape%d' % k] if 'tape%d' % k in cue else round(cue['p%d' % k] + 1.0, 2),
                    'f': 'rpg/Audio/cloth3.ogg', 'g': 0.35})
    for name in P.get('impacts', []):
        sfx.append({'t': cue[name], 'f': 'imp/Audio/impactPlank_medium_002.ogg', 'g': 0.28})
    sfx.append({'t': cue['endCard'], 'f': 'rpg/Audio/bookPlace1.ogg', 'g': 0.3})
    sfx.sort(key=lambda s: s['t'])
    tl = {'_': 'L01-02 timeline, written by ~/picasso-work/daily/L01-02/plan.py from plan.json, the TTS takes and the clips.',
          'fps': 30, 'dur': dur, 'cue': cue, 'vo': vo, 'sfx': sfx,
          'music': [{'f': 'music/Investigations.mp3', 'start': 0, 'from': 0, 'gain': 0.26, 'duck': 0.4,
                     'loop': [22.19, 32.3], 'xfade': 2.0, 'fadeOut': [round(dur - 2.5, 2), dur]}]}
    return tl, None


if __name__ == '__main__':
    ep, tts, clips = sys.argv[1:4]
    tl, err = plan(ep, os.path.expanduser(tts), os.path.expanduser(clips))
    if err:
        sys.exit(err)
    json.dump(tl, open(os.path.join(ep, 'timeline.json'), 'w'), indent=1)
    print('dur %.1f s, %d voices, cues: %s' % (tl['dur'], len(tl['vo']),
          ' '.join('%s=%.1f' % kv for kv in tl['cue'].items() if kv[0][0] == 'p' or kv[0] in ('title', 'endCard'))))
