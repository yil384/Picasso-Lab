#!/usr/bin/env python3
"""Pick tonight's episode and write its work order (the daily CSE 291P explainers).

    ~/miniforge3/bin/python3 .claude/films/edu/daily/next.py            # write the work order, print a summary
    ~/miniforge3/bin/python3 .claude/films/edu/daily/next.py --shell    # KEY=value lines for run.sh
    ~/miniforge3/bin/python3 .claude/films/edu/daily/next.py --dry      # decide and print, write nothing
    ~/miniforge3/bin/python3 .claude/films/edu/daily/next.py status     # the queue, the buffer, what was delivered
    ~/miniforge3/bin/python3 .claude/films/edu/daily/next.py mark L01-02 delivered --mp4 PATH [--morning 2026-10-07]
    ~/miniforge3/bin/python3 .claude/films/edu/daily/next.py mark L01-02 failed --note "why"
    ~/miniforge3/bin/python3 .claude/films/edu/daily/next.py verify MP4 [--timeline EP/timeline.json]   # a finished film?
        [--now "2026-10-07 02:00"]   pretend it is that time (tests)
        [--run ID]   mark: the run that marks (default $EDU_DAILY_RUN, set by run.sh): a failure is counted once per run

Rules:
- Episodes go in syllabus.json order. Taken: status "shipped" in the syllabus, or "delivered" in state.json.
  Passed over (and listed in the work order): ids in state.skip; "blocked"; guest episodes ("needs-ok") unless the
  speaker said yes (state.speaker_ok[lecture]) or state.guest_policy is "narration-only" (then no clips, no slides);
  an episode that failed in two different runs (it needs a person; the report says why).
- The delivery morning is the first morning with no video yet, from today (if it is before 08:45) or tomorrow, up
  to today + 2 (at most 2 days of buffer). When all of those have a video, there is nothing to do tonight.
- The deadline is 08:45 on the morning, and never more than 6 h 45 min from now (a daytime run gets the same budget).
  When that leaves under 4 h (the Mac slept through 02:00), the episode is delivered late: now + 6 h 45 min.
- Work order: ~/picasso-work/daily/<id>/work_order.json (keyed by episode only, so a retry on a later night finds the
  earlier attempt's progress.md, TTS, previews and scripts). Delivery: ~/Downloads/picasso-daily/<morning>_<id>/.
- When it is past 08:45 and today has no video, the order lists today under "missed" (run.sh says so).
"""
import argparse, datetime as dt, glob, json, os, re, shlex, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
EDU = os.path.abspath(os.path.join(HERE, '..'))
COURSE = os.path.join(EDU, 'course')
SYLLABUS = os.path.join(HERE, 'syllabus.json')
STATE = os.path.join(HERE, 'state.json')
WORK = os.path.expanduser('~/picasso-work/daily')
DELIVER = os.path.expanduser('~/Downloads/picasso-daily')
CUTOFF = dt.time(8, 45)
BUFFER_DAYS = 2
BUDGET = dt.timedelta(hours=6, minutes=45)
MIN_BUDGET = dt.timedelta(hours=4)
DONE = ('delivered',)


def load():
    """Returns ((syllabus list, state dict), None) or (None, 'error')."""
    try:
        syl = json.load(open(SYLLABUS))
    except (OSError, ValueError) as e:
        return None, f'cannot read {SYLLABUS}: {e}'
    state = {'guest_policy': 'skip', 'speaker_ok': {}, 'skip': [], 'episodes': {}}
    if os.path.exists(STATE):
        try:
            state.update(json.load(open(STATE)))
        except (OSError, ValueError) as e:
            return None, f'cannot read {STATE}: {e}'
    return (syl, state), None


def save_state(state):
    """Returns (path, None) or (None, 'error')."""
    try:
        with open(STATE + '.part', 'w') as f:
            json.dump(state, f, indent=1, ensure_ascii=False)
            f.write('\n')
        os.replace(STATE + '.part', STATE)
    except OSError as e:
        return None, str(e)
    return STATE, None


def slide_list(spec):
    """'12-19' or '4-6, 9' -> [12..19]. Returns (list of ints, None) or (None, 'error')."""
    out = []
    for part in re.split(r'[,\s]+', str(spec).strip()):
        if not part:
            continue
        m = re.fullmatch(r'(\d+)(?:-(\d+))?', part)
        if not m:
            return None, f'not a slide range: {spec!r}'
        a, b = int(m.group(1)), int(m.group(2) or m.group(1))
        out += list(range(a, b + 1))
    return out, None


