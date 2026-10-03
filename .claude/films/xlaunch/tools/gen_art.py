#!/usr/bin/env python3
"""New art for the v9 film with Codex's image tool (logged-in `codex`): character poses on flat #00FF00 (key with
tools/key.py) and real-looking ink assets photographed on white paper (stamps, a gold seal, red ballpoint marks;
tools/ink.py turns them into transparent overlays). Output: art/<name>.png and art/ink/<name>.png.
usage: python3 tools/gen_art.py [--jobs 3] [--force] [names...]"""
import argparse, concurrent.futures as cf, os, subprocess

HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CAT = 'The same fluffy white cat with the red beret as in the attached images, the same Pixar-style 3D rendering and lighting.'
YUFEI = ('Prof. Yufei Ding exactly as in the attached images: the same face, neat low ponytail, thin red half-rim glasses, '
         'navy-blue blazer over the black-and-white zigzag top, small silver pendant, full-length dark trousers, dark flat '
         'shoes, the same Pixar-style 3D rendering and lighting.')
GREEN = ('Full figure, nothing cropped, centred with a small margin. Background: one perfectly flat pure green colour '
         '#00FF00, no floor, no shadow on the background, no gradient. No text, letters, numbers, logos or watermark.')
PAPER = ('Photographed flat from directly above on plain bright white paper, evenly lit, nothing else on the paper, no '
         'shadows, real ink texture. Square 1024x1024.')
JOBS = [
    ('cat_bat', ['art/cat_sit.png', 'art/cat_sleep.png'], f'{CAT} It stands up on its hind legs, delightedly swatting with one front paw at a loose curl of blank white thermal receipt paper (a long thin paper strip, no printing) that loops in the air like a party streamer. Full body, three-quarter view. {GREEN} Square 1024x1024.'),
    ('cat_tug', ['art/cat_sit.png', 'art/cat_sleep.png'], f'{CAT} It walks backward, tugging hard on the end of a long blank white receipt paper strip held in its teeth; the strip runs off the right edge of the image. Beret askew, determined face. Full body, side view. {GREEN} Square 1024x1024.'),
    ('cat_receipt', ['art/cat_sleep.png', 'art/desk_empty.png'], f'{CAT} It is asleep, curled up on top of a messy heap of long curling blank white receipt paper strips. Only the cat and the paper heap, seen from slightly above at a three-quarter view, as if lying on a desk top. {GREEN} Square 1024x1024.'),
    ('y_receipt', ['art/y_write.png', 'art/y_toast.png'], f'{YUFEI} She stands holding up the end of a very long blank white receipt paper strip in her left hand; it coils down to the floor around her feet. One eyebrow raised, a playful look, a red ballpoint pen poised in her right hand as if about to write on it. Full body, three-quarter view. {GREEN} Portrait 1024x1536.'),
    ('chair_spare', ['art/desk_empty.png'], f'The same wooden chair as in the attached image (wooden frame, beige cushioned seat), alone and empty, seen from the same camera angle with the same warm lamp light from the left; no desk, no lamp. The same Pixar-style 3D rendering. {GREEN} Square 1024x1024.'),
    ('stamp_faster', [], f'A real rubber-stamp ink impression: a rectangular double-line border around the single word FASTER in bold condensed capital letters, green ink, slightly uneven pressure, a little speckle where the ink was thin, rotated a few degrees. {PAPER}'),
    ('stamp_cheaper', [], f'A real rubber-stamp ink impression: a rectangular double-line border around the single word CHEAPER in bold condensed capital letters, red ink, slightly uneven pressure, a little speckle where the ink was thin, rotated a few degrees. {PAPER}'),
    ('stamp_progress', [], f'A real rubber-stamp ink impression: a rectangular double-line border around the words IN PROGRESS in bold condensed capital letters, blue ink, slightly uneven pressure, a little speckle where the ink was thin, rotated a few degrees. {PAPER}'),
    ('stamp_bestpaper', [], f'A real rubber-stamp ink impression: a rectangular double-line border around the words SEE BEST PAPER in bold condensed capital letters, metallic gold ink, slightly uneven pressure, a little speckle where the ink was thin, rotated a few degrees. {PAPER}'),
    ('seal_gold', [], 'A round embossed gold-foil award seal sticker with a scalloped edge and a blank centre (no text, no symbols), realistic foil shine and embossing. Photographed flat from directly above on plain bright white paper, evenly lit, nothing else on the paper. Square 1024x1024.'),
    ('pen_circle', [], f'One loose hand-drawn ellipse in red ballpoint pen, a single quick confident stroke that overlaps itself a little where it ends, wider than tall (about 3:1). {PAPER}'),
    ('pen_strike', [], f'One quick hand-drawn horizontal strike-through line in red ballpoint pen, slightly rising to the right, a little hook at the end. {PAPER}'),
    ('pen_arrow', [], f'One quick hand-drawn curved arrow in red ballpoint pen, about a quarter circle long, a small open arrowhead at the end, a confident single stroke. {PAPER}'),
    ('pen_squiggle', [], f'One quick hand-drawn wavy underline in red ballpoint pen, like a spell-check squiggle but hand-made, five or six waves, long and thin. {PAPER}'),
    ('pen_bracket', [], f'One hand-drawn curly bracket in red ballpoint pen, drawn vertically, tall and thin. {PAPER}'),
    ('stain_ring', [], 'A faint ring stain left by the bottom of a cup of milk tea on plain white paper: a thin light-brown ring, slightly uneven, with a soft paler inside and one small drip, photographed flat from directly above, evenly lit, nothing else on the paper. Square 1024x1024.'),
    ('prop_printer', ['art/desk_empty.png', 'art/cat_sit.png'], f'A small desktop thermal receipt printer, the kind used at a cafe counter: rounded warm off-white plastic body, a dark smoky lid on top, a thin paper slot along the back edge of the lid with nothing coming out, one tiny green LED, a little worn and friendly-looking. Seen from the front-right and from above at about 50 degrees, as if standing on a desk. Warm lamp light from the left, the same Pixar-style 3D rendering and materials as the attached images. Only the printer. {GREEN} Square 1024x1024.'),
    ('prop_tea', ['art/desk_empty.png', 'art/y_toast.png'], f'A clear plastic takeaway cup of bubble milk tea, half drunk: creamy beige tea, black tapioca pearls at the bottom, a wide striped straw through a sealed film lid, a few drops of condensation. Seen from above at about 50 degrees, as if standing on a desk. Warm lamp light from the left, the same Pixar-style 3D rendering as the attached images. Only the cup. {GREEN} Square 1024x1024.'),
    ('prop_pen', ['art/desk_empty.png'], f'One red ballpoint pen with its cap off, lying flat, seen from directly above at a slight angle, diagonal across the image. Warm lamp light from the left, the same Pixar-style 3D rendering as the attached image. Only the pen. {GREEN} Square 1024x1024.'),
    ('pen_working', [],f"The handwritten words: working on it.  Written in red ballpoint pen in casual, confident, legible handwriting, all lower case, with the full stop. {PAPER}"),
]
PROMPT = ('Generate ONE image with your image generation tool and save it as {out} in the current directory (copy the '
          'generated file there; do not write any code to draw it). {refs}{desc} When the file is saved, reply with just its path.')


