#!/usr/bin/env python3
"""Export the slice the film animates: one test request, one layer, generated tokens N..2N (after N tokens of warm-up), with what a GPU cache
of C experts holds before each token under the 'decay' predictor (analysis.py), and hit flags.
usage: python3 export_anim.py TRACE_DIR [--layer 46] [--n 40] [--cap 32] -> film/anim.json"""
import os, sys, json, glob, argparse
import analysis as A


def export(trace_dir, layer, n, cap, out):
    files = sorted(glob.glob(os.path.join(trace_dir, '*.json')))
    tr, te = A.split(files)
    reqs = []
    for f in tr:
        s, err = A.load(f)
        if err:
            return None, err
        reqs.append(s)
    pop = A.popularity(reqs)
    pick = next((f for f in te if 'livecodebench' in f), te[0])
    steps, err = A.load(pick)
    if err:
        return None, err
    score = [.02 * pop[layer][e] / max(1, sum(pop[layer].values())) * A.E for e in range(A.E)]
    frames, hits = [], 0
    for i, tok in enumerate(steps[:n * 2]):
        ex = tok[layer]
        resident = sorted(sorted(range(A.E), key=lambda e: -score[e])[:cap])
        h = [e in resident for e in ex]
        if i >= n:                      # the second window: the cache is warm (the first n tokens only warm it up)
            hits += sum(h); frames.append({'experts': ex, 'resident': resident, 'hit': h})
        for e in range(A.E):
            score[e] *= .8
        for e in ex:
            score[e] += 1
    res = {'request': os.path.basename(pick), 'layer': layer, 'cap': cap, 'frames': frames, 'hit_rate_slice': round(hits / (8 * len(frames)), 3)}
    json.dump(res, open(out, 'w'))
    return res, None


if __name__ == '__main__':
    ap = argparse.ArgumentParser(); ap.add_argument('trace_dir'); ap.add_argument('--layer', type=int, default=46)
    ap.add_argument('--n', type=int, default=40); ap.add_argument('--cap', type=int, default=32)
    a = ap.parse_args()
    res, err = export(a.trace_dir, a.layer, a.n, a.cap, os.path.join(os.path.dirname(os.path.abspath(__file__)), 'film', 'anim.json'))
    if err:
        sys.exit(err)
    print(res['request'], 'layer', res['layer'], 'slice hit', res['hit_rate_slice'])
