# kit-lesson: lesson films from data

A lesson film in the approved L01 "Background" line look (`episodes/l01-5min`) with no new JavaScript. An episode
folder holds data only: `episode.json` (what is on the sheet and when), `strings.json` (every word), `timeline.json`
(the one clock for picture, voice and sound) and `vo_<lang>.json` (where each voice line landed). The kit draws it:
one long sheet of warm paper, panels stacked down it, one smooth camera, ink drawings that draw themselves, the red
pen, watercolour washes, her slides taped on as printouts, her clips with a mic tag, captions, and the logo end card
that lifts back onto the cover so the video loops.

| File | What it is |
| --- | --- |
| `lesson.html` | The page: `lesson.html?ep=<episode>&lang=en`. Served by `tools/snap.py` (it maps `/pv`, `/scene`, `/edu`). |
| `lesson.js` | Loads the episode, checks it, runs the fixed parts: camera, mic tag, captions, end card, loop, guides. |
| `items.js` | The interpreter: item types, panel kinds, points, time expressions, load checks. |
| `ink.js` | Drawing primitives, a clean copy of `episodes/l01-5min/film/film.js` (itself from `hot-strata/line_full`). |
| `mix.py` | Voice fitting and the sound mix, a clean copy of `episodes/l01-1-scale/film/mix.py`, reading the episode. |
| `contact.py` | Contact sheets at chosen seconds; with `--ref`, a pixel comparison against another scene. |
| `lint.py` | Offline checks before a render: numbers (digits and words) against FACTS.md, captions = narration / her checked clip text, clip verdicts, ink and text zones, times inside their panel, bare-number times, length, pace, a stale `vo_<lang>.json`. Calibrated on L01-01 (see its doc). |

`episodes/l01-01/` is L01 "Background" written as data. It renders the same pixels as `l01-5min/film/film.html`
(see "Proof" below).

## Commands
Run from `.claude/films/edu`. Use the Python that has Playwright, numpy and Pillow:
`PY=~/miniforge3/bin/python3`. The tools' `#!/usr/bin/python3` shebang and the `python3` on PATH lack Playwright.
`EP` is the episode's folder name under `episodes/` (`ep=episodes/<name>` or `ep=/edu/...` also work; `snap.py` and
`film.py` turn the `/` into `-` in frame file names).

```sh
PY=~/miniforge3/bin/python3; EP=l01-01
N=$($PY -c "import json;t=json.load(open('episodes/$EP/timeline.json'));print(round(t['dur']*t['fps']))")   # frame count

# frames (PNG): frame = seconds x 30. Add --q guides=1 for the safe zones, --q cap=0 without captions, --q lang=zh
$PY tools/snap.py kit-lesson/lesson.html 0 1005 2205 3600 --q ep=$EP --out ~/picasso-work/$EP/frames

# contact sheet at chosen seconds (DIR/sheet.jpg); with --ref, beside another scene, with diffs and report.json
$PY kit-lesson/contact.py $EP --t 0 30 60 90 120 150 180 210 --out ~/picasso-work/$EP/sheet
$PY kit-lesson/contact.py l01-01 --ref episodes/l01-5min/film/film.html --t 0 33.5 73.5 120 --every 0.5 --out DIR

# voice: scratch narration with word marks, fitted into the timeline's slots (writes episodes/$EP/vo_en.json)
$PY tools/tts.py episodes/$EP/vo_lines.json ~/picasso-work/$EP/tts --lang en --rate +4%
LANGS=en $PY kit-lesson/mix.py vo  $EP ~/picasso-work/$EP/tts
# mix: voice + her clips + sound effects + music bed, -14 LUFS (writes OUT/mix_en.wav)
LANGS=en $PY kit-lesson/mix.py mix $EP ~/picasso-work/$EP/tts ~/picasso-work/$EP/audio

# offline checks (exit 1 on an error; warnings are judgement calls)
$PY kit-lesson/lint.py $EP --post DIR/x_post.md

# full render (parallel workers, JPEG frames, resumable while the episode files are unchanged: stale frames are
# deleted) + H.264/AAC mp4 (encoded next to the frames, moved to --mp4 only when its length checks out)
$PY tools/film.py kit-lesson/lesson.html --frames $N --q ep=$EP --out ~/picasso-work/$EP/full \
    --audio ~/picasso-work/$EP/audio/mix_en.wav --mp4 ~/picasso-work/$EP/${EP}_en.mp4

# cover = frame 0 (the cover panel complete, no caption yet)
$PY tools/snap.py kit-lesson/lesson.html 0 --q ep=$EP --fmt jpg --out ~/picasso-work/$EP/cover \
    && mv ~/picasso-work/$EP/cover/f00000_ep$EP.jpg ~/picasso-work/$EP/cover_en.jpg
```

