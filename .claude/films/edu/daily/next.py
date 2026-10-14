#!/usr/bin/env python3
"""Pick tonight's episode and write its work order (the daily CSE 291P explainers, two series).

    ~/miniforge3/bin/python3 .claude/films/edu/daily/next.py            # write the work order, print a summary
    ~/miniforge3/bin/python3 .claude/films/edu/daily/next.py --shell    # KEY=value lines for run.sh
    ~/miniforge3/bin/python3 .claude/films/edu/daily/next.py --dry      # decide and print, write nothing
    ~/miniforge3/bin/python3 .claude/films/edu/daily/next.py plan [--nights 2] [--json]   # tonight and the next nights
    ~/miniforge3/bin/python3 .claude/films/edu/daily/next.py status     # the schedule, both queues, the buffer
    ~/miniforge3/bin/python3 .claude/films/edu/daily/next.py mark L01-02 delivered --mp4 PATH [--morning 2026-10-07]
    ~/miniforge3/bin/python3 .claude/films/edu/daily/next.py mark QC01-01 failed --note "why"
    ~/miniforge3/bin/python3 .claude/films/edu/daily/next.py verify MP4 [--timeline EP/timeline.json]   # a finished film?
        [--now "2026-10-07 02:00"]   pretend it is that time (tests)
        [--assume L03-03@2026-10-16]   (--dry, plan, status) pretend that episode was delivered for that morning;
                                       repeatable, never written
        [--run ID]   mark: the run that marks (default $EDU_DAILY_RUN, set by run.sh): a failure is counted once per run

Two series share one channel, one state.json and one video a morning:
- "llm": CSE 291P LLM System Optimization: syllabus.json, course files course/LNN.* (LNN = lecture, e.g. L03);
- "qc":  CSE 291P Quantum Computing Systems: syllabus-qc.json, course files course-qc/QYY-NN.* (QYY-NN = her 20YY
  lecture NN, e.g. Q25-04; 2025 primary, merged with 2024). Episode ids differ (L03-03 vs QC01-01).
schedule.json says which series each morning gets: {"pattern": ["llm", "qc"], "start": "2026-10-16", "when_empty":
"other"}: the pattern repeats one morning per entry from `start` (the default: alternate days, LLM first); mornings
before `start` are LLM mornings. A morning's series is fixed by its date, so a failed night retries the same series.
When that series has nothing left to make, "other" gives the morning to the next series in the pattern that has
(then any other series); "none" leaves it without a video. A missing schedule.json means the default.

Rules (per series):
- Episodes go in syllabus order. Taken: status "shipped" in the syllabus, or "delivered" in state.json.
  Passed over (and listed in the work order): ids in state.skip; "blocked"; guest episodes ("needs-ok") unless the
  speaker said yes (state.speaker_ok[lecture]) or state.guest_policy is "narration-only" (then no clips, no slides);
  an episode that failed in two different runs (it needs a person; the report says why).
- The delivery morning is the first morning with no video yet, from today (if it is before 08:45) or tomorrow, up
  to today + 2 (at most 2 days of buffer). When all of those have a video, there is nothing to do tonight.
- The deadline is 08:45 on the morning, and never more than 6 h 45 min from now (a daytime run gets the same budget).
  When that leaves under 4 h (the Mac slept through 02:00), the episode is delivered late: now + 6 h 45 min.
- Work order: ~/picasso-work/daily/<id>/work_order.json (keyed by episode only, so a retry on a later night finds the
  earlier attempt's progress.md, TTS, previews and scripts). Delivery: ~/Downloads/picasso-daily/<morning>_<id>/.
  It names the series, the syllabus entry (whole, in "syllabus_entry"), the course folder and its file naming.
- When it is past 08:45 and today has no video, the order lists today under "missed" (run.sh says so).
- When the episode folder holds art.pre.json (drawings planned and made ahead, kept in the library outside git), the
  order's "pre_drawn" names it and the library (PROMPT.md step 5; `art.py pre` counts what is made).
EDU_DAILY_STATE, EDU_DAILY_SCHEDULE, EDU_DAILY_WORK, EDU_DAILY_DELIVER point the state, the schedule, the work
folders and the delivery folders elsewhere (test_next.py does).
"""
import argparse, copy, datetime as dt, glob, json, os, re, shlex, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
EDU = os.path.abspath(os.path.join(HERE, '..'))
COURSE = os.path.join(EDU, 'course')
QC_COURSE = os.path.join(EDU, 'course-qc')
SYLLABUS = os.path.join(HERE, 'syllabus.json')
STATE = os.path.expanduser(os.environ.get('EDU_DAILY_STATE') or os.path.join(HERE, 'state.json'))
SCHEDULE = os.path.expanduser(os.environ.get('EDU_DAILY_SCHEDULE') or os.path.join(HERE, 'schedule.json'))
WORK = os.path.expanduser(os.environ.get('EDU_DAILY_WORK') or '~/picasso-work/daily')
DELIVER = os.path.expanduser(os.environ.get('EDU_DAILY_DELIVER') or '~/Downloads/picasso-daily')
LIBRARY = os.path.expanduser(os.environ.get('EDU_ART_LIBRARY') or '~/picasso-assets/edu-art-library')
CUTOFF = dt.time(8, 45)
BUFFER_DAYS = 2
BUDGET = dt.timedelta(hours=6, minutes=45)
MIN_BUDGET = dt.timedelta(hours=4)
DONE = ('delivered',)