def windows(lecture, slides, gap=60.0):
    """When the slides were on screen in the recording (course/LNN.slides.json from tools/transcribe.py).
    Returns ({'windows': [[start, end], ...], 'span': [start, end], 'missing': [slides never matched]}, None)
    or (None, 'why not')."""
    path = os.path.join(COURSE, f'{lecture}.slides.json')
    if not os.path.exists(path):
        return None, f'no {lecture}.slides.json yet (tools/transcribe.py {lecture})'
    try:
        data = json.load(open(path))
    except (OSError, ValueError) as e:
        return None, f'{path}: {e}'
    segs = sorted([s['start'], s['end']] for s in data.get('segments', []) if s['slide'] in slides)
    merged = []
    for a, b in segs:
        if merged and a - merged[-1][1] <= gap:
            merged[-1][1] = max(merged[-1][1], b)
        else:
            merged.append([a, b])
    seen = {s['slide'] for s in data.get('segments', [])}
    if not merged:
        return None, f'none of slides {slides[0]}-{slides[-1]} matched in {lecture}.slides.json'
    main = max(merged, key=lambda w: w[1] - w[0])
    return {'windows': merged, 'span': [max(0.0, main[0] - 5), main[1] + 5],
            'missing': [s for s in slides if s not in seen]}, None


def mmss(t):
    return f'{int(t // 60):02d}:{int(t % 60):02d}'


def lecture_files(lecture):
    """Paths and readiness of a lecture's course files (git-ignored)."""
    f = {k: os.path.join(COURSE, f'{lecture}.{k}') for k in ('pdf', 'txt', 'mp4', 'words.json', 'slides.json',
                                                             'transcript.md')}
    return {'files': f, 'ready': {k: os.path.exists(v) for k, v in f.items()}}


def mornings(now, state):
    """Candidate delivery mornings and the ones already taken. Returns ((open list, taken dict), None)."""
    today = now.date()
    first = today if now.time() < CUTOFF else today + dt.timedelta(days=1)
    taken = {}
    for eid, e in state['episodes'].items():
        if e.get('status') in DONE and e.get('morning'):
            taken[e['morning']] = eid
    days = []
    d = first
    while d <= today + dt.timedelta(days=BUFFER_DAYS):
        days.append(d.isoformat())
        d += dt.timedelta(days=1)
    return ([d for d in days if d not in taken], taken), None


def pick(syl, state):
    """The next episode to make. Returns ((episode, permissions, mode, passed-over list), None) or (None, 'why')."""
    passed = []
    for ep in sorted(syl, key=lambda e: e['seq']):
        eid, lec = ep['id'], ep['lecture']
        st = state['episodes'].get(eid, {})
        if ep['status'] == 'shipped' or st.get('status') in DONE:
            continue
        if eid in state.get('skip', []):
            passed.append({'id': eid, 'why': 'skipped by the user (state.json skip)'})
            continue
        if ep['status'] == 'blocked':
            passed.append({'id': eid, 'why': 'blocked: ' + ep.get('notes', '')[:160]})
            continue
        if st.get('status') == 'failed' and st.get('attempts', 0) >= 2:
            passed.append({'id': eid, 'why': f'failed {st["attempts"]} times; needs a person: {st.get("note", "")[:160]}'})
            continue
        perms = dict(ep.get('permissions', {}))
        mode = 'full'
        if ep['status'] == 'needs-ok':
            ok = state.get('speaker_ok', {}).get(lec)
            if ok:
                perms.update({k: ok[k] for k in ('voice_clips', 'slides_on_screen') if k in ok})
                perms['note'] = f'speaker said yes ({ok.get("date", "?")}): {ok.get("note", "")}'
                mode = 'full' if perms.get('voice_clips') else 'narration-only'
            elif state.get('guest_policy') == 'narration-only':
                perms.update({'voice_clips': False, 'slides_on_screen': False})
                mode = 'narration-only'
            else:
                passed.append({'id': eid, 'why': f'guest lecture ({ep["speaker"]}): waiting for the speaker\'s OK '
                                                 '(state.json speaker_ok) or guest_policy "narration-only"'})
                continue
        return (ep, perms, mode, passed), None
    return None, 'every episode in syllabus.json is made, skipped or blocked'


