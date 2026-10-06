"""Writes episodes/l01-02/episode.json and strings.json (the L01-02 film as kit-lesson data).
    ~/miniforge3/bin/python3 build_ep.py      (run from .claude/films/edu)
"""
import json, os, re

EP = 'episodes/l01-02'
S = {}          # strings.en
PANELS = []


def key(k, v):
    if k.startswith('title.'):
        S.setdefault('title', ['', ''])[int(k[6:])] = v
        return k
    k = k.replace('.', '_')
    S[k] = v
    return k


def lab(k, text, xy, px=56, **kw):
    return dict(t='label', text=key(k, text), xy=xy, px=px, **kw)


def card_tile(k, text, cx, cy, w, h, at, px=64, seed=1, color='ink', dur=0.35, rid=None):
    """A letter tile: a note card with lettering. Returns two items."""
    c = dict(t='card', rect=[round(cx - w / 2), round(cy - h / 2), round(cx + w / 2), round(cy + h / 2)],
             seed=seed, r=10, lw=3, dur=dur)
    l = dict(t='label', text=key(k, text), xy=[round(cx), round(cy + px * 0.12)], px=px, font='latin', color=color,
             dur=0.25)
    if at is not None:
        c['at'] = at
        l['at'] = at + '+%.2f' % (dur * 0.6)
    if rid:
        c['id'] = rid
    return [c, l]


# ---------------------------------------------------------------- strings shared
S.update({
    'mic': 'Prof. Ding · lecture 1',
    'end': ["After Prof. Yufei Ding's CSE 291P, Lecture 1", 'Text becomes numbers.', 'UC San Diego · Picasso Lab'],
    'fine': ['Sennrich, Haddow & Birch, ACL 2016; Kudo, ACL 2018; Kudo & Richardson, EMNLP 2018; Petrov et al., NeurIPS 2023.',
             'Token counts computed with tiktoken (cl100k_base, o200k_base). The narration is a synthetic voice.'],
})

# ---------------------------------------------------------------- P0 cover
PANELS.append({'id': 'p0', 'note': 'the cover: the tokenizer as a hand-crank mill (frame 0 complete)', 'items': [
    {'id': 'mill', 't': 'draw', 'd': 'mill', 'xy': [560, 1090], 'w': 920},
    {'t': 'wash', 'c': 'cobalt', 'xy': ['mill', 0.8, 0.86], 'w': 440, 'a': 0.55, 'rot': 0.1},
    {'t': 'wash', 'c': 'yellow', 'xy': ['mill', 0.2, 0.25], 'w': 360, 'a': 0.45},
    lab('title.0', 'How text', [70, 365], 150, align='left', rot=-0.03),
    dict(lab('title.1', 'becomes numbers', [84, 488], 112, color='red', align='left', rot=-0.03), id='title2'),
    {'t': 'underline', 'of': 'title2', 'dx': 6, 'dy': 62, 'rise': -8, 'bend': 0.03, 'at': 'title', 'dur': 0.6},
    {'t': 'sans', 'text': key('strip', 'CSE 291P · Lecture 1 · UC San Diego'), 'xy': [86, 616], 'px': 28, 'a': 0.78,
     'align': 'left'},
    lab('hook', '7 tokens or 1?', [86, 700], 76, color='red', font='latin', align='left', rot=-0.03),
]})

# ---------------------------------------------------------------- P1 the question: seven clippings vs one
CH = [(30, 101), (105, 187), (187, 265), (266, 345), (346, 425), (424, 503), (509, 582)]
V0, VH, ZW = 10 / 115, 95 / 115, 640
it = [lab('q4', "GPT-4's tokenizer: 7 tokens", [440, 625], 58, at='p1+0.3')]
for k, (a, b) in enumerate(CH):
    it.append({'t': 'clipping', 'slide': 'zh', 'crop': [a / ZW, V0, (b - a) / ZW, VH], 'from': [540, 1500],
               'to': [126 + 138 * k, 790], 'w0': 60, 'w': 118, 'rot0': 0.2, 'rot': 0.02 * ((k % 3) - 1),
               'at': 'p1+0.6+%.2f' % (0.16 * k), 'fly': 0.5, 'tapes': []})
it += [lab('q4o', "GPT-4o's tokenizer: 1 token", [540, 1000], 58, color='red', at='n2+2.6'),
       {'t': 'clipping', 'slide': 'zh', 'crop': [30 / ZW, V0, 552 / ZW, VH], 'from': [540, 1500], 'to': [540, 1140],
        'w0': 140, 'w': 640, 'rot0': -0.1, 'rot': -0.015, 'at': 'n2+3.0', 'fly': 0.6,
        'tapes': [{'i': 2, 'dx': -0.46, 'dy': -0.07, 'w': 130, 'rot': -0.4, 'at': 'n2+3.5'},
                  {'i': 6, 'dx': 0.46, 'dy': -0.07, 'w': 120, 'rot': 0.4, 'at': 'n2+3.6'}]},
       {'t': 'wash', 'c': 'cobalt', 'xy': [540, 1140], 'w': 700, 'h': 200, 'a': 0.35, 'at': 'n2+3.4'},
       lab('qmark', '?', [960, 1010], 120, color='red', font='latin', at='n2+5'),
       {'t': 'ring', 'xy': [960, 990], 'r': [70, 80], 'seed': 4, 'at': 'n2+5.3', 'dur': 0.5}]