SERIES = {
    'llm': {
        'name': 'CSE 291P: LLM System Optimization',
        'syllabus': SYLLABUS, 'readable': os.path.join(HERE, 'SYLLABUS.md'), 'course': COURSE,
        'naming': 'course/LNN.pdf (page = slide number), LNN.txt (pages split by form feeds), LNN.mp4, '
                  'LNN.words.json, LNN.slides.json, LNN.transcript.md; LNN = the lecture (L03)',
        'brief': 'PROMPT.md, every step as written',
    },
    'qc': {
        'name': 'CSE 291P: Quantum Computing Systems',
        'syllabus': os.path.join(HERE, 'syllabus-qc.json'), 'readable': os.path.join(HERE, 'SYLLABUS-QC.md'),
        'course': QC_COURSE,
        'naming': 'course-qc/QYY-NN.mp4, .transcript.md, .words.json, .slides.json, .sheet.png; .pdf (a deck: only '
                  'some lectures), .notes.pdf (her typed notes: some); QYY-NN.slides/pNN.png (deck pages) and '
                  'sNNN.png (slides cut from the recording); QYY-NN = her 20YY lecture NN (Q25-04); in the syllabus '
                  '"p8" = deck page 8, "s12" = QYY-NN.slides/s012.png',
        'brief': 'PROMPT.md, with its section "The quantum series (QC)" over the LLM-specific details',
    },
}
DEFAULT_SCHEDULE = {'pattern': ['llm', 'qc'], 'start': '2026-10-16', 'when_empty': 'other'}


def load_schedule():
    """schedule.json (or the default). Returns ({'pattern', 'start' (date), 'when_empty'}, None) or (None, 'error')."""
    sched = dict(DEFAULT_SCHEDULE)
    if os.path.exists(SCHEDULE):
        try:
            sched.update({k: v for k, v in json.load(open(SCHEDULE)).items() if k in DEFAULT_SCHEDULE})
        except (OSError, ValueError, AttributeError) as e:
            return None, f'cannot read {SCHEDULE}: {e}'
    pat = sched['pattern']
    if not isinstance(pat, list) or not pat or any(p not in SERIES for p in pat):
        return None, f'{SCHEDULE}: "pattern" must be a non-empty list of {", ".join(SERIES)}'
    try:
        sched['start'] = dt.date.fromisoformat(str(sched['start']))
    except ValueError:
        return None, f'{SCHEDULE}: "start" must be a date (YYYY-MM-DD), not {sched["start"]!r}'
    if sched['when_empty'] not in ('other', 'none'):
        return None, f'{SCHEDULE}: "when_empty" must be "other" or "none"'
    return sched, None