Speed on this M1: page boot about 1 s; a frame 0.02-0.5 s, PNG encoding included; the 7950-frame L01-01 renders with 4 workers
in 267 s and the slow-preset encode takes about 11 min more (16 min in all, measured on 2026-10-06).
`mix.py mix` takes about 80 s for 265 s. The browser logs one harmless `404` per page load (the favicon).

Checks happen when the page loads: an unknown item type, a missing field, a string key that does not exist, a time
that does not resolve, an unknown drawing, slide, stamp, wash colour, colour or font, and a voice id without a
caption all stop the page; so do a missing or stale `vo_<lang>.json` (a voice start that differs from
`timeline.json`: rerun `mix.py vo`), her clips without the mic drawing, and a panel that arrives before the previous
one's pan is over. `mix.py vo` itself stops when one of her clips runs into the next voice or a line needs more than
1.2x. `snap.py` then exits with `scene error:` and the list (up to 40 problems, each with its
panel and item index). A drawing missing from `artDir` is drawn as a cyan placeholder and logged; with
`--q strict=1` it stops the page. `window.__lesson.time("n3b@thirteen")` resolves a time expression in a
loaded page.

## Episode folder
```
episodes/<ep>/
  episode.json      what is drawn, where and when (below)
  strings.json      every word, per language (below)
  timeline.json     cues, voice slots, sound effects, music (below)
  vo_en.json        written by mix.py vo (the captions and @word times read it)
  art/src, art/cut  the episode's drawings, if it keeps its own (set assets.artDir); course slides go in a
  slides/           git-ignored folder (add a .gitignore with "slides/"): course material is never committed
```