PANELS.append({'id': 'p1', 'note': 'the puzzle: the seven characters cut out of her slide 19, 7 tokens vs 1 (C1)', 'items': it})

# ---------------------------------------------------------------- P2 the cabinet
PL = {'r': [0.105, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8], 'c': [0.26, 0.38, 0.49, 0.61, 0.72, 0.83]}
nums = [('d0', '0', 0, 0), ('d13', '13', 1, 2), ('d82', '82', 2, 5)]
it = [lab('vocab', 'a fixed vocabulary', [540, 352], 72, at='p2+0.6'),
      {'id': 'cab', 't': 'draw', 'd': 'catalog', 'xy': [580, 890], 'w': 720, 'at': 'p2+0.5', 'dur': 2.8},
      {'t': 'wash', 'c': 'cobalt', 'xy': ['cab', 0.56, 0.47], 'w': 300, 'a': 0.5, 'at': 'n4@drawers'},
      {'t': 'wash', 'c': 'peach', 'xy': ['cab', 0.3, 0.75], 'w': 420, 'a': 0.3, 'at': 'p2+2.4'}]
for k, (kk, txt, r, c) in enumerate(nums):
    it.append(lab(kk, txt, ['cab', PL['c'][c], PL['r'][r], 0, 6], 44, color='red', font='latin',
                  at='n4@numbered+%.2f' % (0.25 * k), dur=0.3))
it += [lab('enc_0', 'Hello', [130, 600], 64, font='latin', at='n5@text'),
       {'t': 'arrow', 'from': [150, 640], 'to': ['cab', 0.5, 0.47], 'bend': -0.25, 'lw': 6, 'at': 'n5@numbers-0.4', 'dur': 0.5},
       lab('d9906', '9906', ['cab', 0.74, 0.47], 66, color='red', font='latin', at='n5@numbers', patch=0.35),
       lab('tokIs', 'one token', ['cab', 0.74, 0.47, 0, 66], 44, color='red', at='n5@token', patch=0.35)]
PANELS.append({'id': 'p2', 'note': 'the vocabulary as a card catalogue; drawer numbers are real cl100k_base ids of the sample sentence', 'items': it})

# ---------------------------------------------------------------- P3 the sample sentence as 13 tiles
pieces = ['Hello', 'students', '!', 'Token', 'ization', 'is', 'the', 'foundation', 'of', 'L', 'LM', 's', '.']
rows = [[0, 1, 2], [3, 4, 5, 6], [7, 8, 9, 10, 11, 12]]
ys = [600, 790, 980]
it = [lab('c55', '55 characters', [300, 420], 58, at='n6@55'),
      lab('t13', '13 tokens', [780, 420], 64, color='red', at='n6@13')]
pos = {}
for r, idx in enumerate(rows):
    ws = [max(74, 33 * len(pieces[i]) + 44) for i in idx]
    tot = sum(ws) + 16 * (len(ws) - 1)
    x = 540 - tot / 2
    for i, w in zip(idx, ws):
        cx = x + w / 2
        pos[i] = (cx, ys[r], w)
        it += card_tile('pc.%d' % i, pieces[i], cx, ys[r], w, 120, 'n6@hello+%.2f' % (0.28 * i), seed=30 + i)
        x += w + 16
for i, wd in [(4, 'ization'), (9, 'l'), (10, 'lm'), (11, 's')]:
    cx, cy, w = pos[i]
    it.append({'t': 'ring', 'xy': [round(cx), cy], 'r': [round(w / 2 + 18), 78], 'seed': 40 + i, 'at': 'n7@%s' % wd,
               'dur': 0.45, 'lw': 5})
it += [{'t': 'wash', 'c': 'yellow', 'xy': [540, 790], 'w': 900, 'h': 520, 'a': 0.3, 'at': 'p3+0.6'},
       lab('notWord', 'a token is not always a word', [540, 1170], 56, color='red', at='n7@sometimes')]
PANELS.append({'id': 'p3', 'note': 'her sample sentence as 13 tiles (cl100k_base pieces, FACTS computed block)', 'items': it})

# ---------------------------------------------------------------- P4 everything is counted in tokens
it = [{'id': 'rc', 't': 'draw', 'd': 'receipt', 'xy': [800, 900], 'w': 500, 'at': 'p4+0.6', 'dur': 2.2},
      {'t': 'wash', 'c': 'peach', 'xy': ['rc', 0.5, 0.4], 'w': 360, 'a': 0.4, 'at': 'p4+1.4'},
      lab('rTitle', 'counted in tokens', [70, 380], 84, align='left', font='latin', at='p4+0.5')]
for k, (w, a, b) in enumerate([('prices', 'price', 'per token'), ('context', 'context window', 'in tokens'),
                               ('work', 'work', 'for every token')]):
    y = 560 + 200 * k
    it += [lab('rk.%d' % k, a, [80, y], 52, align='left', at='n8@%s' % w),
           lab('rv.%d' % k, b, [80, y + 70], 66, align='left', color='red', font='latin', at='n8@%s+0.4' % w)]
