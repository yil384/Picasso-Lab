#!/usr/bin/env python3
"""The lab's anime opening: one anime keyframe per member from their photo (Seedream), then one shot per member
animated from that keyframe (Seedance image-to-video). Big files live in ~/picasso-work/labop (stills/, clips/,
costs.csv), the member photos in ~/picasso-work/labop/refs.

    ~/miniforge3/bin/python3 gen.py still ID [ID ...]      keyframes (0.3 yuan each)
    ~/miniforge3/bin/python3 gen.py clip ID [ID ...]       5 s shots from the keyframes (about 2.5 yuan each at 720p)
    ~/miniforge3/bin/python3 gen.py cost                   what the film has spent
ID 'all' = every member in cast.json. A still or clip that exists is skipped (delete it to redo it).
"""
import json, os, sys
from concurrent.futures import ThreadPoolExecutor
import ark

HERE = os.path.dirname(os.path.abspath(__file__))
WORK = os.path.expanduser('~/picasso-work/labop')
CAST = json.load(open(os.path.join(HERE, 'cast.json')))
EP = 'labop'


def member(i):
    m = [c for c in CAST['cast'] if c['id'] == i]
    return (m[0], None) if m else (None, f'no member {i} in cast.json')


def still(i):
    """One keyframe. Returns (path, None) or (None, error)."""
    m, err = member(i)
    if err:
        return None, err
    out = os.path.join(WORK, 'stills', i + '.jpg')
    if os.path.exists(out):
        return out, None
    img, err = ark.image(ark.IMAGE_PRO, CAST['style'] + ' ' + m['scene'], '2048x1152',
                         refs=[os.path.join(WORK, 'refs', m['ref'])], episode=EP, item=i, kind='image')
    if err:
        return None, f'{i}: {err}'
    os.makedirs(os.path.dirname(out), exist_ok=True)
    open(out, 'wb').write(img)
    return out, None


def clip(i):
    """One 5 s shot from the keyframe. Returns (path, None) or (None, error)."""
    m, err = member(i)
    if err:
        return None, err
    out = os.path.join(WORK, 'clips', i + '.mp4')
    if os.path.exists(out):
        return out, None
    first = os.path.join(WORK, 'stills', i + '.jpg')
    if not os.path.exists(first):
        return None, f'{i}: no keyframe yet'
    tid, err = ark.video_submit(ark.VIDEO_MINI, CAST['motion'] + ' ' + m['move'], first, 5, episode=EP, item=i,
                                ratio='16:9', resolution='720p', audio=False)
    if err:
        return None, f'{i}: {err}'
    return ark.video_wait(tid, ark.VIDEO_MINI, 5, out, episode=EP, item=i)


def main():
    if len(sys.argv) < 2 or sys.argv[1] not in ('still', 'clip', 'cost'):
        sys.exit(__doc__)
    if sys.argv[1] == 'cost':
        print(f'{ark.spent(EP, day=None):.2f} yuan today; rows in {ark.COSTS}')
        tot = sum(float(r['yuan'] or 0) for r in ark._rows() if r['episode'] == EP)
        print(f'{tot:.2f} yuan in all')
        return
    ids = [c['id'] for c in CAST['cast']] if sys.argv[2:] == ['all'] else sys.argv[2:]
    fn = still if sys.argv[1] == 'still' else clip
    with ThreadPoolExecutor(4) as ex:
        for i, (path, err) in zip(ids, ex.map(fn, ids)):
            print(f'{i}: {err or path}', flush=True)


if __name__ == '__main__':
    main()