def work_order(now=None, write=True):
    """Decide tonight's episode and write its work order.
    Returns (dict with 'id' (None when there is nothing to do) and the order, None) or (None, 'error')."""
    now = now or dt.datetime.now()
    res, err = load()
    if err:
        return None, err
    syl, state = res
    (open_days, taken), _ = mornings(now, state)
    if not open_days:
        return {'id': None, 'why': f'buffer full: videos exist for {", ".join(sorted(taken))}'}, None
    res, err = pick(syl, state)
    if err:
        return {'id': None, 'why': err}, None
    ep, perms, mode, passed = res
    morning = open_days[0]
    mday = dt.date.fromisoformat(morning)
    deadline = min(dt.datetime.combine(mday, CUTOFF), now + BUDGET)
    late = deadline - now < MIN_BUDGET           # a late start (the Mac slept through 02:00): deliver late, not half-made
    if late:
        deadline = now + BUDGET
    work, deliver = os.path.join(WORK, ep['id']), os.path.join(DELIVER, f'{morning}_{ep["id"]}')
    missed = [now.date().isoformat()] if now.time() >= CUTOFF and now.date().isoformat() not in taken else []
    slides, err = slide_list(ep['slides']) if ep['slides'][0].isdigit() else ([], None)
    if err:
        return None, err
    lectures = {ep['lecture']: lecture_files(ep['lecture'])}
    rec = {'lecture': ep['lecture'], 'slides': slides}
    w, why = windows(ep['lecture'], slides) if slides else (None, 'no slides')
    rec.update(w or {'windows': [], 'span': None, 'why': why})
    if w:
        rec['span_mmss'] = f'{mmss(w["span"][0])}-{mmss(w["span"][1])}'
    extra = []
    for x in ep.get('extra_slides', []):
        xs, err = slide_list(x['slides'])
        if err:
            return None, err
        lectures.setdefault(x['lecture'], lecture_files(x['lecture']))
        xw, why = windows(x['lecture'], xs)
        extra.append({**x, 'slides_list': xs, **(xw or {'windows': [], 'span': None, 'why': why})})
    made = {e['id'] for e in syl if e['status'] == 'shipped'} | \
        {k for k, e in state['episodes'].items() if e.get('status') in DONE}
    prev = next((e for e in reversed(sorted(syl, key=lambda e: e['seq']))
                 if e['seq'] < ep['seq'] and (e['status'] == 'shipped' or
                                              state['episodes'].get(e['id'], {}).get('status') in DONE)), None)
    resume = []
    older = sorted(glob.glob(os.path.join(WORK, f'*_{ep["id"]}')), key=os.path.getmtime, reverse=True)  # before 10-07
    for d in [os.path.join(EDU, ep['episode_dir']), work] + older:
        if os.path.isdir(d):
            resume += sorted(os.path.relpath(p, EDU) if p.startswith(EDU) else p
                             for p in glob.glob(os.path.join(d, '**', '*'), recursive=True)
                             if os.path.isfile(p) and os.path.basename(p) != 'work_order.json')[:200]
    order = {
        'id': ep['id'], 'title': ep['title'], 'seq': ep['seq'], 'series_number': len(made) + 1,
        'lecture': ep['lecture'], 'lecture_title': ep['lecture_title'], 'speaker': ep['speaker'], 'guest': ep['guest'],
        'mode': mode, 'permissions': perms,
        'morning': morning, 'deadline': deadline.strftime('%Y-%m-%d %H:%M'),
        'deadline_epoch': int(deadline.timestamp()), 'made_at': now.strftime('%Y-%m-%d %H:%M'), 'late': late,
        'slides': ep['slides'], 'slides_list': slides, 'tape_slides': ep.get('tape_slides', []),
        'extra_slides': extra, 'recording': rec,
        'core_idea': ep['core_idea'], 'sub_points': ep['sub_points'], 'hook': ep['hook'],
        'target_min': ep['target_min'], 'math': ep.get('math'), 'notes': ep.get('notes', ''),
        'facts_to_check': ep.get('facts_to_check', []), 'prereqs': ep.get('prereqs', []),
        'lectures': lectures,
        'episode_dir': ep['episode_dir'], 'episode_dir_abs': os.path.join(EDU, ep['episode_dir']),
        'work_dir': work, 'deliver_dir': deliver,
        'previous': None if not prev else {
            'id': prev['id'], 'title': prev['title'],
            'episode_dir': state['episodes'].get(prev['id'], {}).get('episode_dir', prev.get('episode_dir'))},
        'resume_files': resume, 'progress': os.path.join(work, 'progress.md'), 'missed': missed,
        'passed_over': passed,
        'reference': syl[0].get('shipped', {}),
    }
    if write:
        os.makedirs(work, exist_ok=True)
        with open(os.path.join(work, 'work_order.json'), 'w') as f:
            json.dump(order, f, indent=1, ensure_ascii=False)
        order['work_order'] = os.path.join(work, 'work_order.json')
    return order, None