def load(assume=()):
    """Both syllabi, the state and the schedule. `assume` = [(episode id, morning)] treated as delivered (in memory).
    Returns (({series: syllabus list}, state dict, schedule dict), None) or (None, 'error')."""
    books = {}
    for key, s in SERIES.items():
        try:
            books[key] = json.load(open(s['syllabus']))
        except (OSError, ValueError) as e:
            return None, f'cannot read {s["syllabus"]}: {e}'
    state = {'guest_policy': 'skip', 'speaker_ok': {}, 'skip': [], 'episodes': {}}
    if os.path.exists(STATE):
        try:
            state.update(json.load(open(STATE)))
        except (OSError, ValueError) as e:
            return None, f'cannot read {STATE}: {e}'
    sched, err = load_schedule()
    if err:
        return None, err
    for eid, morning in assume:
        state['episodes'][eid] = {**state['episodes'].get(eid, {}), 'status': 'delivered', 'morning': morning,
                                  'assumed': True}
    return (books, state, sched), None


def series_of(eid, books):
    """The series key and syllabus entry of an episode id. Returns ((key, entry), None) or (None, 'error')."""
    for key, syl in books.items():
        ep = next((e for e in syl if e['id'] == eid), None)
        if ep:
            return (key, ep), None
    return None, f'{eid} is not in {" or ".join(os.path.basename(s["syllabus"]) for s in SERIES.values())}'


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


def merge(spans, gap=60.0):
    """Sorted [start, end] spans, joined when under `gap` s apart."""
    out = []
    for a, b in sorted([list(s) for s in spans]):
        if out and a - out[-1][1] <= gap:
            out[-1][1] = max(out[-1][1], b)
        else:
            out.append([a, b])
    return out


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
    merged = merge([[s['start'], s['end']] for s in data.get('segments', []) if s['slide'] in slides], gap)
    seen = {s['slide'] for s in data.get('segments', [])}
    if not merged:
        return None, f'none of slides {slides[0]}-{slides[-1]} matched in {lecture}.slides.json'
    main = max(merged, key=lambda w: w[1] - w[0])
    return {'windows': merged, 'span': [max(0.0, main[0] - 5), main[1] + 5],
            'missing': [s for s in slides if s not in seen]}, None


def mmss(t):
    return f'{int(t // 60):02d}:{int(t % 60):02d}'


def secs(s):
    """'65:00' or '1:05:00' -> seconds. Returns (float, None) or (None, 'error')."""
    parts = str(s).strip().split(':')
    try:
        v = 0.0
        for p in parts:
            v = v * 60 + float(p)
    except ValueError:
        return None, f'not a time: {s!r}'
    return v, None


def lecture_files(lecture):
    """Paths and readiness of a lecture's course files (git-ignored)."""
    f = {k: os.path.join(COURSE, f'{lecture}.{k}') for k in ('pdf', 'txt', 'mp4', 'words.json', 'slides.json',
                                                             'transcript.md')}
    return {'files': f, 'ready': {k: os.path.exists(v) for k, v in f.items()}}


# ------------------------------------------------------------------ the quantum course (course-qc/)
def qc_base(lecture):
    """'Q24-03.notes' -> 'Q24-03'."""
    return lecture.split('.')[0]


def qc_lecture_files(lecture):
    """Paths and readiness of a quantum lecture's files in course-qc/ (git-ignored; no fetch tool: made ahead)."""
    b = os.path.join(QC_COURSE, qc_base(lecture))
    f = {k: f'{b}.{k}' for k in ('mp4', 'transcript.md', 'words.json', 'slides.json', 'sheet.png', 'pdf',
                                 'notes.pdf')}
    f['slides'] = b + '.slides'
    return {'files': f, 'ready': {k: os.path.exists(v) for k, v in f.items()}}


def qc_labels(spec):
    """'8', '9-10', 'p9-p10', 's3-s20', '33-35, 37' -> [('p', 8), ...] ('p' a deck page, 's' a slide cut from the
    recording). Returns (list, None) or (None, 'error')."""
    out = []
    for part in re.split(r'[,\s]+', str(spec).strip()):
        if not part:
            continue
        m = re.fullmatch(r'([ps]?)(\d+)(?:-([ps]?)(\d+))?', part)
        if not m or (m.group(3) and m.group(3) != m.group(1)):
            return None, f'not a slide range: {spec!r}'
        a, b = int(m.group(2)), int(m.group(4) or m.group(2))
        out += [('s' if m.group(1) == 's' else 'p', n) for n in range(a, b + 1)]
    return out, None