## episode.json
Any value anywhere may be per language, `{"en": a, "zh": b}` (the film's language, `en` when one is missing). Keys
starting with `_` and `note` fields are comments.

### Top level
| Field | Read by | Meaning |
| --- | --- | --- |
| `id`, `lecture`, `facts` | the pipeline | Episode id, lecture (`"L02"`), path to the FACTS.md that clears every word. |
| `title` | lesson.js | Page and scene title. |
| `langs` | mix.py | Languages to fit and mix (default `["en"]`; `LANGS=en,zh` overrides). |
| `voice.clipDir` | mix.py | Folder of her clips, `<ID>.wav` for voice id `c<n>` (`~` allowed; `CLIPDIR` overrides). |
| `voice.lines`, `voice.clips`, `voice.rate`, `voice.slotPad` | the pipeline | The narration table for `tools/tts.py`, the clip table, the TTS rate, seconds added to each voice slot. |
| `sound.dir` | mix.py | Root of sound and music files in `timeline.json` (`SND` overrides). |
| `strings`, `timeline` | lesson.js, mix.py | File names if not `strings.json` / `timeline.json` (`strings` may be an ES module `.js` exporting `STR`). |
| `vo` | lesson.js | `{"en": "path"}` if not `vo_<lang>.json`. |
| `assets` | lesson.js | Drawings, stamps and slides (below). |
| `mic.drawing` | lesson.js | Drawing key used in the mic tag while a clip plays (default `"mic"`). |
| `end.at` | lesson.js | When the end card lifts in (time expression, default the cue `endCard`). The film ends at `timeline.dur`. |
| `camera` | lesson.js | `{gap: 2000, pan: 1.0, dip: .86, push: 1.035, drift: 6}`: panel spacing (px), pan duration (s), zoom at mid-pan, zoom reached by the end of a held panel, how far (px) the camera drifts down while held. |
| `panels` | lesson.js | The panels, top to bottom (below). Panel 0 is the cover. |

### assets
| Field | Meaning |
| --- | --- |
| `artDir` | Folder of packed drawings (`<src>.png`, R ink, G paper fill, B pen time). Default `art/cut` in the episode; `/edu/art/cut` is where `episodes/hot-strata/bakeoff/line/ink.py` writes. |
| `slideDir` | Folder of slide PNGs (default `slides`). Relative paths are relative to the episode folder. |
| `drawings.<key>` | `{src, w, boost}`: file name without `.png`, the width (px) the sprite is built at (draw it near that width; default the file's own), ink boost (default .2). |
| `stamps.<key>` | `{from, crop: [x, y, w, h], size: [w, h], boost}`: a finished crop of a drawing file (`from` = file name, crop in its pixels) scaled to `size`, for `stampGrid`. |
| `slides.<key>` | `{src}`: a PNG in `slideDir`. Make them with `pdftoppm -r 150 -f N -l N -png course/LNN.pdf` (1650 x 1275 px). |

### Panels
| Field | Meaning |
| --- | --- |
| `id` | Name used in error messages. |
| `arrive` | When the camera arrives (time expression; default the cue `p<index>`). The pan starts here and lasts `camera.pan`. |
| `kind` | A panel kind (macro) whose items go first (see "Panel kinds"). |
| `camera` | Extra camera keys `[{at, xy: [x, y], z}]` in panel px (the frame centre and zoom), merged in time order with the pan and push-in. |
| `items` | Items, drawn in order (later ones on top). |

Each panel is a 1080 x 1920 frame, the panels `camera.gap` px apart. Safe zones: keep content in y 300-1280 (the
caption box sits about y 1300-1440), the title in y 260-560, and clear of x 880-1080 for y 700-1480 (the button
rail). `--q guides=1` draws them.

### Points
- `[x, y]`: panel px.
- `[ref, u, v, dx, dy]`: `u, v` (0..1) on an item registered earlier in the panel with `id`; dx, dy optional, in px.
  A `draw` registers its box, a `printout` or `clipping` the slide area of its crop, a `cover` its sheet (centre
  .5, .5), a `label` its first row's text box.
- `["<ref>:px", x, y, dx, dy]`: pixel `x, y` of a printout's source image (read the slide PNG in any viewer).
- `{"on": <point>, "x": X, "y": Y, "dx": .., "dy": ..}`: `x` or `y` replaces that coordinate (e.g. under a drawing at a
  fixed height).

A point on a ref that is not on the sheet yet (a printout before its `at`) skips the item for that frame.

### Times
`at`, `out`, `until`, the camera's `at`, `tape.at`, `tapes[].at`, and the two ends of `fadeIn` / `fadeOut` are time
expressions:

| Form | Value |
| --- | --- |
| `12.5` | Seconds. Allowed, but prefer a name: names follow the voice when it is refitted. |
| `"cue"`, `"cue+0.4-0.1"` | A cue in `timeline.json`, plus or minus any number of offsets. |
| `"n3"` | A voice id: the start of its slot. |
| `"n3.end"` | The end of the line as fitted (`t + dur` in `vo_<lang>.json`). |
| `"n3@thirteen"`, `"n3@thirteen#2-0.1"` | The start of that word's mark (n-th time it occurs in the line). Write the word with letters and digits only, any case: `GPT-3` is `gpt3`, `isn't` is `isnt`, the merged mark `2017 to 2020` is `2017to2020`. |
| `"c3@50%"` | That far through a line or clip. |

Word times are per language: an `@word` that only exists in the English marks will stop the Chinese cut. Use cues
for anything both languages share.

### Item types
Common fields: `t` (type), `id` (register a ref for later items in the panel), `at` (start; no `at` = already
complete, as on the cover), `dur` (how long the drawing-on takes) or `until` (a time, instead of `dur`), `out` (fade
out over .4 s from this time, where supported). Colours are `ink`, `red`, `pencil`, `paper`, `sheet`, `white` or
`[r, g, b]`. Fonts are `hand` (Caveat; ZCOOL KuaiLe in Chinese), `latin` (Caveat in every language), `sans` (Inter).

| `t` | Fields (default) | Draws |
| --- | --- | --- |
| `draw` | `d` drawing key, `xy`, `w`, `at`, `dur` (2.6), `rot`, `alpha` | A packed ink drawing that draws itself. Ref: its box. |
| `label` | `text` string key, `xy`, `px`, `color` (ink), `font` (hand), `align` center/left/right, `rot`, `patch` (paper behind the letters, in em), `fit` (max width px), `alpha`, `at`, `dur` (by length), `out`, `rows: {dy, dt}` (px*1.1, .4) | Hand lettering written left to right. A string array is written as rows, each `dy` lower and `dt` later. Ref: the first row's text box. |
| `sans` | `text`, `xy`, `px`, `color`, `a` (1), `align`, `fit`, `at`, `dur` (.5) | Small print fading in to alpha `a`. |
| `underline` | `of` label id, `dx`, `dy`, `rise`, `bend` (.03), `extend`, `lw` (7), `color` (red), `at`, `dur` (.6) | A pen line under a label, as long as its text, from the label's left edge + dx, its centre + dy. |
| `ringChar` | `of` label id, `char`, `dy`, `rx` (.42), `ry` (.5) in em, `seed`, `turns`, `lw` (6), `at`, `dur` (.4) | A pen ring around one character of a label. |
| `pen` | `pts` [points] or `curve` [from, to, bend], `lw` (7), `color` (red), `alpha`, `dash`, `at`, `dur` (.5) | A pen stroke. |
| `box` | `rect` [x0, y0, x1, y1], `on` (a ref, e.g. `"sl:px"`, maps the corners), `lw` (7), `at`, `dur` (.9) | A pen rectangle. |
| `arrow` | `from`, `to`, `bend` (.2), `lw` (6), `head`, `color`, `at`, `dur` (.4) | A curved arrow. |
| `ring` | `xy`, `r` [rx, ry], `seed`, `turns` (1.12), `lw` (6), `at`, `dur` (.5) | A pen ring. |
| `tick` | `xy`, `s` size, `lw` (6), `at`, `dur` (.25) | A tick mark. |
| `card` | `rect`, `seed`, `r` (14), `lw` (3), `fill`, `ink`, `alpha`, `at`, `dur` (1) | A hand-drawn note card, paper-filled as the outline goes round. |
| `wash` | `c` coral/cobalt/yellow/sage/ultra/peach, `xy`, `w`, `h`, `a` (.85), `rot` (from x), `at`, `dur` (.9), `out` | Watercolour, multiplied under the ink, blooming open. |
| `tape` | `i` 0-7, `xy`, `w`, `rot`, `at` | A strip of tape slapped on. |
| `printout` | `slide` key, `xy`, `w`, `rot`, `crop` [u0, v0, uw, vh] fractions, `at` | A taped slide dropped on the sheet. Ref: the crop (u, v) and its source pixels (`:px`). |
| `clipping` | `slide`, `crop`, `from` point, `to` [x, y], `w0` (140), `w`, `rot0`, `rot`, `at`, `fly` (.6), `tapes` [{i, dx, dy (in widths from the centre), w, rot, at}], `items` | A cut-out flying from a point on a slide to its place, growing, then taped; its `items` are drawn once it lands. Ref: the cut-out. |
| `cover` | `xy`, `size` [500, 500], `rot` (.025), `fill` (sheet), `at`, `dur` (.4), `tape` {i, dx, dy, w, rot, at} | A blank sheet taped over third-party art on a slide (never reuse it). Ref: the sheet. |
| `stampGrid` | `stamp`, `n`, `cols`, `xy` top-left, `pitch` [dx, dy], `stagger` (odd rows), `w`, `at`, `step` (.025), `jitter` (.25), `pop` (1.5), `spring` [9, 15] | A grid of small stamps springing in one after another. |
| `group` | `items`, `at` (shown after), `xy`, `rot` (moves the items), `fadeIn` / `fadeOut` [t0, t1] | Items faded as one layer, so overlaps never ghost. |

### Panel kinds
`"kind": "slide"` with `"slide": {src, tape, label, xy [540, 860], w (1000), rot (-.015), id ("sl"), labelXY [150, 392],
labelPx (52 / zh 50), tapes [[i, x, y, w, rot, dt], ...]}`: lettering "her slide N" in red at `tape+0.4`, the printout
at `arrive+0.7` (registered as `sl`), and two strips of tape at `tape` and `tape+0.15` (default strips 0 and 5).
`tape` is the time the tape lands (default `arrive+1`).

## strings.json
`{"en": {...}, "zh": {...}}`. Values are strings or arrays of strings, reached as `key` or `key.0`. The kit needs
`mic` (the mic tag, e.g. "Prof. Ding · lecture 2"), `end` (3 lines: credit, motto, lab), `fine` (small print rows
on the end card) and `cap`, one caption per voice id of the timeline: `|` splits a line into parts shown one after
another (timed on the voice's word marks; her clips by letter count), `/` forces a row break, two rows at most. No
word may appear on screen that is not in strings.json, and none that FACTS.md does not clear.

## timeline.json
| Field | Meaning |
| --- | --- |
| `fps`, `dur` | 30; the film's length in seconds (the end card lifts in at `endCard` and the film loops at `dur`). |
| `cue` | Named moments: `p1`..`pN` (the camera arrives on each panel), `title` (the cover's underline), `endCard`, and any names the items use. |
| `vo` | `[{id, t}]` voice slot starts in order: `n*` narration lines, `c*` her clips. A slot runs until the next one. |
| `sfx` | `[{t, f, g}]`: a sound file under `sound.dir` at time t, gain g. Recorded or CC0 only. |
| `music` | `{f, start, from, gain, duck, loop [a, b], loops, xfade, fadeIn, fadeOut [t0, t1]}` (or a list): a looped bed ducked under the voice. |
| `duck` | Optional `[[t0, t1]]` spans where the effects drop to 35%. |

`vo_<lang>.json` (from `mix.py vo`): `{id: {t, dur, tempo, lead, words: [[t, d, word], ...]}}`; clips have no words.

## Fixed by the kit (the same in every episode)
The paper (250, 246, 237) with grain, the ink and red pen colours, the camera (pan with a dip to .86, push-in to 1.035
while held, monotone curve), the mic tag (top right, coral wash, the mic drawing, "mic" text) for every `c*` voice
id while it plays, captions (black border for the narrator, red for her), the end card (the real logo in four
sprung parts, `end` and `fine`), the cover drawn again under the lifting end card so the last frame lands on frame 0,
and the guides. The wash and tape boxes are measured on `art/src/wash_swatches.png` and `art/src/tape_strips.png`;
the logo parts on `art/brand/picasso_logo.png`. A new swatch, tape or logo file needs new boxes in `ink.js` /
`lesson.js`.

## Adding an item type
1. In `items.js`, add `def('name', ['required', 'fields'], (g, t, it, R) => { ... })`. Draw with `ink.js`
   primitives on `g`, in panel px. Times in `it` are already numbers. Resolve points with `pt(it.xy, R)`
   (null = skip this frame), text with `R.text(it.text)`, colours with `color(it.color, RED)`. Return a ref
   (`{at: (u, v) => [x, y]}`) to let later items point at it, or null.
2. Keep it a pure function of `t`: no state carried between frames, no `Math.random` (use `hs(seed)`).
3. If it has nested `items`, call `runItems(g, t, it.items, R)`; the load checks already walk `items`. Add any new
   time-valued field name to `TIME_KEYS` (or `SPAN_KEYS` for `[t0, t1]`) in `compilePanels`, and a reference check
   there if it names an asset.
4. Document it in the table above, use it in an episode, and check frames with `contact.py`.

## Adding a panel kind
A kind is a macro: `PANEL_KINDS.name = (P, k) => [items]`, placed before the panel's own items. Read its
parameters from the panel (`P.slide` for the `slide` kind), return ordinary items with time expressions as strings
(`arrive + '+0.7'`); they are compiled and checked like hand-written ones. Language-dependent defaults use `F.zh`
(per-language objects are already resolved before kinds expand). Document the parameters above.

## Proof: L01-01 against the original film (2026-10-06)
`episodes/l01-01/` points at the existing L01 drawings (`/edu/art/cut`) and slides (`../l01-5min/slides`, git
ignored); nothing from the course was copied. Its `timeline.json` is l01-5min's plus 13 named cues for the seconds
`film.js` wrote as literals; `vo_en.json` / `vo_zh.json` are copies.

`contact.py l01-01 --ref episodes/l01-5min/film/film.html --t 0 33.5 73.5 92.6 120 143.6 186 205.2 229 245 263
--every 0.5` (sheet and report in `~/picasso-work/kit-check/`):
- the 11 sheet frames: identical, every pixel;
- 531 frames, one every 0.5 s over the whole 265 s: 526 identical; frames 1245-1305 (41.5-43.5 s) differ by at most
  1/255 (the two washes in panel 2 start at `bigger+1.4` instead of the literal 41.6, a float rounding); frame 5550
  differs by 5/255 at one pixel of text anti-aliasing. No pixel anywhere differs by more than 8/255;
- the Chinese cut at 7 seconds: identical;
- the full render (`film.py`, 4 workers) against the delivered `l01_background_en.mp4`: same size within 0.02%,
  average PSNR 50 dB, 3931 of 7950 decoded frames identical. The rest differ by encoder noise; the lowest frame
  (38.7 dB, 73 s) also shows the delivered cut's "≈ 0" a pixel or two off, which is the glyph-cache effect below
  (today's film.js and the template render that frame identically);
- `mix.py vo` on a fresh `tools/tts.py` run gives a `vo_en.json` identical to the delivered one; the mix measures
  -14.7 LUFS like the delivered mp4 and correlates 0.999 with its audio.

## Known gaps
- No planner yet: voice slots, `pK` cues, word-anchored cues, sound effects by rule and the music fade are still
  written into `timeline.json` by hand or a one-off script (the survey's `plan.py`).
- `lint.py` estimates text widths (0.5 em a letter) and does not see anchored text (`[ref, u, v]`) or overlaps of
  text and drawings: use `--q guides=1` and look.
- Anchors on drawings (u, v) and slide pixels are still chosen by eye; a labelled grid over each drawing and
  `pdftotext -bbox` word boxes for slides would make them measurable.
- Slide crops for `clipping` are separate PNG files (`p09_panelA.png` is a 400-dpi crop); nothing makes them from
  the PDF yet.
- `ink.py` writes to the shared `/edu/art/cut`, so an episode that keeps its own `art/cut` has to copy the packed files there.
- A frame rendered alone can differ by up to 29/255 on a few anti-aliased text pixels from the same frame rendered
  after others (the browser's glyph cache); the original film does the same. Frames rendered in the same order
  match exactly.
- `lesson.html` only runs behind `tools/snap.py` (or a server with the same `/pv`, `/scene`, `/edu` map).
- Captions, mic tag and end card layouts are fixed; an episode cannot move them.
