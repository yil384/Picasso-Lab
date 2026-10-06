---
name: picasso-edu-series
description: The @PicassoLabUCSD knowledge channel - vertical 9:16 explainers, English cut on X and Chinese cut on Douyin. Main line "Compute Not Included / 算力另计" (code-rendered desk-miniature explainers of Prof. Ding's CSE 291P LLM-systems course and the lab's quantum work, three.js + q5.js frame by frame); side line "Not on the Exam / 这题不考" (iPhone vlog "tutorials" with a code-assisted edit). Use for planning or making any episode, its script, facts, style frames, captions or post, a side-line shoot, the course materials, or to resume this work in a new session.
---

# The explainer channel (main line + side line)

Everything lives in `.claude/films/edu/`. Read its `README.md`, then `SERIES.md` (the bible, Chinese; section 13 lists
the decisions still open), then the episode folder you are working on.

## Direction change (2026-10-04, from the user)
Pure-3D three.js films were judged weak: the channel is now **2D-first**, with 3D only as an accent or a render
effect (depth of field and parallax for flat planes, engraved/hatched 3D props, a GPU paint or print pass). The
white-card hospital look-dev in `look/` predates this; reuse its ideas, not its 3D-first look. Read
`research/2d-references.md` (two sweeps of Claude-made 2D animation, with what to take and what to avoid) before
designing frames; the proposed next step is a 2D style bake-off of the pilot's cold open in four looks.

## Ground rules (from the user and the bible)
- Vertical 1080x1920, 30 fps. The English cut goes to X (keep it under 2:15 until the account tier is known), the
  Chinese cut to Douyin. The picture is rendered once; every word in the picture (signs, tiles, tickets, notes,
  captions) comes from a per-language string table (`?lang=en|zh`).
- Main line: every picture is rebuilt in code, even where a lecture recording exists. Recordings are only for voice and
  anecdotes. Course PDFs come from Drive with `tools/fetch_course.py` into the git-ignored `course/`; never commit them.
- Look: the approved launch-film night desk under the banker's lamp; each idea is a physical miniature on the desk
  (white-card architecture, ivory token tiles, thermal receipts, stamps, red pen, sticky notes) shot like a tilt-shift
  macro with real lens depth of field (`look/accum.js`). Hard-surface hardware is real 3D; characters are the painted
  cast from `.claude/films/xlaunch/art` (Codex on green, keyed), never code primitives.
- Facts: nothing goes on screen or into the voice-over unless the episode's `FACTS.md` clears it, in its safe wording
  (e.g. "37B per token", never "at a time"; "8 per layer, plus the shared expert"; the paper's 6.6x always with
  "simulated, wafer-scale"). Slides are teaching material: check numbers against the primary source before use.
- Comedy: the gag must be the explanation (four tests in `SERIES.md` section 7). No jokes about any real person.
  Chinese puns are replaced in English, never translated.
- Safe zones (calibrate once with a test upload): keep clear top 0-260, bottom 1480-1920, right rail x 880-1080 for
  y 700-1480; title y 260-560; captions x 120-880, y 1200-1440, at most two lines. `?guides=1` draws them.

## Making frames
```sh
python3 .claude/films/edu/tools/snap.py look/look.html 0 1 2 --out DIR [--q lang=zh] [--q guides=1] [--q spp=8]
python3 .claude/films/edu/tools/sheet.py OUT.jpg DIR/*.png --h 900
python3 .claude/films/edu/tools/cjk_fonts.py look/look.html look/hospital.js     # after adding Chinese strings
```
A 1080x1920 frame with 32-sample depth of field takes about 2.5 s on the M2. Show the user contact sheets of EN and
ZH frames at phone size, in Chinese, and say what was not checked. Disk is tight (about 14 GB free): keep renders in
the session scratchpad or an external disk, never in the repo.