def qc_slides(lecture, spec, gap=60.0):
    """The files of a quantum lecture's slides and when they were on screen (course-qc/QYY-NN.slides.json, from
    tools/qc_slides.py). A cut frame that matches a deck page names it ("deck": tape the clean page). 'QYY-NN.notes'
    = pages of her notes PDF. Returns ({'files': [...], 'windows': [[start, end], ...], 'missing': [...]}, None) or
    (None, 'why not')."""
    labels, err = qc_labels(spec)
    if err:
        return None, err
    base = qc_base(lecture)
    if lecture.endswith('.notes'):
        pdf = os.path.join(QC_COURSE, f'{base}.notes.pdf')
        return {'files': [{'label': f'notes p{n}', 'pdf': pdf, 'page': n} for _, n in labels],
                'windows': [], 'missing': [] if os.path.exists(pdf) else [f'{base}.notes.pdf']}, None
    path = os.path.join(QC_COURSE, f'{base}.slides.json')
    if not os.path.exists(path):
        return None, f'no course-qc/{base}.slides.json (tools/qc_slides.py {base})'
    try:
        data = json.load(open(path))
    except (OSError, ValueError) as e:
        return None, f'{path}: {e}'
    deck = data.get('pdf')
    frames = data.get('gaps', []) if deck else data.get('segments', [])
    cut = (data.get('gap_slides') if deck else data.get('slides')) or {}
    files, spans, missing = [], [], []
    for kind, n in labels:
        if kind == 'p':
            if not deck:
                missing.append(f'p{n} ({base} has no deck)')
                continue
            on = [[s['start'], s['end']] for s in data.get('segments', []) if s.get('slide') == n]
            png = os.path.join(QC_COURSE, f'{base}.slides', f'p{n:02d}.png')
            files.append({'label': f'p{n}', 'png': png, 'png_found': os.path.exists(png),
                          'pdf': os.path.join(QC_COURSE, deck), 'page': n, 'on_screen': on})
        else:
            info = cut.get(str(n))
            if not info or not info.get('png'):
                missing.append(f's{n}')
                continue
            on = [[s['start'], s['end']] for s in frames if s.get('slide') == n and s.get('png')]
            png = os.path.join(QC_COURSE, info['png'])
            files.append({'label': f's{n}', 'png': png, 'png_found': os.path.exists(png), 'deck': info.get('deck'),
                          'on_screen': on})
        spans += on
    return {'files': files, 'windows': merge(spans, gap), 'missing': missing}, None


def qc_recording(ep):
    """The recording block, extra slides and lecture files of a quantum episode. Windows come from the syllabus's
    hand-picked `sources` (mm:ss of course-qc/QYY-NN.mp4); slide_windows from slides.json are a cross-check.
    Returns ((recording, extra, lectures), None) or (None, 'error')."""
    srcs, lecs = [], [ep['lecture']]
    for s in ep.get('sources', []):
        a, err = secs(s['start'])
        b, err2 = secs(s['end'])
        if err or err2:
            return None, f'{ep["id"]} sources: {err or err2}'
        srcs.append({**s, 'span': [a, b]})
        lecs.append(s['lecture'])
    prim = [s['span'] for s in srcs if s['lecture'] == ep['lecture']]
    main = max(prim, key=lambda w: w[1] - w[0]) if prim else None
    rec = {'lecture': ep['lecture'], 'slides': ep['slides'], 'sources': srcs, 'windows': prim, 'span': main}
    if main:
        rec['span_mmss'] = f'{mmss(main[0])}-{mmss(main[1])}'
    else:
        rec['why'] = f'no source window in {ep["lecture"]} (see "sources")'
    sl, why = qc_slides(ep['lecture'], ep['slides'])
    rec.update({'slide_files': sl['files'], 'slide_windows': sl['windows'], 'missing': sl['missing']} if sl else
               {'slide_files': [], 'slide_windows': [], 'slides_why': why})
    extra = []
    for x in ep.get('extra_slides', []):
        xs, why = qc_slides(x['lecture'], x['slides'])
        extra.append({**x, **({'slide_files': xs['files'], 'windows': xs['windows'], 'missing': xs['missing']} if xs
                              else {'slide_files': [], 'windows': [], 'why': why})})
        lecs.append(x['lecture'])
    lectures = {}
    for lec in lecs:
        lectures.setdefault(qc_base(lec), qc_lecture_files(lec))
    return (rec, extra, lectures), None


