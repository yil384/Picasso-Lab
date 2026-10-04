---
name: picasso-edu-series
description: The @PicassoLabUCSD knowledge channel - vertical 9:16 explainers, English cut on X and Chinese cut on Douyin. Main line "Compute Not Included / 算力另计" (code-rendered desk-miniature explainers of Prof. Ding's CSE 291P LLM-systems course and the lab's quantum work, three.js + q5.js frame by frame); side line "Not on the Exam / 这题不考" (iPhone vlog "tutorials" with a code-assisted edit). Use for planning or making any episode, its script, facts, style frames, captions or post, a side-line shoot, the course materials, or to resume this work in a new session.
---

# The explainer channel (main line + side line)

Everything lives in `.claude/films/edu/`. Read its `README.md`, then `SERIES.md` (the bible, Chinese; section 13 lists
the decisions still open), then the episode folder you are working on.

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

## State (2026-10-04)
Done: research (7 reports), the bible draft, the pilot (E01, MoE) fact brief, three competing scripts, two judges and
the merged SCRIPT.md (129.5 s), side-line shooting cards, and round-1 style frames of the pilot (`look/e01.html`:
F1, F3, F5a, F5b, F8 in EN and ZH; earlier look-dev in `look/look.html`). The plan page for the user is a private
artifact (https://claude.ai/artifact/TvddvFnpm5aKKNvoWf1ctu).
Waiting on the user: series names, voice (who records EN / ZH; Chinese VO or English VO with Chinese subtitles for
Douyin), pilot choice, Douyin account holder, Prof. Ding's line, Zhongkai's trace data and consent, music.
Next: the user's notes on round 1; round-2 frames (F2, F4, F6, F7); new art (cat_stamp, a cat paw) via Codex; the
lab's DeepSeek-R1 routing trace for B3/B9/B11; then the edu-kit timeline per `research/pipeline.md`.
