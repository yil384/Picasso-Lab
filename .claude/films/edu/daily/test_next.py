#!/usr/bin/env python3
"""Checks of next.py's two series (LLM System Optimization, Quantum Computing Systems) and schedule.json, in a scratch
folder: a copy of state.json, scratch schedules, work and delivery folders (the real state.json, ~/picasso-work and
~/Downloads are never touched; nothing is rendered):

    ~/miniforge3/bin/python3 .claude/films/edu/daily/test_next.py

- the default schedule alternates mornings, LLM first from 2026-10-16; `plan` gives tonight's LLM and tomorrow's QC;
- pattern ["llm"] keeps the LLM queue exactly as before (same episode, morning, deadline, recording windows);
- pattern ["qc"]; mornings before `start` are LLM mornings; a failed night is retried in the same series;
- when_empty "other" hands an empty series' morning to the other one, "none" leaves it empty;
- mark works for a quantum id; the next quantum night takes the next part, with `previous` and `series_number`;
- --shell names the series and its course folder; a written work order holds the syllabus entry; a bad schedule and
  --assume without --dry are refused.
Prints one line per check and exits 1 on any failure.
"""
import json, os, shutil, subprocess, sys, tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
NEXT = os.path.join(HERE, 'next.py')
STATE = os.path.join(HERE, 'state.json')


def run(env, *args):
    """next.py with env added. Returns ((returncode, stdout, stderr), None) or (None, 'error')."""
    try:
        r = subprocess.run([sys.executable, NEXT, *args], capture_output=True, text=True, timeout=120,
                           env=dict(os.environ, **env))
    except (OSError, subprocess.TimeoutExpired) as e:
        return None, str(e)
    return (r.returncode, r.stdout, r.stderr), None


def order(env, now, *extra):
    """The dry-run work order as a dict. Returns (dict, None) or (None, 'error')."""
    res, err = run(env, '--dry', '--json', '--now', now, *extra)
    if err:
        return None, err
    rc, out, errtxt = res
    if rc:
        return None, f'exit {rc}: {errtxt.strip()[-300:]}'
    try:
        return json.loads(out), None
    except ValueError as e:
        return None, f'not JSON: {e}: {out[:200]}'


def setup(root):
    """A scratch state (a copy of the real one), schedule, work and delivery folders. Returns (env dict, None)."""
    try:
        for d in ('work', 'deliver'):
            os.makedirs(os.path.join(root, d))
        shutil.copy(STATE, os.path.join(root, 'state.json'))
    except OSError as e:
        return None, str(e)
    return {'EDU_DAILY_STATE': os.path.join(root, 'state.json'), 'EDU_DAILY_SCHEDULE': os.path.join(root, 'schedule.json'),
            'EDU_DAILY_WORK': os.path.join(root, 'work'), 'EDU_DAILY_DELIVER': os.path.join(root, 'deliver'),
            'EDU_DAILY_RUN': ''}, None


def schedule(env, **kw):
    """Write the scratch schedule.json (defaults: alternate from 2026-10-16, when_empty other). Returns (path, None)."""
    s = {'pattern': ['llm', 'qc'], 'start': '2026-10-16', 'when_empty': 'other', **kw}
    try:
        json.dump(s, open(env['EDU_DAILY_SCHEDULE'], 'w'))
    except OSError as e:
        return None, str(e)
    return env['EDU_DAILY_SCHEDULE'], None


def state_edit(env, fn):
    """Apply fn to the scratch state. Returns (state, None) or (None, 'error')."""
    try:
        st = json.load(open(env['EDU_DAILY_STATE']))
        fn(st)
        json.dump(st, open(env['EDU_DAILY_STATE'], 'w'), indent=1)
    except (OSError, ValueError) as e:
        return None, str(e)
    return st, None