def run(job, force):
    name, refs, desc = job
    out = f'art/ink/{name}.png' if name.split('_')[0] in ('stamp', 'seal', 'pen', 'stain') else f'art/{name}.png'
    if os.path.exists(os.path.join(HERE, out)) and not force: return name, 'skip'
    args = ['codex', 'exec', '--skip-git-repo-check', '-s', 'workspace-write', '-C', HERE, '-c', 'model_reasoning_effort="low"']
    for r in refs: args += ['-i', r]
    note = 'The attached image(s) are the reference for the character design and style. ' if refs else ''
    with open(os.path.join(HERE, 'logs', name + '.log'), 'w') as log:
        p = subprocess.run(args, input=PROMPT.format(out=out, refs=note, desc=desc), text=True, stdout=log, stderr=subprocess.STDOUT, timeout=900)
    return name, ('ok' if os.path.exists(os.path.join(HERE, out)) else f'FAIL (exit {p.returncode})')


if __name__ == '__main__':
    ap = argparse.ArgumentParser(); ap.add_argument('--jobs', type=int, default=3); ap.add_argument('--force', action='store_true')
    ap.add_argument('names', nargs='*'); a = ap.parse_args()
    for d in ('art/ink', 'logs'): os.makedirs(os.path.join(HERE, d), exist_ok=True)
    jobs = [j for j in JOBS if not a.names or j[0] in a.names]
    with cf.ThreadPoolExecutor(a.jobs) as ex:
        for fut in cf.as_completed([ex.submit(run, j, a.force) for j in jobs]):
            try: print(*fut.result(), flush=True)
            except Exception as e: print('ERROR', e, flush=True)