# ------------------------------------------------------------------ the choice
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


def series_for(morning, sched):
    """The series a morning belongs to by the schedule (mornings before its start are LLM mornings)."""
    d = dt.date.fromisoformat(morning)
    if d < sched['start']:
        return 'llm'
    pat = sched['pattern']
    return pat[(d - sched['start']).days % len(pat)]


def pick(syl, state, src='syllabus.json'):
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
    return None, f'every episode in {os.path.basename(src)} is made, skipped or blocked'


def choose(morning, books, state, sched):
    """The series and episode for a morning: the schedule's series, or (when_empty "other") the next series in the
    pattern, then any other, that still has one. Returns ((series, (ep, perms, mode, passed), note or None), None) or
    (None, 'why')."""
    want = series_for(morning, sched)
    res, err = pick(books[want], state, SERIES[want]['syllabus'])
    if not err:
        return (want, res, None), None
    whys = [f'{want}: {err}']
    if sched['when_empty'] == 'other':
        for s in dict.fromkeys(sched['pattern'] + list(SERIES)):
            if s == want:
                continue
            r2, e2 = pick(books[s], state, SERIES[s]['syllabus'])
            if not e2:
                return (s, r2, f'this is a {want} morning, but {err}: {s} takes it (schedule.json when_empty)'), None
            whys.append(f'{s}: {e2}')
    return None, '; '.join(whys)


def work_order(now=None, write=True, assume=()):
    """Decide tonight's episode and write its work order.
    Returns (dict with 'id' (None when there is nothing to do) and the order, None) or (None, 'error')."""
    now = now or dt.datetime.now()
    res, err = load(assume)
    if err:
        return None, err
    books, state, sched = res
    (open_days, taken), _ = mornings(now, state)
    if not open_days:
        return {'id': None, 'why': f'buffer full: videos exist for {", ".join(sorted(taken))}'}, None
    morning = open_days[0]
    res, err = choose(morning, books, state, sched)
    if err:
        return {'id': None, 'why': err, 'morning': morning, 'series': series_for(morning, sched)}, None
    series, (ep, perms, mode, passed), note = res
    syl, info = books[series], SERIES[series]
    mday = dt.date.fromisoformat(morning)
    deadline = min(dt.datetime.combine(mday, CUTOFF), now + BUDGET)
    late = deadline - now < MIN_BUDGET           # a late start (the Mac slept through 02:00): deliver late, not half-made
    if late:
        deadline = now + BUDGET
    work, deliver = os.path.join(WORK, ep['id']), os.path.join(DELIVER, f'{morning}_{ep["id"]}')
    missed = [now.date().isoformat()] if now.time() >= CUTOFF and now.date().isoformat() not in taken else []
    if series == 'qc':
        res, err = qc_recording(ep)
        if err:
            return None, err
        rec, extra, lectures = res
        slides = [f'{k}{n}' for k, n in qc_labels(ep['slides'])[0] or []]
    else:
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
    ids = {e['id'] for e in syl}
    made = {e['id'] for e in syl if e['status'] == 'shipped'} | \
        {k for k, e in state['episodes'].items() if e.get('status') in DONE and k in ids}
    prev = next((e for e in reversed(sorted(syl, key=lambda e: e['seq']))
                 if e['seq'] < ep['seq'] and (e['status'] == 'shipped' or
                                              state['episodes'].get(e['id'], {}).get('status') in DONE)), None)
    resume = []
    older = sorted(glob.glob(os.path.join(WORK, f'*_{ep["id"]}')), key=os.path.getmtime, reverse=True)  # before 10-07
    for d in [os.path.join(EDU, ep['episode_dir']), work] + older:
        if os.path.isdir(d):
            resume += sorted(os.path.relpath(p, EDU) if p.startswith(EDU) else p
                             for p in glob.glob(os.path.join(d, '**', '*'), recursive=True)
                             if os.path.isfile(p) and os.path.basename(p) not in ('work_order.json', 'art.pre.json')
                             )[:200]
    plan = os.path.join(EDU, ep['episode_dir'], 'art.pre.json')
    pre_drawn = None if not os.path.exists(plan) else {
        'plan': plan, 'library': LIBRARY, 'library_found': os.path.isdir(os.path.join(LIBRARY, 'src')),
        'how': 'PROMPT.md step 5 (pre-drawn art); daily/art.py pre EP counts what is made'}
    order = {
        'id': ep['id'], 'title': ep['title'], 'seq': ep['seq'], 'series_number': len(made) + 1,
        'series': series, 'series_name': info['name'],
        'series_info': {'key': series, 'name': info['name'], 'syllabus': info['syllabus'],
                        'syllabus_readable': info['readable'], 'course_dir': info['course'],
                        'file_naming': info['naming'], 'brief': info['brief'], 'episodes': len(syl)},
        'schedule': {'pattern': sched['pattern'], 'start': sched['start'].isoformat(),
                     'when_empty': sched['when_empty'], 'morning_series': series_for(morning, sched), 'note': note},
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
        'pre_drawn': pre_drawn,
        'passed_over': passed,
        'reference': books['llm'][0].get('shipped', {}),
        'syllabus_entry': ep,
    }
    if write:
        os.makedirs(work, exist_ok=True)
        with open(os.path.join(work, 'work_order.json'), 'w') as f:
            json.dump(order, f, indent=1, ensure_ascii=False)
        order['work_order'] = os.path.join(work, 'work_order.json')
    return order, None