def mark(eid, status, mp4=None, morning=None, note=None, now=None, run=None):
    """Record an episode's outcome in state.json. A failure counts once per run (`run`, default $EDU_DAILY_RUN): the
    producer and run.sh may both mark the same night failed. Returns (entry, None) or (None, 'error')."""
    run = run or os.environ.get('EDU_DAILY_RUN') or None
    res, err = load()
    if err:
        return None, err
    syl, state = res
    ep = next((e for e in syl if e['id'] == eid), None)
    if not ep:
        return None, f'{eid} is not in syllabus.json'
    if status not in ('delivered', 'failed', 'in-progress'):
        return None, 'status must be delivered, failed or in-progress'
    if status == 'delivered' and not (mp4 and os.path.exists(os.path.expanduser(mp4))):
        return None, 'delivered needs --mp4 pointing at the delivered video'
    e = state['episodes'].setdefault(eid, {})
    again = status == 'failed' and e.get('status') == 'failed' and run and e.get('run') == run
    e.update({'status': status, 'updated': (now or dt.datetime.now()).strftime('%Y-%m-%d %H:%M'),
              'episode_dir': ep['episode_dir']})
    if morning:
        e['morning'] = morning
    if mp4:
        e['mp4'] = os.path.expanduser(mp4)
        e['folder'] = os.path.dirname(e['mp4'])
    if note:
        e['note'] = note if not again else f'{e.get("note", "")} | {note}'
    if status == 'failed' and not again:
        e['attempts'] = e.get('attempts', 0) + 1
    if run:
        e['run'] = run
    _, err = save_state(state)
    if err:
        return None, err
    return e, None


def verify(mp4, timeline=None, tol=1.0):
    """Is mp4 a finished film: readable, 1080x1920, an audio stream, and (with timeline.json) its duration within tol s
    of the timeline's dur? Returns ({'dur', 'size', 'audio'}, None) or (None, 'why not')."""
    mp4 = os.path.expanduser(mp4)
    if not os.path.isfile(mp4) or os.path.getsize(mp4) < 100000:
        return None, f'{mp4}: missing or under 100 kB'
    try:
        r = subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration:stream=codec_type,width,height',
                            '-of', 'json', mp4], capture_output=True, text=True, timeout=60)
        info = json.loads(r.stdout or '{}')
    except (OSError, ValueError, subprocess.TimeoutExpired) as e:
        return None, f'ffprobe {mp4}: {e}'
    if r.returncode or 'format' not in info:
        return None, f'ffprobe cannot read {mp4} (unfinished?): {r.stderr.strip()[-200:]}'
    streams = info.get('streams', [])
    v = next((x for x in streams if x.get('codec_type') == 'video'), None)
    audio = any(x.get('codec_type') == 'audio' for x in streams)
    dur = float(info['format'].get('duration') or 0)
    out = {'dur': round(dur, 3), 'size': f'{v["width"]}x{v["height"]}' if v else None, 'audio': audio}
    if not v or (v['width'], v['height']) != (1080, 1920):
        return None, f'{mp4}: not 1080x1920 ({out["size"]})'
    if not audio:
        return None, f'{mp4}: no audio stream'
    if timeline:
        try:
            want = float(json.load(open(timeline))['dur'])
        except (OSError, ValueError, KeyError) as e:
            return None, f'{timeline}: {e}'
        out['timeline_dur'] = want
        if abs(dur - want) > tol:
            return None, f'{mp4}: {dur:.2f} s, the timeline says {want:.2f} s'
    return out, None