def main():
    results = []

    def check(name, ok, detail=''):
        results.append(ok)
        print(f'{"ok  " if ok else "FAIL"} {name}' + (f': {detail}' if detail and not ok else ''))

    root = tempfile.mkdtemp(prefix='test_next_')
    env, err = setup(root)
    if err:
        sys.exit(f'setup: {err}')
    real_state = open(STATE).read()
    try:
        # 1. the default schedule: tonight LLM, tomorrow QC
        schedule(env)
        o, err = order(env, '2026-10-15 02:00')
        check('tonight (10-15 02:00) is an LLM morning: L03-03 for 10-16',
              not err and o['id'] == 'L03-03' and o['series'] == 'llm' and o['morning'] == '2026-10-16', err or o.get('id'))
        res, err = run(env, 'plan', '--now', '2026-10-15 02:00', '--json')
        plan = json.loads(res[1]) if not err and res[0] == 0 else None
        check('plan: night 2 is QC01-01 for 10-17 (QC), assuming tonight delivered',
              plan and plan[1]['order']['id'] == 'QC01-01' and plan[1]['order']['series'] == 'qc'
              and plan[1]['order']['morning'] == '2026-10-17', err or (res and res[2][-200:]))
        o, err = order(env, '2026-10-16 02:00', '--assume', 'L03-03@2026-10-16')
        q = o if not err else {}
        check('a quantum order names its syllabus, course folder, sources and pre-drawn art',
              not err and q['series_info']['syllabus'].endswith('syllabus-qc.json')
              and q['series_info']['course_dir'].endswith('course-qc') and q['syllabus_entry']['id'] == 'QC01-01'
              and q['recording']['sources'] and q['recording']['span'] == [692.0, 1150.0]
              and q['pre_drawn'] and q['pre_drawn']['plan'].endswith('episodes/qc01-01/art.pre.json')
              and q['series_number'] == 1 and q['previous'] is None and q['reference'].get('episode_dir') == 'episodes/l01-5min',
              err or json.dumps({k: q.get(k) for k in ('series', 'series_number', 'previous')}))

        # 2. LLM only: the queue as before
        schedule(env, pattern=['llm'])
        o1, err = order(env, '2026-10-15 02:00')
        o2, err2 = order(env, '2026-10-16 02:00', '--assume', 'L03-03@2026-10-16')
        check('pattern ["llm"]: L03-03 then L03-04, the LLM recording windows as before',
              not (err or err2) and o1['id'] == 'L03-03' and o2['id'] == 'L03-04' and o2['series'] == 'llm'
              and o1['recording']['span_mmss'] == '26:11-42:47' and o1['deadline'] == '2026-10-15 08:45'
              and o1['extra_slides'][0]['lecture'] == 'L04', err or err2)

        # 3. quantum only; a later start
        schedule(env, pattern=['qc'])
        o, err = order(env, '2026-10-15 02:00')
        check('pattern ["qc"]: QC01-01 on 10-16', not err and o['id'] == 'QC01-01' and o['morning'] == '2026-10-16', err)
        schedule(env, start='2026-10-20')
        o, err = order(env, '2026-10-16 02:00', '--assume', 'L03-03@2026-10-16')
        check('mornings before start are LLM mornings (start 10-20: 10-17 is LLM)',
              not err and o['series'] == 'llm' and o['morning'] == '2026-10-17', err or o.get('series'))

        # 4. a failed night is retried in the same series
        schedule(env)
        res, err = run(env, 'mark', 'QC01-01', 'failed', '--note', 'test', '--run', 'r1', '--now', '2026-10-16 08:45')
        check('mark works for a quantum id (failed)', not err and res[0] == 0, err or res[2][-200:])
        o, err = order(env, '2026-10-17 02:00', '--assume', 'L03-03@2026-10-16')
        check('the next night (morning 10-17, a QC morning) retries QC01-01',
              not err and o['id'] == 'QC01-01' and o['morning'] == '2026-10-17', err or o.get('id'))

        # 5. a delivered quantum part: the next quantum morning takes the next part
        mp4 = os.path.join(root, 'deliver', 'x.mp4')
        open(mp4, 'wb').write(b'\0' * 10)
        res, err = run(env, 'mark', 'QC01-01', 'delivered', '--mp4', mp4, '--morning', '2026-10-17', '--run', 'r2')
        o, err2 = order(env, '2026-10-18 02:00', '--assume', 'L03-03@2026-10-16', '--assume', 'L03-04@2026-10-18')
        check('after QC01-01 is delivered, the next QC morning (10-19) takes QC01-02 (previous QC01-01, number 2)',
              not (err or err2) and res[0] == 0 and o['id'] == 'QC01-02' and o['morning'] == '2026-10-19'
              and o['previous']['id'] == 'QC01-01' and o['series_number'] == 2, err or err2 or (o or {}).get('id'))
        o, err = order(env, '2026-10-17 02:00', '--assume', 'L03-03@2026-10-16')
        check('an LLM morning after a QC delivery is still LLM (L03-04 for 10-18; LLM count unchanged)',
              not err and o['id'] == 'L03-04' and o['morning'] == '2026-10-18' and o['series_number'] == 12, err or o)

        # 6. an empty series: "other" vs "none"
        def skip_llm(st):
            st['skip'] = [e['id'] for e in json.load(open(os.path.join(HERE, 'syllabus.json')))]
        state_edit(env, skip_llm)
        o, err = order(env, '2026-10-15 02:00')
        check('when_empty "other": an LLM morning with nothing left goes to QC (with a note)',
              not err and o['series'] == 'qc' and o['schedule']['note'] and o['morning'] == '2026-10-16', err or o)
        schedule(env, when_empty='none')
        o, err = order(env, '2026-10-15 02:00')
        check('when_empty "none": that morning gets nothing', not err and o['id'] is None and 'llm' in o['why'], err or o)
        state_edit(env, lambda st: st.update(skip=[]))

        # 7. --shell, a written order, refusals
        schedule(env)
        res, err = run(env, '--dry', '--shell', '--now', '2026-10-18 02:00', '--assume', 'L03-03@2026-10-16',
                       '--assume', 'L03-04@2026-10-18')    # QC01-01 is delivered for 10-17 by now: 10-19 is QC01-02
        out = res[1] if not err else ''
        check('--shell names the series and the course folder',
              'EP_ID=QC01-02' in out and 'EP_SERIES=qc' in out and 'course-qc' in out and 'EP_SYLLABUS=' in out,
              err or out[-300:])
        res, err = run(env, '--now', '2026-10-17 02:00')
        wo = os.path.join(env['EDU_DAILY_WORK'], 'L03-03', 'work_order.json')
        ok = not err and res[0] == 0 and os.path.exists(wo) and json.load(open(wo))['syllabus_entry']['id'] == 'L03-03'
        check('a written work order (scratch work folder) holds the syllabus entry', ok, err or res[2][-200:])
        schedule(env, pattern=['llm', 'quantum'])
        res, err = run(env, '--dry', '--now', '2026-10-15 02:00')
        check('a schedule with an unknown series is refused', not err and res[0] != 0 and 'pattern' in res[2], err or res)
        schedule(env)
        res, err = run(env, '--now', '2026-10-15 02:00', '--assume', 'L03-03@2026-10-16')
        check('--assume without --dry is refused', not err and res[0] != 0, err or res)
    finally:
        shutil.rmtree(root, ignore_errors=True)
    check('the real state.json is untouched', open(STATE).read() == real_state)
    print(f'{sum(results)} of {len(results)} checks passed')
    sys.exit(0 if all(results) else 1)


if __name__ == '__main__':
    main()
