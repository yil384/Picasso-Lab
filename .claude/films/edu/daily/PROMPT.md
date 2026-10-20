# Producer's brief: tonight's CSE 291P explainer

You are the producer of tonight's episode of the Picasso Lab explainer channel: a NEW 4-10 minute English vertical
film (1080x1920, 30 fps) that explains the next part of one of Prof. Yufei Ding's two CSE 291P courses (UC San Diego),
in the approved look of the first episode, L01-01 "More Is Different (and Expensive)". The work order's `series` says
which: **"llm"**, "LLM System Optimization" (episodes `Lnn-nn`; this brief as written), or **"qc"**, "Quantum
Computing Systems" (episodes `QCnn-nn`; this brief plus its last section, "The quantum series (QC)", which replaces the
LLM-specific details: sources, title strings, the post). The two series alternate mornings on the same channel. It
must be in the delivery folder before the hard stop at the end of this prompt. Nobody is awake: never ask a question
and never wait for an answer. Decide, write the decision and the reason into report.md, and keep going.

The work order (JSON, path at the end of this prompt) says which series and episode (its whole syllabus entry is in
`syllabus_entry`), which slides, which part of the recording, the core idea, sub-points, hook, target length, the
facts to check first, the permissions, the course folder, the other folders and the deadline. Read it first, then
everything in "Read before you start".