## Lessons (each cost a render)
- Anything lying on the desk must sit above the desk plane; coplanar faces z-fight as 32 px blocks under lens jitter.
- Never paste a `//` comment into the middle of a one-line statement (it disabled the model's scale).
- The white cat blooms out near the lamp: sprite `light` <= 0.85, bloom threshold 0.85.
- Covers: check with `guides=1`; the tower drifted into Douyin's button rail and a long English caption ran past x 880.
- Story logic must be physical: the token's ticket comes out of the kiosk's slot, not out of the air.
- The proscenium opening narrows to x 333-739 near the boards (L01-1 layout): anything behind the front outside it is
  hidden by the curtains. Paddles, notes and tags must be placed inside it or in front of the front plane.
- A card stunt reads only if the cards nearly touch and are drawn clean over the puppets' hands (pitch 28 x 24).
- A stamp needs paper under it; one floating in the air reads as a glitch.
- Codex sometimes ignores "green background" and returns a real transparent PNG: check the mode before keying.

## The 2D pipeline (built for L01-1, reuse it)
- `kit2d/`: the stage compositor (planes through a perspective camera, depth of field by plane, a multiply light map
  per plane, beams with dust) and the risograph press, ported with MIT credit (`kit2d/THIRD_PARTY.md`). Its code cat
  is for blocking only: every character and set piece on screen is painted with Codex and keyed.
- `art/gen.sh NAME "prompt" [refs]` (Codex image, green screen; `REFNOTE=` says what the reference is), `art/key.py`
  (edge unmixing: no green or olive rims on red felt; keeps a real alpha when Codex returns a cutout), `art/split.py`
  (a sheet of poses -> one sprite each). Sources in `art/src/` are committed; `art/cut/` is regenerated.
- An episode film = `film.html` + `film.js` (one pv scene; `addD(K, z, fn)` draws in design px on plane z),
  `strings.js` (every word, EN/ZH), `timeline.json` (the one clock for picture, voice and foley), `mix.py`
  (scratch voice fitted into the slots, synthesized foley, -14 LUFS). `tools/tts.py` makes the scratch voice with word
  marks; `tools/film.py` renders in parallel and encodes. A cut of 81 s renders in about 3.5 min on the M2.
- Template: `episodes/l01-1-scale/film/` (README there has every command).

## Daily episodes (from 2026-10-07)
Every morning at 9:00 a new 4-10 min English explainer of the next part of CSE 291P, in L01-01's line look
(`episodes/l01-5min`), made unattended on this Mac. Everything is in `daily/` (its `README.md` first):
- The queue is `daily/syllabus.json` (53 episodes; `SYLLABUS.md` is the readable copy); `daily/state.json` records
  what was delivered (by morning), failures, the guest policy, speakers' OKs and skips. `daily/next.py` picks the
  episode and the morning (at most 2 days ahead) and writes the work order; `next.py status` shows the queue.
- launchd (`com.picassolab.edu-daily`, 02:00) runs `daily/run.sh`: lock, caffeinate, `git pull --ff-only`, new decks,
  the episode's recording and transcript, then a headless agent session with `daily/PROMPT.md` (the whole per-episode
  pipeline and the user's rules) killed at 08:45; a notification if no mp4 arrived. `DRY_RUN=1` stops before the
  session. Install with `daily/install.sh` (not installed until the user says so).
- Course recordings: `tools/fetch_recordings.py Lnn|--all` (Drive, resumable; no L11 recording, no L15 deck);
  `tools/transcribe.py Lnn|--all` -> `course/Lnn.words.json`, `Lnn.slides.json` (when each slide is on screen, by
  thumbnail match), `Lnn.transcript.md`. All git-ignored.
- Her clips: `daily/clips.py cut|check` (two recognizers must agree with the quote: `exact` or `near`, else re-cut or
  drop). Drawings: `daily/art.py gen|pack|prompts` (image tool 3 at a time with checks; when it is out of quota,
  `art-prompts.html` in the delivery folder for the user). The film data follows `kit-lesson/README.md`.
- Delivery: `~/Downloads/picasso-daily/<morning>_<id>/` (mp4, cover, contact sheet, `x_post.md`, `report.md` in
  Chinese). Git: `daily/ship_git.sh` commits only the given paths, merges into origin/main in a temporary detached worktree
  (no branch left checked out). Offline checks: `kit-lesson/lint.py`; a finished mp4: `daily/next.py verify`.
- Lessons: one 80-min recognizer pass needs over 10 GB and swaps this 16 GB Mac (transcribe in 5-min chunks cut at
  pauses); a headless session inherits `permissions.defaultMode` from `~/.claude/settings.json` (a bare background
  Bash job dies when the session ends its turn; use nohup + a done-marker, or a Monitor); the image tool's `gen.sh`
  exits 0 even when it fails (check the file and the log).

## State (2026-10-04)
L01-1 "One Ant Can't Add" / 《一只蚂蚁不会算数》 (CSE 291P L01 Background, slides 9-11): FACTS.md (incl. section G),
SCRIPT.md (two scripts, judge, synthesis), v1 film EN + ZH rendered with scratch voices (edge-tts), Prof. Ding's own
lecture line in B7 (**needs her OK**; fallback line ready), synthesized foley, no music. Waiting on the user: notes on
v1, the voice plan, Prof. Ding's OK, Douyin naming of companies (SCRIPT.md section 16), music.

2026-10-05: the user found v1 rough (small subject, corner cat, jitter, synth sfx). Style cut v2 (`film/film2.html`,
25 s, B0-B2 + logo end card) fixed it and was approved as "much better". Next session: carry v2's way of working
(frame-filling stage, smooth motion, CC0 sound, logo end card) through the rest of the episode; open: episode length
(X non-Premium caps at 2:20), voices, Prof. Ding's OK, music credit.

Earlier:
Done: research (7 reports), the bible draft, the pilot (E01, MoE) fact brief, three competing scripts, two judges and
the merged SCRIPT.md (129.5 s), side-line shooting cards, and round-1 style frames of the pilot (`look/e01.html`:
F1, F3, F5a, F5b, F8 in EN and ZH; earlier look-dev in `look/look.html`). The plan page for the user is a private
artifact (https://claude.ai/artifact/TvddvFnpm5aKKNvoWf1ctu).
Waiting on the user: series names, voice (who records EN / ZH; Chinese VO or English VO with Chinese subtitles for
Douyin), pilot choice, Douyin account holder, Prof. Ding's line, Zhongkai's trace data and consent, music.
Next: the user's notes on round 1; round-2 frames (F2, F4, F6, F7); new art (cat_stamp, a cat paw) via Codex; the
lab's DeepSeek-R1 routing trace for B3/B9/B11; then the edu-kit timeline per `research/pipeline.md`.
