#!/usr/bin/env python3
"""Hot-topic post (Strata: a 125B MoE "on one RTX 4090", experts kept in system RAM): what the lab's own released
traces say about keeping only part of an MoE on the GPU.

Data: expert-selection traces of Qwen3-235B-A22B-FP8 from "Patterns behind Chaos" (ISCA'26), Hugging Face
core12345/MoE_expert_selection_trace (gated). One file = one request: step 0 is the prompt (prefill), steps 1.. are
generated tokens; each step maps layer (94 layers) -> tokens -> the 8 chosen experts (of 128).

Simulation (decode tokens only): every layer has a GPU cache of C experts; a chosen expert not in the cache is a miss
and must be copied over PCIe. Policies:
  lru      - load on demand, evict the least recently used (what offloading engines typically do)
  popular  - keep the C experts that were most popular on the training half of the requests, fixed
  forecast - before each token, hold the experts the previous token used plus the most popular ones (temporal + global
             pattern; a simplified version of the paper's forecasting idea, not its exact method)
  decay    - score every expert by its recently decayed use in this request plus a small global-popularity prior, hold
             the top C (another simple predictor, also not the paper's method)
  random   - what a cache of C would hit if experts were chosen uniformly at random: C / 128
Requests are split in two halves by file name hash: popularity is learned on one half, measured on the other.

usage: python3 analysis.py TRACE_DIR [--cap 32] [--out results.json]
"""
import os, sys, json, glob, argparse, hashlib
from collections import OrderedDict, Counter

E, K, LAYERS = 128, 8, 94
EXPERT_BYTES = 3 * 4096 * 1536          # Qwen3-235B: hidden 4096, expert FFN 1536, 3 matrices, FP8 = 1 byte/param
PCIE_GBPS = 25.0                        # PCIe 4.0 x16, effective


def load(path):
    try:
        d = json.load(open(path))
    except (OSError, ValueError) as e:
        return None, '%s: %s' % (path, e)
    steps = []
    for st in d[1:]:                    # decode steps only
        if len(st) != LAYERS:
            continue
        steps.append([st[str(l)][0] for l in range(LAYERS)])
    return steps, None


def split(files):
    tr, te = [], []
    for f in files:
        (tr if int(hashlib.md5(os.path.basename(f).encode()).hexdigest(), 16) % 2 == 0 else te).append(f)
    return tr, te


def popularity(reqs):
    cnt = [Counter() for _ in range(LAYERS)]
    for steps in reqs:
        for tok in steps:
            for l, ex in enumerate(tok):
                cnt[l].update(ex)
    return cnt


def simulate(reqs, policy, cap, pop):
    hits = total = 0
    top = [[e for e, _ in pop[l].most_common(cap)] for l in range(LAYERS)]
    for steps in reqs:
        lru = [OrderedDict() for _ in range(LAYERS)]
        score = [[.02 * pop[l][e] / max(1, sum(pop[l].values())) * E for e in range(E)] for l in range(LAYERS)]
        prev = [None] * LAYERS
        for tok in steps:
            for l, ex in enumerate(tok):
                if policy == 'popular':
                    resident = set(top[l])
                elif policy == 'decay':
                    resident = set(sorted(range(E), key=lambda e: -score[l][e])[:cap])
                elif policy == 'forecast':
                    resident = set(prev[l] or [])
                    for e in top[l]:
                        if len(resident) >= cap:
                            break
                        resident.add(e)
                else:
                    resident = set(lru[l])
                for e in ex:
                    total += 1
                    hits += e in resident
                if policy == 'lru':
                    c = lru[l]
                    for e in ex:
                        c.pop(e, None); c[e] = True
                        while len(c) > cap:
                            c.popitem(last=False)
                if policy == 'decay':
                    sc = score[l]
                    for e in range(E):
                        sc[e] *= .8
                    for e in ex:
                        sc[e] += 1
                prev[l] = ex
    return hits / max(1, total)


def concentration(pop, frac=.25):
    k = int(E * frac); vals = []
    for c in pop:
        tot = sum(c.values()) or 1
        vals.append(sum(v for _, v in c.most_common(k)) / tot)
    return sum(vals) / len(vals)


def run(trace_dir, cap, out):
    files = sorted(glob.glob(os.path.join(trace_dir, '*.json')))
    if not files:
        return None, 'no traces in ' + trace_dir
    tr, te = split(files)
    reqs_tr, reqs_te = [], []
    for f in tr + te:
        steps, err = load(f)
        if err:
            return None, err
        (reqs_tr if f in tr else reqs_te).append(steps)
    pop = popularity(reqs_tr)
    res = {'model': 'Qwen3-235B-A22B-FP8', 'requests': {'train': len(reqs_tr), 'test': len(reqs_te)},
           'decode_tokens_test': sum(len(s) for s in reqs_te), 'cache_per_layer': cap, 'experts_per_layer': E,
           'top25_share': round(concentration(pop), 3), 'policies': {}}
    for p in ('random', 'popular', 'lru', 'forecast', 'decay'):
        h = cap / E if p == 'random' else simulate(reqs_te, p, cap, pop)
        miss_gb = (1 - h) * K * LAYERS * EXPERT_BYTES / 1e9
        res['policies'][p] = {'hit': round(h, 4), 'gb_per_token': round(miss_gb, 3), 'max_tok_s_pcie': round(PCIE_GBPS / max(miss_gb, 1e-9), 2)}
    json.dump(res, open(out, 'w'), indent=1)
    return res, None


if __name__ == '__main__':
    ap = argparse.ArgumentParser(); ap.add_argument('trace_dir'); ap.add_argument('--cap', type=int, default=32); ap.add_argument('--out', default='results.json')
    a = ap.parse_args()
    res, err = run(a.trace_dir, a.cap, a.out)
    if err:
        sys.exit(err)
    print(json.dumps(res, indent=1))