def status(now=None):
    """The queue as text. Returns (text, None) or (None, 'error')."""
    now = now or dt.datetime.now()
    res, err = load()
    if err:
        return None, err
    syl, state = res
    (open_days, taken), _ = mornings(now, state)
    lines = [f'now {now:%Y-%m-%d %H:%M}; open mornings: {", ".join(open_days) or "none (buffer full)"}']
    for m, eid in sorted(taken.items()):
        lines.append(f'  {m}  {eid}  {state["episodes"][eid].get("mp4", "")}')
    res, err = pick(syl, state)
    if err:
        lines.append(err)
    else:
        ep, perms, mode, passed = res
        lines.append(f'next: {ep["id"]} "{ep["title"]}" ({ep["lecture"]} slides {ep["slides"]}, {ep["target_min"]} min, {mode})')
        lines += [f'  passed over: {p["id"]}: {p["why"]}' for p in passed]
    for eid, e in state['episodes'].items():
        if e.get('status') not in DONE:
            lines.append(f'  {eid}: {e.get("status")} ({e.get("attempts", 0)} failed) {e.get("note", "")}')
    return '\n'.join(lines), None


def main():
    ap = argparse.ArgumentParser(description='pick the next daily episode; see the module doc')
    ap.add_argument('cmd', nargs='?', default='order', choices=['order', 'status', 'mark', 'verify'])
    ap.add_argument('args', nargs='*')
    ap.add_argument('--now')
    ap.add_argument('--dry', action='store_true')
    ap.add_argument('--shell', action='store_true')
    ap.add_argument('--mp4')
    ap.add_argument('--morning')
    ap.add_argument('--note')
    ap.add_argument('--run')
    ap.add_argument('--timeline')
    a = ap.parse_args()
    now = dt.datetime.strptime(a.now, '%Y-%m-%d %H:%M') if a.now else None
    if a.cmd == 'status':
        text, err = status(now)
        if err:
            sys.exit(err)
        print(text)
        return
    if a.cmd == 'verify':
        if len(a.args) != 1:
            sys.exit('usage: next.py verify MP4 [--timeline EP/timeline.json]')
        info, err = verify(a.args[0], a.timeline)
        if err:
            sys.exit(err)
        print(json.dumps(info))
        return
    if a.cmd == 'mark':
        if len(a.args) != 2:
            sys.exit('usage: next.py mark EPISODE_ID delivered|failed|in-progress [--mp4 P] [--morning D] [--note T]')
        e, err = mark(a.args[0], a.args[1], a.mp4, a.morning, a.note, now, a.run)
        if err:
            sys.exit(err)
        print(json.dumps({a.args[0]: e}, indent=1))
        return
    order, err = work_order(now, write=not a.dry)
    if err:
        sys.exit(err)
    if a.shell:
        if not order['id']:
            print(f"EP_ID=''\nEP_WHY={shlex.quote(order['why'])}")
            return
        lecs = ' '.join(order['lectures'])
        for k, v in (('EP_ID', order['id']), ('EP_TITLE', order['title']), ('EP_LECTURES', lecs),
                     ('EP_MORNING', order['morning']), ('EP_DEADLINE', order['deadline']),
                     ('EP_DEADLINE_EPOCH', order['deadline_epoch']), ('EP_WORK', order['work_dir']),
                     ('EP_DELIVER', order['deliver_dir']), ('EP_DIR', order['episode_dir_abs']),
                     ('EP_ORDER', order.get('work_order', '')), ('EP_MODE', order['mode']),
                     ('EP_LATE', int(order['late'])), ('EP_MISSED', ' '.join(order['missed']))):
            print(f'{k}={shlex.quote(str(v))}')
        return
    if not order['id']:
        print('nothing to do:', order['why'])
        return
    r = order['recording']
    print(f'{order["id"]} "{order["title"]}" for the morning of {order["morning"]} (deadline {order["deadline"]})')
    print(f'  {order["lecture"]} slides {order["slides"]}; recording {r.get("span_mmss") or r.get("why")}; '
          f'{order["target_min"]} min; {order["mode"]}')
    for x in order['extra_slides']:
        print(f'  + {x["lecture"]} slides {x["slides"]} ({x["why"]})')
    for p in order['passed_over']:
        print(f'  passed over {p["id"]}: {p["why"]}')
    if order['missed']:
        print(f'  missed: {", ".join(order["missed"])} has no video')
    if order['resume_files']:
        print(f'  resume: {len(order["resume_files"])} files from an earlier attempt')
    print('  work order:', order.get('work_order', '(dry run, not written)'))
    print('  deliver to:', order['deliver_dir'])


if __name__ == '__main__':
    main()
