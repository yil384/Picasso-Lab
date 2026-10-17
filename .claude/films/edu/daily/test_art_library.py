#!/usr/bin/env python3
"""Checks of art.py with the pre-drawn library, in a scratch folder (the repo's art/ and the real library are never
touched; the image tool is replaced by a stand-in through ART_GEN):

    ~/miniforge3/bin/python3 .claude/films/edu/daily/test_art_library.py

- take / gen / pack copy a library drawing (src + cut) into the art dir and never make it again;
- a drawing in neither place is made by gen (the stand-in);
- a missing library is not an error: take reports it, gen makes the drawing, pre --line says so;
- pre reads art.pre.json and counts what the library has.
Prints one line per check and exits 1 on any failure.
"""
import json, os, shutil, subprocess, sys, tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
ART_PY = os.path.join(HERE, 'art.py')
EDU = os.path.abspath(os.path.join(HERE, '..'))
SAMPLE = os.path.join(EDU, 'art', 'src', 'line_tiny_lab.png')     # any checked line drawing


def run(env, *args):
    """art.py with env added. Returns ((returncode, stdout, stderr), None) or (None, 'error')."""
    try:
        r = subprocess.run([sys.executable, ART_PY, *args], capture_output=True, text=True, timeout=300,
                           env=dict(os.environ, **env))
    except (OSError, subprocess.TimeoutExpired) as e:
        return None, str(e)
    return (r.returncode, r.stdout, r.stderr), None


def setup(root):
    """A scratch art dir, a library with one drawing (src + cut), an episode with art.json and art.pre.json and a
    stand-in for gen.sh. Returns (paths dict, None) or (None, 'error')."""
    if not os.path.exists(SAMPLE):
        return None, f'no sample drawing at {SAMPLE}'
    p = {k: os.path.join(root, k) for k in ('art', 'lib', 'ep', 'work')}
    try:
        for d in ('art/src', 'art/cut', 'lib/src', 'lib/cut', 'ep'):
            os.makedirs(os.path.join(root, d))
        for r in ('line_tiny_lab', 'line_chat_first', 'line_balance'):           # the default style refs
            shutil.copy(os.path.join(EDU, 'art', 'src', r + '.png'), os.path.join(p['art'], 'src'))
        shutil.copy(SAMPLE, os.path.join(p['lib'], 'src', 'line_t_from_lib.png'))
        shutil.copy(SAMPLE, os.path.join(p['lib'], 'cut', 'line_t_from_lib.png'))
        art = {'episode': 'T00-01', 'drawings': [{'name': 'line_t_from_lib', 'prompt': 'x'},
                                                {'name': 'line_t_new', 'prompt': 'y'}]}
        json.dump(art, open(os.path.join(p['ep'], 'art.json'), 'w'))
        json.dump({**art, 'pre': True, 'beats': ['a'], 'reuse': ['line_mic']},
                  open(os.path.join(p['ep'], 'art.pre.json'), 'w'))
        gen = os.path.join(root, 'fake_gen.sh')              # what gen.sh does: ART_OUT/src/NAME.png
        with open(gen, 'w') as f:
            f.write(f'#!/bin/bash\ncd "$ART_OUT" || exit 1; mkdir -p src logs\necho "$1" >> {root}/made.txt\n'
                    f'cp "{SAMPLE}" "src/$1.png"\n')
        p['gen'], p['made'] = gen, os.path.join(root, 'made.txt')
    except OSError as e:
        return None, str(e)
    return p, None


def checks(p):
    """Returns ([(name, ok, detail)], None) or (None, 'error')."""
    out = []
    env = {'EDU_ART_DIR': p['art'], 'EDU_ART_LIBRARY': p['lib'], 'ART_GEN': p['gen'], 'EDU_ART_WORK': p['work']}
    art_json = os.path.join(p['ep'], 'art.json')

    r, err = run(env, 'pre', p['ep'], '--line')
    if err:
        return None, err
    out.append(('pre --line counts the library', r[0] == 0 and '1 of 2 are made' in r[1] and 'line_t_new' in r[1], r[1] + r[2]))

    r, err = run(env, 'check', art_json)
    if err:
        return None, err
    res = json.loads(r[1] or '{}')
    out.append(('check flags a library drawing not yet copied',
                res.get('line_t_from_lib', '').startswith('in the library'), r[1] + r[2]))

    r, err = run(env, 'gen', art_json, '--jobs', '1')
    if err:
        return None, err
    st = json.loads(r[1] or '{}').get('drawings', {})
    made = open(p['made']).read().split() if os.path.exists(p['made']) else []
    out.append(('gen copies the library drawing (src + cut) and does not make it',
                st.get('line_t_from_lib', {}).get('note') == 'copied from the library' and 'line_t_from_lib' not in made
                and os.path.exists(os.path.join(p['art'], 'cut', 'line_t_from_lib.png')), r[1] + r[2]))
    out.append(('gen makes the drawing that is in neither place', made == ['line_t_new']
                and st.get('line_t_new', {}).get('state') == 'ok', r[1] + r[2]))

    for f in ('src', 'cut'):                                 # again, now with no library at all
        os.remove(os.path.join(p['art'], f, 'line_t_from_lib.png'))
    os.remove(os.path.join(p['art'], 'src', 'line_t_new.png'))
    open(p['made'], 'w').close()
    gone = dict(env, EDU_ART_LIBRARY=os.path.join(p['lib'], 'not-here'))
    r, err = run(gone, 'take', art_json)
    if err:
        return None, err
    res = json.loads(r[1] or '{}')
    out.append(('take with no library reports it and does not fail',
                r[0] == 0 and 'no library' in res.get('line_t_from_lib', ''), r[1] + r[2]))
    r, err = run(gone, 'pre', p['ep'], '--line')
    if err:
        return None, err
    out.append(('pre --line says the library is not on this Mac', r[0] == 0 and 'not on this Mac' in r[1], r[1] + r[2]))
    r, err = run(gone, 'gen', art_json, '--jobs', '2')
    if err:
        return None, err
    made = sorted(open(p['made']).read().split())
    out.append(('gen with no library makes both drawings', r[0] == 0 and made == ['line_t_from_lib', 'line_t_new'],
                r[1] + r[2]))

    chain = os.path.join(p['ep'], 'chain.json')             # a ref that is another, not yet made drawing of the page
    json.dump({'episode': 'T00-02', 'drawings': [{'name': 'line_t_base', 'prompt': 'a'},
                                                 {'name': 'line_t_child', 'prompt': 'b', 'refs': ['line_t_base'],
                                                  'group': 'B'}]}, open(chain, 'w'))
    page = os.path.join(p['work'], 'chain.html')
    r, err = run(env, 'prompts', chain, page)
    if err:
        return None, err
    text = open(page, encoding='utf-8').read() if os.path.exists(page) else ''
    out.append(('prompts page with a not-yet-made ref says to draw it first', r[0] == 0 and '本页先画' in text,
                r[1] + r[2]))
    return out, None


def main():
    root = tempfile.mkdtemp(prefix='art-lib-test-')
    try:
        p, err = setup(root)
        if err:
            sys.exit(f'setup: {err}')
        res, err = checks(p)
        if err:
            sys.exit(f'run: {err}')
    finally:
        shutil.rmtree(root, ignore_errors=True)
    bad = 0
    for name, ok, detail in res:
        print(('ok    ' if ok else 'FAIL  ') + name)
        if not ok:
            bad += 1
            print('      ' + detail.strip().replace('\n', '\n      ')[:1500])
    sys.exit(1 if bad else 0)


if __name__ == '__main__':
    main()