it.append({'t': 'wash', 'c': 'yellow', 'xy': [240, 920], 'w': 380, 'h': 130, 'a': 0.45, 'at': 'n8@work+0.6'})
PANELS.append({'id': 'p4', 'note': 'prices, context and work are counted in tokens (C2b)', 'items': it})

# ---------------------------------------------------------------- P5 the balance
it = [lab('bTitle', 'fewer = cheaper', [80, 380], 84, align='left', at='n9'),
      {'id': 'bal', 't': 'draw', 'd': 'balance', 'xy': [540, 930], 'w': 900, 'at': 'p5+0.5', 'dur': 2.2},
      lab('bL', ['fewer', 'tokens'], ['bal', 0.13, 0.04], 50, at='n9+0.6', patch=0.3, rows={'dy': 54, 'dt': 0.3}),
      {'t': 'wash', 'c': 'cobalt', 'xy': ['bal', 0.17, 0.62], 'w': 300, 'a': 0.45, 'at': 'n9+0.8'},
      lab('bR', ['learns', 'something'], ['bal', 0.87, 0.04], 50, color='red', at='n10@learn', patch=0.3, rows={'dy': 54, 'dt': 0.3}),
      {'t': 'wash', 'c': 'coral', 'xy': ['bal', 0.83, 0.62], 'w': 300, 'a': 0.45, 'at': 'n10@learn+0.3'},
      lab('bQ', 'which drawers?', [540, 1200], 56, color='red', at='n10@which')]
PANELS.append({'id': 'p5', 'note': 'fewer tokens vs learning something (C3)', 'items': it})

# ---------------------------------------------------------------- P6 word-level
it = [lab('w1', '1 · whole words', [80, 370], 84, align='left', at='n11@one'),
      {'id': 'lost', 't': 'draw', 'd': 'lost', 'xy': [520, 930], 'w': 860, 'at': 'p6+0.5', 'dur': 2.6},
      {'t': 'wash', 'c': 'peach', 'xy': ['lost', 0.5, 0.55], 'w': 520, 'a': 0.35, 'at': 'p6+1.6'},
      lab('typo', 'tokenizaton', ['lost', 0.76, 0.05], 50, color='red', font='latin', rot=-0.08, at='n12@typo',
          patch=0.3),
      {'t': 'arrow', 'from': ['lost', 0.8, 0.09], 'to': ['lost', 0.74, 0.2], 'bend': 0.2, 'lw': 5,
       'at': 'n12@typo+0.4', 'dur': 0.35},
      lab('wHuge', 'huge list', ['lost', 0.13, 0.27], 54, color='red', at='n12@huge'),
      {'t': 'arrow', 'from': ['lost', 0.13, 0.31], 'to': ['lost', 0.22, 0.43], 'bend': 0.2, 'lw': 5, 'at': 'n12@huge+0.3', 'dur': 0.35},
      lab('wNot', 'not in the list', ['lost', 0.76, 0.05, 0, 58], 40, color='red', at='n12@isnt', patch=0.3)]
PANELS.append({'id': 'p6', 'note': 'whole words: the dictionary is huge and a typo is missing (C5b)', 'items': it})

# ---------------------------------------------------------------- P7 character-level
it = [lab('w2', '2 · single characters', [80, 370], 84, align='left', at='n13@two'),
      {'id': 'rib', 't': 'draw', 'd': 'ribbon', 'xy': [540, 900], 'w': 1030, 'at': 'p7+0.4', 'dur': 3.0},
      {'t': 'wash', 'c': 'cobalt', 'xy': ['rib', 0.75, 0.75], 'w': 560, 'a': 0.4, 'at': 'p7+2.2'},
      lab('r55', '55 characters', ['rib', 0.62, 0.1], 58, color='red', at='n13@long', patch=0.3),
      lab('r13', 'instead of 13 tokens', ['rib', 0.62, 0.1, 0, 66], 44, at='n13@long+0.6', patch=0.3),
]
for k, ch in enumerate('Hello students! Token'):
    if ch != ' ':
        it += card_tile('ch.%d' % k, ch, 80 + 44.5 * k, 470, 40, 56, 'n13@character+%.2f' % (0.05 * k), px=36, seed=400 + k)
it.append(lab('chMore', '...', [1030, 480], 40, font='latin', at='n13@long'))
PANELS.append({'id': 'p7', 'note': 'single characters: a ribbon that coils on the floor', 'items': it})