def first_night(now):
    """The next 02:00 run from now (now itself when it is a night run between 02:00 and 08:45)."""
    if dt.time(2, 0) <= now.time() < CUTOFF:
        return now
    day = now.date() if now.time() < dt.time(2, 0) else now.date() + dt.timedelta(days=1)
    return dt.datetime.combine(day, dt.time(2, 0))


def plan(now=None, nights=2, assume=()):
    """The work orders of the next `nights` nightly runs (02:00), each assuming the nights before delivered on time.
    Nothing is written. Returns (list of (night datetime, order), None) or (None, 'error')."""
    t, acc, out = first_night(now or dt.datetime.now()), list(assume), []
    for _ in range(nights):
        order, err = work_order(t, write=False, assume=acc)
        if err:
            return None, err
        out.append((t, order))
        if order['id']:
            acc.append((order['id'], order['morning']))
        t += dt.timedelta(days=1)
    return out, None


# ------------------------------------------------------------------ outcomes
def mark(eid, status, mp4=None, morning=None, note=None, now=None, run=None):
    """Record an episode's outcome in state.json. A failure counts once per run (`run`, default $EDU_DAILY_RUN): the
    producer and run.sh may both mark the same night failed. Returns (entry, None) or (None, 'error')."""
    run = run or os.environ.get('EDU_DAILY_RUN') or None
    res, err = load()
    if err:
        return None, err
    books, state, _ = res
    res, err = series_of(eid, books)
    if err:
        return None, err
    _, ep = res
    if status not in ('delivered', 'failed', 'in-progress'):
        return None, 'status must be delivered, failed or in-progress'
    if status == 'delivered' and not (mp4 and os.path.exists(os.path.expanduser(mp4))):
        return None, 'delivered needs --mp4 pointing at the delivered video'
    e = state['episodes'].setdefault(eid, {})
    # run.sh under launchd cannot list ~/Downloads (macOS privacy, TCC: it can create files there but not see the
    # producer's), so its end-of-night check finds no mp4 and marks a delivered night failed (every launchd night since
    # 2026-10-09). A "failed" from the same run never overwrites that run's verified delivery: it is kept as a note.
    if status == 'failed' and e.get('status') == 'delivered' and run and e.get('run') == run and e.get('mp4'):
        e['note'] = (e.get('note', '') + ' | ' if e.get('note') else '') + 'kept delivered over a same-run failed mark: ' + (note or '')
        _, err = save_state(state)
        return (e, None) if not err else (None, err)
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