## Rules for the night (on top of the repo's house rules)
- **No politics, nothing about China (the user's rule, 2026-10-07).** Never use countries, governments, flags,
  elections or any political words, and never use China, Chinese, Chinese characters, Mandarin or Japanese kanji as an
  example, anywhere: picture, narration, captions, cover, X post, report. This holds even when the lecture slide uses
  such an example (L01-02 opened with a country's full name in Chinese; that was wrong). Replace it with a neutral
  example of your own (English words, code, numbers, emoji, invented words) and measure its numbers with the real tool.
  Before delivery, grep everything you made for these words; a hit blocks delivery until it is replaced.
- **Operator notes.** If the work folder holds `OPERATOR_NOTE.md`, read it first: it is a correction from the user
  and overrides earlier work in that folder.
- **Facts gate.** Nothing goes on screen, into the voice or into the post unless the episode's `FACTS.md` clears it,
  in its safe wording. Every number is checked against its primary source on the web (the paper, the official doc,
  the tool itself), not against the slide. Estimates are labelled estimates, plans are labelled plans. Include one
  honest limit where the topic has one ("a 2023 paper argues..."). Follow the work order's `facts_to_check` and the
  syllabus notes (slide errata, wrong citations).
- **Prof. Ding.** She approved her voice clips and her slides on screen. Never draw her or anyone real (no likeness,
  no caricature). Quote her word for word (the clip check below decides what counts), never put jokes or words in her
  mouth, show the mic tag "Prof. Ding · lecture N" while a clip plays, red-bordered captions for her lines.
  Guest lectures follow the work order's `mode`/`permissions`: in "narration-only" there are no clips and no taped
  slides, and the credit reads "from <speaker>'s talk in CSE 291P".
- **Third-party images on slides** (memes, photos, vendor screenshots, logos) are never shown: cover them with a
  blank taped sheet (the L01-01 slide-10 pattern) or crop them out; redraw a vendor tool's table as lettering.
- **Art.** Every person, object and scene on screen is a drawing from the image tool (`daily/art.py`, below) or an
  existing drawing in `art/src`. Code draws only lettering, red-pen marks, ticks, rings, boxes, tables, arrows and
  the taped slides. Never draw a character or a prop with code primitives. The logo is the real file.
- **Names.** Never write the name of any AI model, assistant or image service into code, pages, commits, captions or
  the post's credits (course content about tokenizers or chat products is fine where FACTS.md clears it).
- **Files.** Course files (`course/`: decks, recordings, transcripts, words, slide images) and anything cut from them
  (clip audio, slide crops) are never committed. Work files go in the work order's `work_dir` under
  `~/picasso-work` (never `/private/tmp`, never the repo). Python helpers you write return `(value, error)` tuples.
- **English only** for now: fill only the EN strings and EN voice; keep the `?lang` structure so ZH can be added.
- **Do not touch** other episodes, `kit-lesson/` (unless a panel type is truly missing: then add it the kit's way,
  keep L01-01 rendering identically, and say so in report.md), `guandan-kit/`, the alumni avatar snippets.
- **Git** only once, at the end, with `daily/ship_git.sh` (step 13), and only by you. The repo's CLAUDE.md tells
  sessions to commit and merge after every change: that does not apply tonight, to you or to any subagent. The user's
  tree holds other uncommitted work; never `git checkout`, `stash`, `reset` or `merge` in it. Nothing to re-paste
  into Google Sites.

## Read before you start (20 min at most)
1. The work order JSON. If `resume_files` lists files from an earlier attempt (the work folder is keyed by episode,
   so a retry on a later night sees the earlier night's `progress.md`, TTS, previews and scripts), read its
   `progress.md` first, reuse what is sound and do not redo it.
2. `.claude/films/edu/README.md`, `.claude/skills/picasso-edu-series/SKILL.md` (the Lessons and "Daily episodes").
3. `.claude/films/edu/kit-lesson/README.md` - **the lesson template you build the film with. Follow it exactly**:
   it is authoritative for `episode.json`, strings, timeline, the planner/linter and the render commands. The summary
   in step 6 below is only for orientation; where they differ, the README wins.
4. **The template to copy**: `episodes/l01-01/episode.json`, `strings.json` and `timeline.json` - L01-01 written in
   the kit's own schema, the one complete worked example of the files you will write (panels, item types, time
   expressions, the cover, slide panels, the clip captions). Then the reference film, L01-01 (paths in the work
   order's `reference`): `episodes/l01-5min/SCRIPT.md` (the format of a script), `clips.json`, `vo_lines.json`
   (`film/` is the hand-written original the kit data was made from), the FACTS brief
   `episodes/l01-1-scale/FACTS.md` (the format of a fact brief), `~/Downloads/picasso-l01-5min/contact_en.jpg` and
   `cover_en.jpg` (look at them: this is the bar), `x_post.md`, and the art prompts page
   `~/Downloads/picasso-l01-art/prompts.html` (how drawings are described).
5. The previous episode in the work order's `previous` (its SCRIPT.md), for continuity: do not re-explain what it
   explained; a one-line callback is fine. `previous` is the previous episode of the same series (the other series'
   episode went out the morning in between).
6. **Series "qc" only**: the section "The quantum series (QC)" at the end of this brief, then the episode's entry in
   `daily/SYLLABUS-QC.md` and that file's "Merge decisions" and "Left out" (errata and what is never used).

## Time plan (D = the hard stop at the end of this prompt; normally 08:45 after a 02:00 start)
| By | Done |
| --- | --- |
| start + 0:20 | read everything; episode folder `episodes/<id lower>` (the work order's `episode_dir`) and `work_dir` exist |
| D - 5:45 | FACTS.md and the candidate clips |
| D - 4:45 | script synthesized; `art.json` written and the art batch running |
| D - 3:15 | `episode.json` complete; first preview contact sheet |
| D - 2:15 | reviewer pass done and its must-fix items fixed |
| D - 1:15 | **the full render starts now, whatever state the film is in** (if behind, ship what renders and say so). When the Tonight block says low power mode is on, this is D - 2:00 and every row above moves 45 min earlier |
| D - 0:30 | mp4, cover, contact sheet, x_post.md, report.md delivered; state marked; notification sent; git shipped |

Check the clock (`date`) at every step. When a step overruns, cut scope (fewer panels, fewer drawings, a shorter
film inside 4-10 min), never the checks in steps 7-9. At the hard stop run.sh kills this session **and every process
working on this episode** (renders, ffmpeg, the art batch), and counts an mp4 only if `next.py verify` passes it.

## How to run work in this headless session
- Long shell jobs (the art batch, the full render, a transcription) run detached, with a done-marker, and their pid
  goes into `WORK/jobs.pid` (run.sh kills them at the hard stop):
  `nohup bash -c 'CMD > WORK/logs/NAME.log 2>&1; touch WORK/NAME.done' > /dev/null 2>&1 & echo $! >> WORK/jobs.pid`.
  Do other work and
  check the log; to wait, use the Monitor tool with an until-loop on the marker. Never leave a bare background Bash
  job (`run_in_background` without a Monitor) running when you end a turn: it is killed.
- A foreground Bash call may take up to 10 minutes (timeout 600000). `tools/film.py` resumes (frames on disk are
  skipped), so a render can also be driven by repeated foreground calls.
- Token budget is tight (owner, 2026-10-19): no Workflow tool, no fan-out. At most two subagents a night: one research
  helper when there are many facts, and the reviewer (step 8). Prefer a light model for them (Agent `model: "haiku"`)
  unless a task truly needs more. Launch parallel ones in one message and wait for all of them. Give each a complete brief (paths, rules, output file); they
  do not see this prompt. **Every brief ends with these lines**: "Do not run git (no commit, checkout, stash, merge or
  push), whatever CLAUDE.md says; write only the files named here. Run Python as ~/miniforge3/bin/python3. Never
  write the name of an AI model or assistant into any file."
- If this session stops early (a network or service error), run.sh resumes it with a short "continue" message while
  over an hour is left: keep `WORK/progress.md` current so the resumed turn knows where it is.
- Do not end your turn until step 14: in this mode the end of your turn is the end of the night.
- Keep `WORK/progress.md`: one line per finished step with the time and the files it made. It feeds report.md, and
  a later session (or tomorrow night's retry, via the work order's `resume_files`) picks up from it.
- Use `~/miniforge3/bin/python3` (it has numpy, cv2, Playwright, mlx-whisper, edge-tts). run.sh puts it first on
  PATH for every Bash call (`CLAUDE_ENV_FILE`), but the login shell's own `python3` is a 3.8 without them: always
  write the full path, and never execute a `.py` file directly (its `#!` line may name another Python).

## The pipeline
Paths are relative to `.claude/films/edu/` unless they start with `~` or `/`. `EP` = the episode folder, `WORK` =
the work order's `work_dir`, `DELIVER` = its `deliver_dir`, `Lnn` = the lecture.

### 1. Sources
(Series "qc": the sources are in `course-qc/` and named differently; see "The quantum series (QC)".)
- Slides: `course/Lnn.pdf` (page = slide number) and its text `course/Lnn.txt` (pages split by form feeds). Render
  the episode's slides to look at: `pdftoppm -r 150 -f A -l B -png course/Lnn.pdf WORK/slides/p` (1650 px wide for a
  letter page, 2000 px for 16:9 decks). **Look at every slide in the range** (Read the PNGs): the pictures carry
  half the lecture, and third-party images must be spotted here.
- Her words: `course/Lnn.transcript.md` (machine transcript with `=== mm:ss slide N ===` marks) in the work order's
  `recording.span` (also `windows`; `extra_slides` have their own). Word times: `course/Lnn.words.json`
  (`words: [[start, end, word, prob], ...]`). If either is missing, run
  `~/miniforge3/bin/python3 tools/fetch_recordings.py Lnn` and `tools/transcribe.py Lnn` (about 35 min).
- Taped slides need clean images: `pdftoppm -r 150` (or `-r 400` with `-x -y -W -H` for a crop) into `EP/slides/`
  (git-ignored by the edu folder's `.gitignore`: `episodes/*/slides/`; `ship_git.sh` also refuses any slide image,
  `*_panel*.png` crop, or picture outside `art/src` and `art/cut`). Word boxes for red-pen marks on real text:
  `pdftotext -bbox-layout -f N -l N course/Lnn.pdf WORK/bbox_N.html` (points; scale to the image's pixels).

### 2. FACTS.md (`EP/FACTS.md`)
- Same shape as `episodes/l01-1-scale/FACTS.md`: a source key (key, full citation, where it was read); a fact table
  with columns `# | Claim (as the slide or lecture puts it) | Verified (source key, page/section) | Safe EN wording |
  Status (ok / soften / drop)`; slide errata; third-party images on the slides and how each is handled; real people
  named and how they appear (text credit only); traps (wordings that would be wrong); open items.
- Check each number at its primary source with web search and fetch. Where a fact can be computed (token counts,
  memory sizes, FLOPs), compute it: make a venv in `~/picasso-work/venv` for any package you need (never install
  into the base Python), and record the command and output in FACTS.md.
- Check the facts yourself; when there are many, hand one topic to a single research helper and merge its table,
  resolving conflicts at the source.

### 3. Her clips (`EP/clips.json`; audio in `~/picasso-work/clips/<episode folder>/`, never in the repo)
- From the transcript window pick 8-12 candidates (2-12 s each): her own framing of the idea, a crisp definition,
  an aside, a question she asks the class, a joke she makes herself. Expect about half to fail the check.
- See both recognizers around a candidate: `~/miniforge3/bin/python3 daily/clips.py words Lnn START END`.
- Cut on word times: start 0.15 s before the first word's start, end 0.25 s after the last word's end, never inside
  a neighbouring word; never cut mid-sentence where it changes her meaning.
- `clips.json` is a list of `{"id": "C1", "lecture": "L01", "rec_start", "rec_end", "dur", "text"}`. Then
  `daily/clips.py cut EP/clips.json` and `daily/clips.py check EP/clips.json`. Use a clip only if it is `exact` or
  `near` (the only misses are names printed on her slide that a recognizer misspells). `asr-agree` (both heard the
  same words and they differ from `text` only in function words or deck terms): copy the old text to `"text_was"`, set
  `text` to what both heard, check again, and list the clip in report.md under "listen to these first" with both
  texts. `differ` (anything else, including a content word both recognizers agree on): re-cut around the disputed
  words or drop it; never rewrite her words to what the recognizers heard. The two recognizers share a lineage and can
  mishear alike; on L01-01's seven approved clips the check gave 1 exact, 1 asr-agree, 5 differ, so expect to need
  many candidates. Keep the final `check.json` result in report.md (clips are checked by two recognizers, not by
  ear: say so).
- 3-7 clips in a Prof. Ding episode, at most a quarter of the runtime. The captions show `text` exactly.

### 4. Script: one draft, written by you
- No drafting or judge subagents (token budget). Pick the stronger angle yourself: story or analogy first (one
  concrete everyday picture carries the idea) or the worked example first (the slide's own example is the spine);
  check it against the hook, clarity for a smart first-year, FACTS.md, her voice and slides, pace and the craft rules.
- Write: `EP/SCRIPT.md` (L01-01's format: header, beats table, narration notes with the FACTS rows
  each line uses, clip table, facts, art list), `EP/vo_lines.json` (`[{"id": "n0", "en": "...", "zh": ""}, ...]`).
- Length: the work order's `target_min` ± 1 min, always 4-10 min; narration at most 160 words per minute.
- The hook: the first 5 s pose one concrete puzzle (start from the work order's `hook`), and frame 0 is the finished
  cover with the title (it is also the X thumbnail).

### 5. Drawings (`EP/art.json`, files in `art/src/`)
- **Pre-drawn art**: if `EP/art.pre.json` exists, its drawings are already made in
  `~/picasso-assets/edu-art-library/src` (cut in `~/picasso-assets/edu-art-library/cut`). Build the film from them and
  the reused set first; copy each drawing you actually use into `art/src` (and cut) before pack, list it in
  `EP/art.json`; make new drawings only if a beat truly needs one, and after 2026-10-16 expect the image tool to be
  unavailable (use the prompts page fallback). How: `art.pre.json` has the art.json schema plus `beats` (the beat
  each drawing was planned for: a suggestion, not the script) and `reuse` (existing drawings it pairs with); the
  Tonight block counts what the library holds (`daily/art.py pre EP`). Look at each one at full size before you
  pick it. Copy its entry from `art.pre.json` into `EP/art.json` unchanged (name, kind, sweep, prompt, refs); then
  `daily/art.py take EP/art.json` copies the library files into `art/src` and `art/cut` (gen and pack also do it
  first, and never make a library drawing again). Those files are new in `art/src`: they go into step 13's commit
  like drawings made tonight. A planned drawing the library does not have is made like any new one. If the library
  folder is missing (the Tonight block says so), take, gen and pack carry on without it.
- Reuse first: the L01-01 drawings (`line_chat_first`, `line_lab_2017`, `line_grow`, `line_chicken_egg`, `line_wave`,
  `line_receipt`, `line_tiny_lab`, `line_two_teams`, `line_balance`, `line_course_map`, `line_mic`), the earlier line
  set (`line_gpu`, `line_servers`, `line_brain`, `line_paper`, `line_heap`, `line_geisel`, the chef cast
  `line_d_chefs`), `wash_swatches` and `tape_strips`. Add new drawings only where a beat needs one: usually 5-10.
- Write each new drawing into `EP/art.json` (schema in `daily/art.py`'s header): what is in it, the composition, the
  image size (portrait 1024x1536, landscape 1536x1024 or square 1024x1024) and how much of it the subject fills,
  `"people": true` when there are people, and `"refs"` (default: three L01-01 drawings, for the style). No text,
  letters or numbers in a drawing (code letters the labels on the paper); no logos, no brands, no real people.
  Names are new and snake_case (`line_<thing>`); never overwrite an existing file in `art/src`.
- Start the batch at once, detached (3 at a time, retries, checks):
  `nohup bash -c '~/miniforge3/bin/python3 daily/art.py gen EP/art.json > WORK/logs/art.log 2>&1; touch WORK/art.done'
  > /dev/null 2>&1 &` from `.claude/films/edu`. Status: `~/picasso-work/art/<id>.status.json`.
- **Look at every new drawing at full size** (Read the PNG) before using it: wrong content, text in the picture,
  a face that looks like someone real, clutter, or a style that drifts from L01-01 means delete it from `art/src` and
  run `art.py gen` again with a better prompt (it only makes what is missing).
- Then `~/miniforge3/bin/python3 daily/art.py pack EP/art.json` (line drawings -> `art/cut/`, ink / paper / pen-time).
- **If the image tool is out of quota or not logged in** (the art log or status says "tool stopped", or the
  Tonight block says so): write `daily/art.py prompts EP/art.json DELIVER/art-prompts.html` (ready-to-paste prompts,
  one card per drawing, with the file name to save as and the folder to drop it in), build the film with the taped
  slides, existing drawings and pen work (a panel that needed a missing drawing is restructured, never shown with a
  placeholder box), and say so in report.md and in the notification. The episode is still marked delivered with the
  film it has; **no night re-renders it on its own** (next.py only makes the next episode). Say in report.md that once
  the drawings are saved, the user asks a session for the re-render.

### 6. Voice, timeline and the episode data (the kit-lesson template)
Build the film as data for `kit-lesson` exactly as `kit-lesson/README.md` says (it is the authority; this is the
order of work and the rules it leaves to you). The episode folder is `EP` = `episodes/<ep>` and the page is
`kit-lesson/lesson.html?ep=<ep>`; no new JavaScript unless a panel type is truly missing.
- `EP/episode.json`: `id`, `lecture`, `facts: "FACTS.md"`, `title`, `langs: ["en"]`,
  `voice: {lines: "vo_lines.json", clips: "clips.json", clipDir: "~/picasso-work/clips/<ep>", rate: "+4%",
  slotPad: 0.4}`, `sound: {dir: "~/picasso-assets/snd"}`, `assets` (`artDir: "/edu/art/cut"` where `art.py pack`
  writes; `slideDir: "slides"`; `drawings`, `slides`, `stamps`), and the `panels` (panel 0 is the cover; one idea per
  panel; the `slide` panel kind for a taped slide; item types `draw`, `label`, `sans`, `underline`, `ringChar`, `pen`,
  `box`, `arrow`, `ring`, `tick`, `card`, `wash`, `tape`, `printout`, `clipping`, `cover`, `stampGrid`, `group`).
  Times are expressions (`"p3+0.4"`, `"n2@tokens"`, `"c3@50%"`, `"n2.end"`), not bare seconds; points are panel px,
  `[ref, u, v]` on a drawing or slide, or `["sl:px", x, y]` on a slide's pixels (word boxes from step 1).
- `EP/strings.json`: `{"en": {...}}` with `mic` ("Prof. Ding · lecture N"), `end` (3 lines: credit, motto, lab),
  `fine`, every label, and `cap` (one caption per voice id: the narration text and her clip `text` exactly, `|` between
  parts, `/` for a row break, at most 2 rows). Every word on screen comes from here and from FACTS.md. (Series "qc":
  its `mic`, `end`, `strip` and the series tag are in "The quantum series (QC)".)
- Narration (a disclosed synthetic voice): `~/miniforge3/bin/python3 tools/tts.py EP/vo_lines.json WORK/tts --lang en
  --rate +4%` (word marks; needs the network).
- `EP/timeline.json` (`fps` 30, `dur`, `cue`, `vo`, `sfx`, `music`): the kit has **no planner** yet (if
  its README now names one, use it instead of the script below), so compute it
  with a small script in `WORK` (keep it; it is reused when you refit) from the TTS durations and clip lengths, with
  the rules measured on L01-01:
  - voice slots in script order: each slot = its take's length + 0.4 s, plus a 0.5-1.5 s breath where a beat turns
    and 0.6-1.2 s after each clip; `vo: [{id, t}]` with `n*` narration and `c*` her clips;
  - `pK` (camera arrives on panel K) 0.5-0.8 s before the panel's first line, or in the gap after a clip; `title`
    (the cover's underline) inside the first line; `endCard` 0.5 s after the last line ends; `dur` = `endCard` + 4 s;
  - sound by rule (files under `sound.dir`, all CC0): `rpg/Audio/bookFlip2.ogg` g .22 at every `pK`+0.2;
    `rpg/Audio/cloth3.ogg` g .35 at every tape landing; `imp/Audio/impactPlank_medium_002.ogg` g .25-.3 on the 2-4
    strongest emphasis cues only; `rpg/Audio/bookPlace1.ogg` g .3 at `endCard`;
  - music: `{"f": "music/Investigations.mp3", "start": 0, "from": 0, "gain": 0.26, "duck": 0.4, "loop": [22.19,
    32.3], "xfade": 2.0, "fadeOut": [dur - 2.5, dur]}`.
  Then fit and check: `LANGS=en ~/miniforge3/bin/python3 kit-lesson/mix.py vo <ep> WORK/tts` (writes `EP/vo_en.json`).
  It fails, and writes nothing, when one of her clips runs into the next voice slot or a line would need more than
  1.2x speed: lengthen that slot in the timeline and run it again. Rerun it after **every** timeline change (the page
  stops on a stale `vo_en.json`).
- Lint until it has no errors: `~/miniforge3/bin/python3 kit-lesson/lint.py <ep> --post DELIVER/x_post.md`
  (`--checks` if `check.json` is not in the clip folder). It checks: every number in strings, narration and post
  (digits **and number words**: "thirteen", "forty-four") against FACTS.md; every caption against the narration
  line or her checked clip text, letter for letter; every clip used is `exact`/`near` in check.json and has its wav;
  no bare-number times; every item starts inside its panel's camera time; drawing **ink** (not the sprite box) inside
  x 15-1065, y 340-1530 (L01-01's own extents: fill the frame); labels between y 260 and 1480; runtime 4-10 min;
  at most 160 narration words per minute; a fresh `vo_en.json`. Its warnings (text in the right rail x 880-1080 /
  y 700-1480, text in the caption band below y 1280, panel-0 items with `at`, a hook that ends after 5.5 s, long
  caption parts) are judgement calls: fix them unless the panel needs it, and say which you kept. Panel 0 is the
  cover: give its items no `at` (except the title underline), so frame 0 is the finished thumbnail; the first
  narration starts by 1.0 s and poses the hook within 5 s. Add any check it lacks to a `WORK/lint_extra.py`
  (returns (value, error)) rather than editing the kit.
- **Fallback** if `kit-lesson` cannot render the episode tonight: copy `episodes/l01-5min/film/` (film.html,
  film.js, strings.js) into `EP/film/` and adapt it the way L01-01 was made (mixer: `episodes/l01-1-scale/film/mix.py`
  with `TL=... VODIR=... CLIPDIR=... SND=...`); say so in report.md.

### 7. Previews (phone size)
- Contact sheet: `~/miniforge3/bin/python3 kit-lesson/contact.py <ep> --t <16-20 seconds: the hook at 0-5 s, every
  panel settled, each clip, the end card> --out WORK/preview` -> `WORK/preview/sheet.jpg`. Safe zones: the same
  frames with guides, `tools/snap.py kit-lesson/lesson.html <frames> --q ep=<ep> --q guides=1 --out WORK/guides`, then
  `tools/sheet.py WORK/guides.jpg WORK/guides/*.png --h 640`. Look at both at phone size.
- Check every frame: the subject fills 60-90 % of the width; no text in the keep-clear zones (y 0-260, y 1480-1920;
  the right rail x 880-1080 for y 700-1480 as far as the panel allows; drawings may run into the rail, as L01-01's
  do; title band y 260-560; captions clear of the art); captions at most 2 rows; no overlap
  of text and drawings; drawings fully drawn when held; no cyan placeholder (a missing drawing); slide text readable
  at phone size; the red pen lands on the right words; the mic tag shows on every clip; frame 0 is the finished
  cover; the end card is the real logo.
- Fix and re-snap until the sheet would pass the user's eye ("合格" is judged on these frames, desktop and phone).

### 8. Independent review
- One reviewer subagent that did not write anything: give it the contact sheets (both), SCRIPT.md, vo_lines.json,
  clips.json + check.json, FACTS.md, the strings file and the x_post draft. It reviews **craft** (the rules below),
  **facts** (every claim on screen, in the voice and in the post traced to a FACTS row and its safe wording; her
  quotes exact) and **clarity** (could a smart first-year follow it; is every term defined before it is used; is the
  hook paid off). It writes `EP/drafts/review.md`: must-fix and should-fix, numbered.
- Fix every must-fix and the should-fixes that time allows; re-run `kit-lesson/lint.py` and re-snap the affected frames.

### 9. The film, the cover and the post (start by D - 1:15)
- Mix: `LANGS=en ~/miniforge3/bin/python3 kit-lesson/mix.py mix <ep> WORK/tts WORK/audio` -> `WORK/audio/mix_en.wav`
  (-14 LUFS; about 80 s for 4.5 min).
- Render, detached (about 13 min for 4.5 min of film with 4 workers at full speed, roughly double with low power
  mode; `--q strict=1` so a missing drawing fails instead of showing a placeholder): `nohup bash -c
  '~/miniforge3/bin/python3 tools/film.py kit-lesson/lesson.html --q ep=<ep> --q strict=1 --frames <dur*30> --out
  WORK/frames_en --workers 4 --audio WORK/audio/mix_en.wav --mp4 DELIVER/<id>_<slug>_en.mp4 > WORK/logs/render.log
  2>&1; touch WORK/render.done' > /dev/null 2>&1 & echo $! >> WORK/jobs.pid`. film.py keeps frames only while
  `WORK/frames_en/stamp_*.txt` matches the episode files (it deletes stale frames itself when you re-render after a
  fix), and encodes to `WORK/frames_en/encode.part.mp4`, moving it into DELIVER only after its length checks out: an
  mp4 in DELIVER is always a finished one. Re-render the whole film after any change; never splice.
- Check the mp4: `~/miniforge3/bin/python3 daily/next.py verify DELIVER/<file>.mp4 --timeline EP/timeline.json`
  (what run.sh uses to decide "delivered": duration within 1 s, 1080x1920, audio), 30 fps; loudness about -14 LUFS
  (`ffmpeg -i MP4 -af ebur128=framelog=quiet -f null -`); look at 4 frames pulled from the mp4 itself.
- Cover: frame 0 -> `DELIVER/cover_en.jpg` (1080x1920; `tools/snap.py kit-lesson/lesson.html 0 --q ep=<ep> --fmt jpg
  --out WORK/cover`, as in the kit README). Contact sheet (the step-7 sheet of the final film) -> `DELIVER/contact_en.jpg`.
- `DELIVER/x_post.md` (series "qc": its own wording, in "The quantum series (QC)"), the shape of L01-01's: a main
  post under 280 characters (the hook, then "Lecture N of Prof. Yufei Ding's CSE 291P (LLM System Optimization) at
  UC San Diego, in M minutes, with her own voice and her slides");
  a thread of 4-7 replies, every number from FACTS.md; a credits reply (Prof. Yufei Ding, CSE 291P Lecture N; the
  sources by short citation; the music: "Investigations" by Kevin MacLeod (incompetech.com), licensed under CC BY
  4.0; "The narration is a synthetic voice. The clips of Prof. Ding are from her lecture recording."); notes: tag
  Prof. Ding only if she wants to be tagged, and pin a reply "Which lecture should we animate next?".
- Delete `WORK/frames_en` once the mp4 checks out (keep the mp4 and the audio).

### 10. report.md (`DELIVER/report.md`, in Chinese, short)
What was made (the files, runtime, word count, panels, clips with their check verdicts, new drawings), the time each
phase took, what was **not** checked (clips heard by two recognizers, not by ear; anything from a secondary source;
any reviewer item left open), every fallback taken (art, kit, shorter cut) and why, open questions for the user
(numbered), how to resume this session (its id is in the run log), and "Google Sites: nothing to re-paste".

### 11. Mark it delivered
`~/miniforge3/bin/python3 daily/next.py mark <id> delivered --mp4 DELIVER/<file>.mp4 --morning <morning>`.

### 12. Notification
`bash daily/notify.sh "<id> 已做好：<title>，<m:ss>，<n> 段原声。<fallback note if any> 文件在 <DELIVER>"`.

### 13. Git
Commit the episode's sources only, on the current branch, merged into main with --no-ff, both pushed:
`bash daily/ship_git.sh "<id> <title>: facts, script, clips list, drawings, film data" .claude/films/edu/episodes/<ep>
.claude/films/edu/art/src/<each new or library drawing in EP/art.json>.png .claude/films/edu/daily/state.json` (plus any tool or kit change
you had to make; `EP/slides/` stays out through the .gitignore). It refuses course files, slide images and crops,
media, git-ignored files and guandan-kit, and merges in a temporary worktree (no branch is checked out); if it fails, say so in
report.md and leave the commit for the morning. The commit message names no AI model or assistant and has no
co-author line.

### 14. Finish
End with one line: the delivered mp4 path, its runtime, and the fallbacks taken (or the reason nothing was
delivered).

## Craft rules (the user's; each was enforced on an earlier cut)
- The line look: warm paper (250,246,237), black ink drawings that draw themselves, the red pen (212,56,40) for every
  correction and emphasis, watercolour washes multiplied under the ink for colour (the course accent is blue), her
  slides as taped printouts the red pen corrects.
- Fill the frame: the subject takes 60-90 % of the width. One idea per panel. Smooth eased motion and springs; no
  jitter or boil on drawings; a held panel stays alive with the slow push-in. Overlapping groups fade as one layer.
- 2D first; 3D only as an accent. No corner mascot: a character appears only when it acts.
- If something looks rough, generic or "AI-ish", rethink the panel rather than tweak it. A drawing must not read as a
  diagram or a tracing.
- Real CC0 or recorded sounds, a looped music bed ducked under the voice, -14 LUFS.
- The gag must be the explanation; no jokes about any real person.
- Every frame is a pure function of t; frame 0 is the finished cover; the film ends on the 1-2 s logo card and loops.

## If things go wrong
- Behind schedule at D - 1:15: stop polishing and render what builds. A complete shorter film (still at least 4 min)
  beats an unfinished long one; drop whole panels rather than leave broken ones.
- No network: the TTS and the web checks need it. Wait and retry for up to 20 min; if it stays down, deliver the
  script, FACTS.md and report.md without a film and notify.
- A tool fails: read its error, fix the cause (a missing file, a bad path), retry once; if it still fails, take the
  fallback, write it down, and move on. Never fake a check.
- Whatever happens, before D - 0:15: report.md in DELIVER, the state marked (`next.py mark <id> failed --note ...`
  when there is no mp4; run.sh may mark the same night again, and next.py counts it as one failure), a notification
  sent.

## The quantum series (QC)
When the work order's `series` is "qc", the film explains a part of Prof. Yufei Ding's **CSE 291P: Quantum Computing
Systems** (UC San Diego; her 2025 lectures first, merged with her 2024 ones; 45 parts in `daily/syllabus-qc.json`,
readable in `SYLLABUS-QC.md`). Everything above holds (the night's rules, the time plan, steps 2-14, the craft rules);
this section replaces what is LLM-specific.

**Sources** (`course-qc/`, git-ignored like `course/`: never commit anything from it or cut from it; there is no fetch
or transcribe step, everything is already there, made by `tools/qc_slides.py`):
- Lecture ids `QYY-NN` = her 20YY lecture NN (`Q25-04` = 2025 lecture 4). Recordings with machine transcripts
  (`QYY-NN.mp4`, `.transcript.md`, `.words.json`, the formats of `course/`): 2025 lectures 1-11, 2024 lectures 4, 5, 8,
  9, 11, 13. 2024 lectures 1-3 are decks only: tape and narrate them, no clips.
- Slides: `p8` = page 8 of the lecture's deck `QYY-NN.pdf` (decks exist only for 2025 L1-L4 and 2024 L1-L3, L9);
  `s12` = `QYY-NN.slides/s012.png`, a slide cut from the recording (the shared screen; a lecture without a deck has
  only these); `QYY-NN.slides/pNN.png` = deck pages at 1280 px; `QYY-NN.notes.pdf` = her typed notes (2024 L3, L4, L5,
  L8, L13; 2025 L5), cleaner on screen than her handwriting where they match. `QYY-NN.sheet.png` shows the whole
  lecture at a glance; `QYY-NN.slides.json` says when each slide was on screen.
- The work order resolves all this: `recording.sources` (every lecture and mm:ss window the part uses; `windows` and
  `span` are the primary lecture's), `recording.slide_files` and `extra_slides[].slide_files` (each slide's PNG, its
  deck page, when it was on screen). When a cut frame names a `deck` page, tape that clean page (`pdftoppm -r 150 -f N
  -l N -png course-qc/<pdf>`). Otherwise look at the cut frame at full size before taping it: no face, camera tile,
  participant name, cursor, app bar or non-English text (crop it out or skip the slide). Q25-11 frames carry an older
  institution's footer: crop it or tape the matching Q24-11 frame; Q25-08 frames came from an iPad: check each.
- `syllabus_entry` also holds `clip_candidates`, `merge_2024` (what 2024 adds), `avoid` (read it before writing
  anything) and `facts_to_check`. The plan's numbers are notes; FACTS.md decides. Hardware numbers (qubit counts, error
  rates, roadmaps) move fast: check each as of tonight and write "as of <month year>"; roadmaps are plans.

**Her voice, and everyone else in the recordings**
- Her clips and slides are approved for this course too (the owner confirmed, 2026-10-14). Quote her word for word,
  never put words or jokes in her mouth, never draw her or anyone real.
- Clips are checked exactly as in the LLM series (step 3: `daily/clips.py words|cut|check` find `course-qc/` from the
  `QYY-NN` id; only `exact` or `near` are used; `asr-agree` ones go under "listen to these first" in report.md for the
  owner's ear). Start from `clip_candidates` (machine-transcript windows: find the words again with `clips.py words`).
  The transcripts mishear quantum terms (ket, qubit, Hadamard, Pauli, CNOT, Toffoli): never quote a transcript.
- Her own lectures only: never a guest lecture (2024 L6, L7, L10, L12; 2025 L12) or a student presentation, and never
  a student's voice, question, name or face (the recordings have them): a clip is her answer alone, cut to stand alone.

**Content rules (binding, on top of the night's rules)**: no China, Chinese, Chinese characters, flags, maps,
countries or political words anywhere; no national "quantum race" framing (no race, who is ahead, governments,
funding calls, defence, export rules, war or the Moon); companies only by the technology they build, never by country;
encryption at most as "much of today's encryption" (no security or spy angle); English only. SYLLABUS-QC.md "Left out"
lists the moments of the lectures that are never used, and the slide errata to fix (never caption).

**Title, cover and end card** (kit-lesson, step 6)
- `episode.json`: `id` the folder name (`qc01-01`), `title` "QC01-01 From Two Qubits to a Thousand", `lecture` the
  primary lecture (`Q25-01`), and the series tag `"tag": {"text": "tag"}`: the kit letters it on the cover in small red
  capitals in a red-pen box at the top left of the title band (x 78, y 290). `lint.py` fails a quantum episode without
  it. The line look and palette stay (blue accent wash, red pen): the tag is the one visual difference.
- `strings.json`: `tag` "QUANTUM · PART N" (N = the work order's `seq`); `title` as on the LLM covers (title.0 big ink,
  title.1 red) but under the tag: title.0 at y ≈ 386 (its letters below y 312), title.1 ≈ 478, then `strip` "CSE 291P
  Quantum Computing Systems · Prof. Yufei Ding · UC San Diego" at y ≈ 548 (sans, `px` 28, `fit` 920); `mic` "Prof.
  Ding · 2025 lecture 4" (`mic_cN` "Prof. Ding · 2024 lecture 8" for a clip from another lecture); `end` ["After Prof.
  Yufei Ding's CSE 291P Quantum Computing Systems", the motto, "UC San Diego · Picasso Lab"]; `fine` the sources, the
  lectures used ("2025 Lecture 4; 2024 Lecture 8") and "The narration is a synthetic voice."
- Slide lettering names the year: "her slide, 2025 lecture 4", "her notes, 2024" (slide numbers differ between decks
  and cut frames: never a bare number).

**x_post.md** (the structure of step 9)
- Main post under 280 characters: the hook, then "From Prof. Yufei Ding's CSE 291P: Quantum Computing Systems at UC San
  Diego (2025 Lecture N), in M minutes, with her own voice and her slides".
- A thread of 4-7 replies, every number from FACTS.md.
- A credits reply: "Prof. Yufei Ding, CSE 291P: Quantum Computing Systems, UC San Diego, 2025 Lecture N" (and "2024
  Lecture M" when used); the sources by short citation; the music: "Investigations" by Kevin MacLeod
  (incompetech.com), licensed under CC BY 4.0; "The narration is a synthetic voice. The clips of Prof. Ding are from
  her lecture recordings."
- Notes: tag Prof. Ding only if she wants to be tagged; pin a reply "Which quantum computing idea should we animate
  next?".