# ---------------------------------------------------------------- P8 her slide 15
it = [{'t': 'pen', 'pts': [['sl:px', 73, 462], ['sl:px', 293, 462]], 'at': 'tape8+0.2', 'dur': 0.4, 'lw': 5},
      {'t': 'pen', 'pts': [['sl:px', 66, 762], ['sl:px', 383, 762]], 'at': 'tape8+0.45', 'dur': 0.4, 'lw': 5},
      {'t': 'ring', 'xy': ['sl:px', 1264, 455], 'r': [70, 30], 'seed': 3, 'at': 'n14@bottomup', 'dur': 0.5, 'lw': 5},
      {'t': 'pen', 'pts': [['sl:px', 1336, 598], ['sl:px', 1506, 598]], 'at': 'n14@sennrich', 'dur': 0.4, 'lw': 5},
      {'t': 'pen', 'pts': [['sl:px', 764, 638], ['sl:px', 859, 638]], 'at': 'n14@sennrich+0.3', 'dur': 0.3, 'lw': 5},
      {'t': 'ring', 'xy': ['sl:px', 851, 770], 'r': [70, 30], 'seed': 5, 'at': 'n15@topdown', 'dur': 0.5, 'lw': 5},
      {'t': 'pen', 'pts': [['sl:px', 764, 994], ['sl:px', 976, 994]], 'at': 'n15@kudo', 'dur': 0.4, 'lw': 5},
      {'t': 'pen', 'pts': [['sl:px', 992, 934], ['sl:px', 1482, 931]], 'at': 'n16@gemini', 'dur': 0.5, 'lw': 6},
      {'t': 'wash', 'c': 'yellow', 'xy': ['sl:px', 1270, 1040], 'w': 330, 'h': 110, 'a': 0.5, 'at': 'n16@sentencepiece'},
      lab('gem', ['SentencePiece, yes;', 'Unigram: not stated'], ['sl:px', 1270, 1012], 34, color='red',
          at='n16@sentencepiece', rows={'dy': 38, 'dt': 0.9}, rot=-0.02),
      {'t': 'arrow', 'from': ['sl:px', 1110, 1000], 'to': ['sl:px', 1120, 950], 'bend': -0.3, 'lw': 4,
       'at': 'n16@unigram+0.6', 'dur': 0.4}]
PANELS.append({'id': 'p8', 'kind': 'slide', 'note': 'her slide 15 taped; the pen corrects the Gemini/Unigram line (FACTS T8)',
               'slide': {'src': 's15', 'tape': 'tape8', 'label': key('slide15', 'her slide 15')},
               'camera': [{'at': 'n14@subwords+0.2', 'xy': [540, 960], 'z': 1.0}, {'at': 'n14@subwords+1.2', 'xy': [731, 960], 'z': 1.7},
                          {'at': 'n16.end', 'xy': [731, 960], 'z': 1.7}, {'at': 'n16.end+0.8', 'xy': [540, 960], 'z': 1.0}], 'items': it})

# ---------------------------------------------------------------- P9 the recipe
steps = ['split into letters', 'count neighbouring pairs', 'glue the most frequent pair', 'repeat until big enough']
it = [lab('recipe', 'the recipe', [80, 360], 84, align='left', at='n17@recipe'),
      {'t': 'sans', 'text': key('gage', 'BPE began in 1994 as a data-compression trick'), 'xy': [86, 440], 'px': 28,
       'a': 0.8, 'align': 'left', 'at': 'n17@in1994'},
      {'id': 'glue', 't': 'draw', 'd': 'glue', 'xy': [540, 700], 'w': 960, 'at': 'p9+0.5', 'dur': 2.4},
      lab('ge', 'e', ['glue', 0.44, 0.39], 80, font='latin', at='n18@glue'),
      lab('gs', 's', ['glue', 0.56, 0.39], 80, font='latin', at='n18@glue+0.15'),
      {'t': 'wash', 'c': 'yellow', 'xy': ['glue', 0.5, 0.4], 'w': 300, 'a': 0.5, 'at': 'n18@glue+0.3'}]
for k, (s, w) in enumerate(zip(steps, ['split', 'count', 'glue', 'repeat'])):
    y = 990 + 82 * k
    it += [lab('stn.%d' % k, str(k + 1), [120, y], 60, color='red', font='latin', at='n18@%s' % w),
           lab('st.%d' % k, s, [170, y], 52, align='left', at='n18@%s+0.1' % w)]
PANELS.append({'id': 'p9', 'note': 'BPE in four steps; the glue hands', 'items': it})

# ---------------------------------------------------------------- P10 her slide 17
it = [{'t': 'pen', 'pts': [['sl:px', 391, 402], ['sl:px', 522, 402]], 'at': 'n19@low', 'dur': 0.3, 'lw': 5},
      {'t': 'pen', 'pts': [['sl:px', 578, 402], ['sl:px', 734, 402]], 'at': 'n19@lower', 'dur': 0.3, 'lw': 5},
      {'t': 'pen', 'pts': [['sl:px', 789, 402], ['sl:px', 978, 402]], 'at': 'n19@newest', 'dur': 0.3, 'lw': 5},
      {'t': 'pen', 'pts': [['sl:px', 1033, 402], ['sl:px', 1208, 402]], 'at': 'n19@widest', 'dur': 0.3, 'lw': 5},
      {'t': 'ring', 'xy': ['sl:px', 505, 420], 'r': [40, 30], 'seed': 6, 'at': 'n19@13', 'dur': 0.5, 'lw': 5},
      lab('tie1', 'tie: (s, t) also 9', ['sl:px', 1180, 480], 40, color='red', at='p10+1.6', rot=-0.03, patch=0.3),
      lab('tie3', 'tie: (o, w) also 7', ['sl:px', 1180, 690], 40, color='red', at='p10+2.2', rot=-0.03, patch=0.3)]