# ------------------------------------------------------------------ text
def status(now=None, assume=()):
    """The schedule, both queues and the buffer as text. Returns (text, None) or (None, 'error')."""
    now = now or dt.datetime.now()
    res, err = load(assume)
    if err:
        return None, err
    books, state, sched = res
    (open_days, taken), _ = mornings(now, state)
    lines = [f'now {now:%Y-%m-%d %H:%M}; open mornings: {", ".join(open_days) or "none (buffer full)"}',
             f'schedule: {" / ".join(sched["pattern"])} from {sched["start"]} (mornings before it: llm); '
             f'a series with nothing left: {sched["when_empty"]} ({SCHEDULE})']
    for m, eid in sorted(taken.items()):
        lines.append(f'  {m}  {eid}  {state["episodes"][eid].get("mp4", "")}')
    sim = copy.deepcopy(state)          # the open mornings in turn, each assuming the one before is made
    for m in open_days:
        res, err = choose(m, books, sim, sched)
        if err:
            lines.append(f'  {m}  ({series_for(m, sched)}) nothing: {err}')
            continue
        s, (ep, _, mode, _), note = res
        lines.append(f'  {m}  ({s}) would be {ep["id"]} "{ep["title"]}"' + (f'  [{note}]' if note else ''))
        sim['episodes'][ep['id']] = {'status': 'delivered', 'morning': m}
    for key, syl in books.items():
        res, err = pick(syl, state, SERIES[key]['syllabus'])
        made = sum(1 for e in syl if e['status'] == 'shipped' or state['episodes'].get(e['id'], {}).get('status') in DONE)
        head = f'{key} ({SERIES[key]["name"]}, {made} of {len(syl)} made)'
        if err:
            lines.append(f'{head}: {err}')
            continue
        ep, perms, mode, passed = res
        lines.append(f'{head} next: {ep["id"]} "{ep["title"]}" ({ep["lecture"]} slides {ep["slides"]}, '
                     f'{ep["target_min"]} min, {mode})')
        lines += [f'  passed over: {p["id"]}: {p["why"]}' for p in passed]
    for eid, e in state['episodes'].items():
        if e.get('status') not in DONE:
            lines.append(f'  {eid}: {e.get("status")} ({e.get("attempts", 0)} failed) {e.get("note", "")}')
    return '\n'.join(lines), None


def summary(order):
    """The work order as a few lines of text."""
    if not order['id']:
        return [f'nothing to do: {order["why"]}']
    r, sc = order['recording'], order['schedule']
    out = [f'{order["id"]} "{order["title"]}" for the morning of {order["morning"]} (deadline {order["deadline"]})',
           f'  series: {order["series"]} = {order["series_name"]} (part {order["seq"]} of '
           f'{order["series_info"]["episodes"]}; schedule {"/".join(sc["pattern"])} from {sc["start"]})']
    if sc['note']:
        out.append(f'  schedule note: {sc["note"]}')
    out.append(f'  syllabus entry: {order["series_info"]["syllabus"]} ({order["id"]}); course files: '
               f'{order["series_info"]["course_dir"]}/')
    out.append(f'  {order["lecture"]} slides {order["slides"]}; recording {r.get("span_mmss") or r.get("why")}; '
               f'{order["target_min"]} min; {order["mode"]}')
    for s in r.get('sources', []):
        out.append(f'  source {s["lecture"]} {s["start"]}-{s["end"]} ({s.get("slides", "")}: {s.get("what", "")})')
    if order['series'] == 'qc':
        found = sum(1 for f in r['slide_files'] if f.get('png_found'))
        out.append(f'  slide files: {found} of {len(r["slide_files"])} found'
                   + (f'; missing {", ".join(r["missing"])}' if r.get('missing') else '')
                   + (f'; {r["slides_why"]}' if r.get('slides_why') else ''))
        ready = [k for k, v in order['lectures'].items() if v['ready']['transcript.md']]
        out.append(f'  lectures: {" ".join(order["lectures"])} (transcripts: {" ".join(ready) or "none"})')
    for x in order['extra_slides']:
        out.append(f'  + {x["lecture"]} slides {x["slides"]} ({x["why"]})')
    for p in order['passed_over']:
        out.append(f'  passed over {p["id"]}: {p["why"]}')
    if order['missed']:
        out.append(f'  missed: {", ".join(order["missed"])} has no video')
    if order['resume_files']:
        out.append(f'  resume: {len(order["resume_files"])} files from an earlier attempt')
    if order['pre_drawn']:
        out.append(f'  pre-drawn art: {order["pre_drawn"]["plan"]} (library {order["pre_drawn"]["library"]}'
                   f'{"" if order["pre_drawn"]["library_found"] else ": NOT FOUND"})')
    if order['previous']:
        out.append(f'  previous in this series: {order["previous"]["id"]} "{order["previous"]["title"]}"')
    out.append('  work order: ' + order.get('work_order', '(dry run, not written)'))
    out.append('  deliver to: ' + order['deliver_dir'])
    return out