PANELS.append({'id': 'p10', 'kind': 'slide', 'note': 'her slide 17 taped: the word list underlined, the two ties added in pen (T12, T14)',
               'slide': {'src': 's17', 'tape': 'tape10', 'label': key('slide17', 'her slide 17')},
               'camera': [{'at': 'p10+1.3', 'xy': [540, 960], 'z': 1.0}, {'at': 'p10+2.2', 'xy': [520, 840], 'z': 1.28},
                          {'at': 'n19.end', 'xy': [520, 840], 'z': 1.28}, {'at': 'n19.end+0.7', 'xy': [540, 960], 'z': 1.0}], 'items': it})

# ---------------------------------------------------------------- P11 the trace (code: tiles, rings, counts)
WORDS = [('low', 5), ('lower', 2), ('newest', 6), ('widest', 3)]
RY = [500, 640, 780, 920]
X0, P, TW = 210, 112, 100


def seg(word, merges):
    out = list(word)
    for m in merges:
        a, b = m
        i, o = 0, []
        while i < len(out):
            if i < len(out) - 1 and out[i] == a and out[i + 1] == b:
                o.append(a + b)
                i += 2
            else:
                o.append(out[i])
                i += 1
        out = o
    return out


def layer(merges, at, fade, tag):
    """The four rows segmented after `merges`; returns (items, tile boxes per row)."""
    its, boxes = [], []
    for r, (w, n) in enumerate(WORDS):
        x, row = X0, []
        for k, p in enumerate(seg(w, merges)):
            span = len(p) if p not in ('es', 'est', 'lo') else len(seg(p, []))
            tw = TW + P * (span - 1)
            row.append((x + tw / 2, RY[r], tw, p))
            x += tw + (P - TW)
        boxes.append(row)
        for k, (cx, cy, tw, p) in enumerate(row):
            red = len(p) > 1
            its += card_tile('tr.%s' % p, p, cx, cy, tw - 6, 110, None if at is None else at, px=64,
                             seed=100 + 10 * r + k, color='red' if red else 'ink')
    return its, boxes


it = [lab('mult.%d' % r, '×%d' % n, [120, RY[r] + 8], 58, color='red', font='latin', at='n19@%s' % w if False else 'p11+0.8+%.1f' % (0.3 * r))
      for r, (w, n) in enumerate(WORDS)]
L0, B0 = layer([], 'p11+0.6', None, 0)
L1, B1 = layer([('e', 's')], None, None, 1)
L2, B2 = layer([('e', 's'), ('es', 't')], None, None, 2)
L3, B3 = layer([('e', 's'), ('es', 't'), ('l', 'o')], None, None, 3)


def ring_pair(boxes, r, k, at, seed, dash=None):
    a, b = boxes[r][k], boxes[r][k + 1]
    cx = (a[0] - a[2] / 2 + b[0] + b[2] / 2) / 2
    w = (b[0] + b[2] / 2) - (a[0] - a[2] / 2)
    d = {'t': 'ring', 'xy': [round(cx), a[1]], 'r': [round(w / 2 + 16), 74], 'seed': seed, 'at': at, 'dur': 0.45, 'lw': 5}
    if dash:
        d['dash'] = dash
    return d


r1 = [ring_pair(B0, 2, 3, 'n21@es', 51), ring_pair(B0, 3, 3, 'n21@es+0.25', 52),
      lab('c1n', '6 + 3 = 9', [540, 1050], 60, color='red', font='latin', at='n21@6'),
      ring_pair(B0, 2, 4, 'n22@st', 53), ring_pair(B0, 3, 4, 'n22@st+0.25', 54),
      lab('c1t', 'a tie', [840, 1050], 54, color='red', at='n22@tie')]
r2 = [ring_pair(B1, 2, 3, 'n24@est', 55), ring_pair(B1, 3, 3, 'n24@est+0.25', 56),
      lab('c2n', '9', [540, 1050], 60, color='red', font='latin', at='n24@9times'),
      {'t': 'sans', 'text': key('stFirst', '(s-t first: st, then e + st = est, the same)'), 'xy': [540, 1100], 'px': 26,
       'a': 0.75, 'at': 'n24@9times+0.6'}]
r3 = [ring_pair(B2, 0, 0, 'n25@lo', 57), ring_pair(B2, 1, 0, 'n25@lo+0.25', 58),
      lab('c3n', '5 + 2 = 7', [540, 1050], 60, color='red', font='latin', at='n25@5plus'),
      ring_pair(B2, 0, 1, 'n25@ow', 59), ring_pair(B2, 1, 1, 'n25@ow+0.25', 60),
      lab('c3t', 'a tie', [840, 1050], 54, color='red', at='n25@ties')]
hdr = lambda k, t, at: lab('round.%d' % k, t, [80, 380], 76, align='left', at=at)
it += [{'t': 'group', 'at': 'p11+0.5', 'fadeOut': ['r1glue-0.2', 'r1glue+0.3'],
        'items': L0 + r1 + [hdr(1, 'round 1', 'n21@round')]},
       {'t': 'group', 'at': 'r1glue', 'fadeIn': ['r1glue-0.2', 'r1glue+0.3'], 'fadeOut': ['n24@est#2-0.2', 'n24@est#2+0.3'],
        'items': L1 + r2 + [hdr(2, 'round 2', 'r1glue')]},
       {'t': 'group', 'at': 'n24@est#2', 'fadeIn': ['n24@est#2-0.2', 'n24@est#2+0.3'], 'fadeOut': ['n25@lo#3-0.2', 'n25@lo#3+0.3'],
        'items': L2 + r3 + [hdr(4, 'round 3', 'n24@est#2+1.0')]},
       {'t': 'group', 'at': 'n25@lo#3', 'fadeIn': ['n25@lo#3-0.2', 'n25@lo#3+0.3'],
        'items': L3 + [hdr(5, 'stop: 13', 'n26'),
                       {'t': 'ring', 'xy': [round(B3[2][3][0]), RY[2]], 'r': [round(B3[2][3][2] / 2 + 16), 74], 'seed': 61,
                        'at': 'n27@est', 'dur': 0.45, 'lw': 5},
                       {'t': 'ring', 'xy': [round(B3[3][3][0]), RY[3]], 'r': [round(B3[3][3][2] / 2 + 16), 74], 'seed': 62,
                        'at': 'n27@est+0.25', 'dur': 0.45, 'lw': 5}]}]
# the vocabulary strip: 10 letters, then es, est, lo
VL = list('deilnorstw')
it.append(lab('vLab', 'vocabulary', [80, 1160], 40, align='left', at='n20@ten'))
for k, ch in enumerate(VL):
    it += card_tile('tr.%s' % ch, ch, 300 + 60 * k, 1150, 52, 64, 'n20@ten+%.2f' % (0.08 * k), px=40, seed=200 + k)
for k, (p, at) in enumerate([('es', 'r1glue+0.4'), ('est', 'n24@est#2+0.4'), ('lo', 'n25@lo#3+0.4')]):
    it += card_tile('tr.%s' % p, p, 360 + 110 * k, 1225, 96, 64, at, px=40, seed=220 + k, color='red')
it += [lab('fin13', '10 + 3 = 13', [780, 1232], 60, color='red', font='latin', at='final13'),
       {'t': 'wash', 'c': 'yellow', 'xy': [780, 1222], 'w': 340, 'h': 120, 'a': 0.5, 'at': 'final13+0.2'}]
PANELS.append({'id': 'p11', 'note': 'the BPE trace as letter tiles; three rounds, both ties ringed; the vocabulary grows 10 -> 13', 'items': it})

# ---------------------------------------------------------------- P12 her slide 19, the Chinese line under a flap
it = [{'t': 'group', 'fadeOut': ['n29@lifts', 'n29@lifts+0.4'], 'items': [
          {'id': 'flap', 't': 'cover', 'xy': ['sl:px', 335, 992], 'size': [310, 46], 'rot': 0.01, 'at': 'tape12+0.3',
           'dur': 0.3, 'tape': {'i': 3, 'dx': -150, 'dy': 0, 'w': 70, 'rot': 0.6, 'at': 'tape12+0.5'}}]},
      {'t': 'box', 'on': 'sl:px', 'rect': [104, 362, 1552, 416], 'at': 'n28@tiktoken', 'dur': 0.7, 'lw': 5},
      {'t': 'box', 'on': 'sl:px', 'rect': [104, 438, 1552, 492], 'at': 'n28@hugging', 'dur': 0.7, 'lw': 5},
      lab('readme', 'README: vs one older library', ['sl:px', 1320, 330], 34, color='red', at='n28@rust', patch=0.3),
      {'t': 'pen', 'pts': [['sl:px', 503, 688], ['sl:px', 650, 688]], 'at': 'n29@cl100kbase', 'dur': 0.4, 'lw': 5},
      {'t': 'ring', 'xy': ['sl:px', 785, 903], 'r': [34, 26], 'seed': 7, 'at': 'n29@13', 'dur': 0.4, 'lw': 5},
      {'t': 'ring', 'xy': ['sl:px', 437, 990], 'r': [150, 34], 'seed': 8, 'at': 'n29@china', 'dur': 0.5, 'lw': 5},
      {'t': 'wash', 'c': 'yellow', 'xy': ['sl:px', 437, 990], 'w': 330, 'h': 90, 'a': 0.5, 'at': 'n29@lifts+0.3'}]
PANELS.append({'id': 'p12', 'kind': 'slide', 'note': 'her slide 19 taped; the Chinese line under a paper flap until n29',
               'slide': {'src': 's19', 'tape': 'tape12', 'label': key('slide19', 'her slide 19')},
               'camera': [{'at': 'tape12+0.3', 'xy': [540, 960], 'z': 1.0}, {'at': 'tape12+1.2', 'xy': [540, 740], 'z': 1.25},
                          {'at': 'n29-0.3', 'xy': [540, 740], 'z': 1.25}, {'at': 'n29+0.8', 'xy': [331, 955], 'z': 1.9},
                          {'at': 'n29.end', 'xy': [331, 955], 'z': 1.9}, {'at': 'n29.end+0.7', 'xy': [540, 960], 'z': 1.0}], 'items': it})