def main():
    ap = argparse.ArgumentParser(description='pick the next daily episode; see the module doc')
    ap.add_argument('cmd', nargs='?', default='order', choices=['order', 'status', 'mark', 'verify', 'plan'])
    ap.add_argument('args', nargs='*')
    ap.add_argument('--now')
    ap.add_argument('--dry', action='store_true')
    ap.add_argument('--shell', action='store_true')
    ap.add_argument('--json', action='store_true')
    ap.add_argument('--nights', type=int, default=2)
    ap.add_argument('--assume', action='append', default=[])
    ap.add_argument('--mp4')
    ap.add_argument('--morning')
    ap.add_argument('--note')
    ap.add_argument('--run')
    ap.add_argument('--timeline')
    a = ap.parse_args()
    now = dt.datetime.strptime(a.now, '%Y-%m-%d %H:%M') if a.now else None
    assume = []
    for x in a.assume:
        m = re.fullmatch(r'([A-Z]+\d\d-\d\d)@(\d{4}-\d\d-\d\d)', x.strip())
        if not m:
            sys.exit(f'--assume wants ID@YYYY-MM-DD (L03-03@2026-10-16), not {x!r}')
        assume.append((m.group(1), m.group(2)))
    if assume and a.cmd in ('mark', 'verify') or assume and a.cmd == 'order' and not a.dry:
        sys.exit('--assume only goes with --dry, plan or status (it is never written)')
    if a.cmd == 'status':
        text, err = status(now, assume)
        if err:
            sys.exit(err)
        print(text)
        return
    if a.cmd == 'plan':
        res, err = plan(now, a.nights, assume)
        if err:
            sys.exit(err)
        if a.json:
            print(json.dumps([{'night': t.strftime('%Y-%m-%d %H:%M'), 'order': o} for t, o in res], indent=1,
                             ensure_ascii=False))
            return
        for i, (t, o) in enumerate(res):
            print(f'=== night {i + 1}: the run at {t:%Y-%m-%d %H:%M}'
                  + (' (assuming the nights before delivered on time)' if i else ''))
            print('\n'.join(summary(o)))
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
    order, err = work_order(now, write=not a.dry, assume=assume)
    if err:
        sys.exit(err)
    if a.shell:
        if not order['id']:
            print(f"EP_ID=''\nEP_WHY={shlex.quote(order['why'])}")
            return
        lecs = ' '.join(order['lectures'])
        si = order['series_info']
        for k, v in (('EP_ID', order['id']), ('EP_TITLE', order['title']), ('EP_LECTURES', lecs),
                     ('EP_MORNING', order['morning']), ('EP_DEADLINE', order['deadline']),
                     ('EP_DEADLINE_EPOCH', order['deadline_epoch']), ('EP_WORK', order['work_dir']),
                     ('EP_DELIVER', order['deliver_dir']), ('EP_DIR', order['episode_dir_abs']),
                     ('EP_ORDER', order.get('work_order', '')), ('EP_MODE', order['mode']),
                     ('EP_LATE', int(order['late'])), ('EP_MISSED', ' '.join(order['missed'])),
                     ('EP_SERIES', order['series']), ('EP_SERIES_NAME', order['series_name']),
                     ('EP_SYLLABUS', si['syllabus']), ('EP_COURSE', si['course_dir']), ('EP_NAMING', si['file_naming']),
                     ('EP_BRIEF', si['brief']), ('EP_SCHEDULE_NOTE', order['schedule']['note'] or '')):
            print(f'{k}={shlex.quote(str(v))}')
        return
    if a.json:
        print(json.dumps(order, indent=1, ensure_ascii=False))
        return
    print('\n'.join(summary(order)))


if __name__ == '__main__':
    main()