# ---------------------------------------------------------------- P13 seven clippings -> one
grpA = [lab('z4', "GPT-4's tokenizer", [540, 500], 60, at='p13+0.4')]
for k, (a, b) in enumerate(CH):
    grpA.append({'t': 'clipping', 'slide': 'zh', 'crop': [a / ZW, V0, (b - a) / ZW, VH], 'from': [540, 300],
                 'to': [126 + 138 * k, 740], 'w0': 60, 'w': 118, 'rot0': 0.1, 'rot': 0.02 * ((k % 3) - 1),
                 'at': 'p13+0.6+%.2f' % (0.12 * k), 'fly': 0.5, 'tapes': []})
    grpA.append(lab('zn.%d' % k, str(k + 1), [126 + 138 * k, 910], 50, color='red', font='latin',
                    at='n30@7+%.2f' % (0.14 * k), dur=0.2))
grpA += [lab('z7', '7 tokens: one per character', [540, 1030], 60, color='red', at='n30@one'),
         {'t': 'wash', 'c': 'coral', 'xy': [540, 1030], 'w': 640, 'h': 130, 'a': 0.35, 'at': 'n30@one+0.3'}]
grpB = [lab('z4o', "GPT-4o's tokenizer", [540, 500], 60, at='glue1'),
        {'t': 'clipping', 'slide': 'zh', 'crop': [30 / ZW, V0, 552 / ZW, VH], 'from': [540, 740], 'to': [540, 750],
         'w0': 700, 'w': 860, 'rot0': 0, 'rot': -0.012, 'at': 'glue1', 'fly': 0.4,
         'tapes': [{'i': 2, 'dx': -0.47, 'dy': -0.07, 'w': 150, 'rot': -0.4, 'at': 'glue1+0.4'},
                   {'i': 6, 'dx': 0.47, 'dy': -0.07, 'w': 140, 'rot': 0.4, 'at': 'glue1+0.5'}]},
        lab('z1', '1 token', [540, 960], 84, color='red', font='latin', at='glue1+0.6'),
        {'t': 'wash', 'c': 'cobalt', 'xy': [540, 760], 'w': 900, 'h': 260, 'a': 0.4, 'at': 'glue1+0.4', 'dur': 1.2},
        lab('z17', 'a seventh of the tokens', [540, 1090], 60, at='n31@seventh')]
it = [{'t': 'group', 'at': 'p13+0.4', 'fadeOut': ['glue1-0.25', 'glue1+0.15'], 'items': grpA},
      {'t': 'group', 'at': 'glue1', 'items': grpB}]
PANELS.append({'id': 'p13', 'note': 'the payoff: seven clippings, one per token, glued into one (C9, C12b)', 'items': it})

# ---------------------------------------------------------------- P14 the bigger vocabulary
it = [{'id': 'cs', 't': 'draw', 'd': 'catalog', 'xy': [230, 980], 'w': 300, 'at': 'p14+0.4', 'dur': 1.8},
      {'id': 'cb', 't': 'draw', 'd': 'catalog', 'xy': [700, 880], 'w': 500, 'at': 'n32@vocabulary', 'dur': 2.4},
      lab('v100.0', 'about 100,000', [230, 720], 52, at='n32@100000'),
      lab('v100.1', 'cl100k_base', [230, 776], 40, color='red', font='latin', at='n32@100000+0.3'),
      lab('v200.0', 'about 200,000', [700, 400], 60, at='n32@200000'),
      lab('v200.1', 'o200k_base', [700, 460], 44, color='red', font='latin', at='n32@200000+0.3'),
      {'t': 'arrow', 'from': [260, 670], 'to': [470, 430], 'bend': -0.3, 'lw': 6, 'at': 'n32@200000+0.5', 'dur': 0.5},
      {'t': 'wash', 'c': 'cobalt', 'xy': ['cb', 0.5, 0.5], 'w': 560, 'a': 0.35, 'at': 'n32@room'},
      {'t': 'clipping', 'slide': 'zh', 'crop': [30 / ZW, V0, 552 / ZW, VH], 'from': [540, 1150], 'to': [640, 1212],
       'w0': 120, 'w': 300, 'rot0': 0.1, 'rot': -0.02, 'at': 'n32@whole', 'fly': 0.5,
       'tapes': [{'i': 1, 'dx': -0.48, 'dy': -0.06, 'w': 70, 'rot': -0.5, 'at': 'n32@whole+0.5'}]},
      {'t': 'arrow', 'from': [800, 1190], 'to': ['cb', 0.56, 0.52], 'bend': -0.3, 'lw': 6, 'at': 'n32@entry', 'dur': 0.5},
      lab('trend', ['the trend:', 'bigger vocabularies'], [70, 330], 44, color='red', align='left', fit=360, at='c11+0.5',
          rows={'dy': 52, 'dt': 0.5})]
S['trend'] = ['the trend:', 'bigger vocabularies']
PANELS.append({'id': 'p14', 'note': 'what changed: about 100,000 -> about 200,000 entries; room for the whole name (C11)', 'items': it})

# ---------------------------------------------------------------- P15 the honest limit
it = [lab('lim', 'one honest limit', [80, 380], 84, align='left', at='n33@honest'),
      lab('limS', 'the same text, translated', [540, 540], 56, at='n33@same')]
it.append({'t': 'card', 'rect': [100, 655, 170, 745], 'seed': 300, 'r': 10, 'lw': 3, 'at': 'n33@translated', 'dur': 0.35})
for k in range(15):
    it.append({'t': 'card', 'rect': [118 + 58 * k, 835, 166 + 58 * k, 925], 'seed': 310 + k, 'r': 10, 'lw': 3,
               'at': 'n33@15+%.2f' % (0.06 * k), 'dur': 0.3})
it += [lab('limA', 'one language', [200, 712], 46, align='left', at='n33@translated+0.2'),
       lab('limB', 'another language', [118, 975], 46, align='left', at='n33@15+1.0'),
       lab('limX', 'up to 15× the tokens', [540, 1080], 70, color='red', font='latin', at='n33@15+1.0'),
       {'t': 'wash', 'c': 'coral', 'xy': [540, 880], 'w': 920, 'h': 150, 'a': 0.35, 'at': 'n33@15+0.6'},
       {'t': 'sans', 'text': key('pet', 'Petrov, La Malfa, Torr & Bibi, NeurIPS 2023'), 'xy': [540, 1170], 'px': 28,
        'a': 0.8, 'at': 'n33@petrov'}]
PANELS.append({'id': 'p15', 'note': 'tokenizers favour some languages: up to 15x (Petrov et al. 2023)', 'items': it})

# ---------------------------------------------------------------- P16 recap and next
it = [lab('rc1', 'text becomes numbers', [540, 380], 84, font='latin', at='n34'),
      {'id': 'mill2', 't': 'draw', 'd': 'mill', 'xy': [540, 770], 'w': 760, 'at': 'p16+0.4', 'dur': 2.4},
      {'t': 'wash', 'c': 'cobalt', 'xy': ['mill2', 0.8, 0.86], 'w': 400, 'a': 0.5, 'at': 'p16+1.6'},
      lab('rc2', 'context, compute, price: all in tokens', [540, 1100], 48, fit=900, at='n34@context'),
      lab('nxt', 'next: how the model picks the next token', [540, 1215], 52, color='red', fit=860, at='n35')]
PANELS.append({'id': 'p16', 'note': 'recap; next episode (decoding)', 'items': it})

# ---------------------------------------------------------------- captions
VO = json.load(open(EP + '/vo_lines.json'))
CL = {('c' + c['id'][1:]).lower(): c['text'] for c in json.load(open(EP + '/clips.json'))}


def split_cap(t, lim=60, short=22):
    """Caption parts joined with |: sentences, long ones split in half at the comma (else the space) nearest the
    middle, then short parts merged into a neighbour while the result fits. Joined back with spaces = t."""
    def halve(p):
        if len(p) <= lim:
            return [p]
        cands = [i for i, c in enumerate(p) if c == ' ' and p[i - 1] in ',;:'] or [i for i, c in enumerate(p) if c == ' ']
        i = min(cands, key=lambda i: abs(i - len(p) / 2))
        return halve(p[:i]) + halve(p[i + 1:])
    parts = []
    for sent in re.split(r'(?<=[.?!])\s+', t):
        parts += halve(sent)
    changed = True
    while changed:
        changed = False
        for k, p in enumerate(parts):
            if len(p) >= short:
                continue
            opts = [j for j in (k + 1, k - 1) if 0 <= j < len(parts) and len(parts[j]) + 1 + len(p) <= lim]
            if opts:
                j = opts[0]
                a, b = sorted((k, j))
                parts[a:b + 1] = [parts[a] + ' ' + parts[b]]
                changed = True
                break
    assert ' '.join(parts) == t, t
    return '|'.join(parts)


tl = json.load(open(EP + '/timeline.json'))
S['cap'] = {}
for v in tl['vo']:
    i = v['id']
    text = next(l['en'] for l in VO if l['id'] == i) if i[0] == 'n' else CL[i]
    S['cap'][i] = split_cap(text)

E = json.load(open(EP + '/episode.json'))
E['assets'] = {'artDir': '/edu/art/cut', 'slideDir': 'slides',
               'drawings': {'mill': {'src': 'line_token_mill', 'w': 920}, 'catalog': {'src': 'line_card_catalog', 'w': 800},
                            'lost': {'src': 'line_lost_word', 'w': 860}, 'ribbon': {'src': 'line_long_ribbon', 'w': 1030},
                            'glue': {'src': 'line_glue_tiles', 'w': 960}, 'balance': {'src': 'line_balance', 'w': 900},
                            'receipt': {'src': 'line_receipt', 'w': 440}, 'mic': {'src': 'line_mic', 'w': 240, 'boost': 0.3}},
               'slides': {'s15': {'src': 'p15.png'}, 's17': {'src': 'p17.png'}, 's19': {'src': 'p19.png'},
                          'zh': {'src': 'p19_zh.png'}}}
E['mic'] = {'drawing': 'mic'}
E['end'] = {'at': 'endCard'}
E['panels'] = PANELS
json.dump(E, open(EP + '/episode.json', 'w'), ensure_ascii=False, indent=1)
json.dump({'en': S}, open(EP + '/strings.json', 'w'), ensure_ascii=False, indent=1)
print('panels', len(PANELS), 'strings', len(S), 'caps', len(S['cap']))
