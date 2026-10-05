# JohnHeibel/ClaudeAnimationBase

- URL: https://github.com/JohnHeibel/ClaudeAnimationBase
- Stars/forks (gh api, 2026-10-04): 761 stars, 75 forks. Created 2026-09-23. License: MIT.
- Parent film: JohnHeibel/PDoomVideo ("I'm Upping My P(doom)", YouTube https://youtu.be/8j-hR4fJywU , X post https://x.com/slimer48484/status/2097752569212756134 - linked from the PDoomVideo README, not watched here).

## Who/what made it (verified)
- README: "All test videos were generated with Opus 5.5 on xhigh reasoning in Claude Code."
- README: "I've found that the reasoning level corresponds to how "extravagant" and detail-oriented the model makes the scene."
- `gh api repos/JohnHeibel/ClaudeAnimationBase/commits`: 10 of the 11 non-merge commits by John carry
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` (the exception is "Typo fix"); the two PRs from Clement Dumas
  (Butanium) carry the same trailer plus `Claude-Session: https://claude.ai/code/session_0152srkS38mXuCs5dmrwwwCA`.
- The README intro itself was rewritten by the model ("Rewrite the README intro in the author's voice", co-authored).

## Stack
p5.js 2.3 (WEBGL canvas) + p5.brush 2.2 (watercolour/ink brushes), puppeteer-core driving the local Chrome headless,
ffmpeg for MP4. ~1,900 lines total: `src/core.js` (326), `src/clawd.js` (644), `src/timeline.js` (54), `render.mjs` (157),
`ANIMATION_GUIDE.md` (461 lines). No build step. `npm install` = 46 packages, 74 MB, under 1 s.

## Pipeline
- Every frame is a pure function of t: `shots([[t0, fn], ...])`, each `fn(t, lt, dur)` repaints the whole frame. No state,
  no Math.random; `hash(i)` for stable values, `jit()/random()` reseeded 12x/s (`BOIL`) for line boil, and
  `boilSeed(key)` per element so a moving thing does not make still things re-boil.
- Layers: procedural paper texture (radial stains + 1400 fibre strokes) under everything; p5.brush washes/fills/ink on a
  WEBGL canvas; `glow()` is the only additive (non-pigment) mark; lettering on a 2D compositor; static grain + vignette
  multiplied over the top.
- `render.mjs`: `--sheet` (contact sheet at chosen times), `--strip` (every frame of a span), `--crop` and `--crop-at`
  (full-res crop following a WORLD point through the camera), `--stills`, `--clip` (straight to MP4), `--frames
  --workers=N` (parallel, resumable JPEGs) then `--encode` (libx264 crf 17, yuv420p, optional audio mux).
- Measured here (Apple Silicon, Metal ANGLE): 88-245 ms/frame for the demo; a 6-frame contact sheet in 4.6 s wall.
- Canvas is hard-coded 1920x1080 (`const W = 1920, H = 1080`); 9:16 needs W/H swapped and scenes composed for it.

## How Claude is guided
- One prompt: "Read ANIMATION_GUIDE.md, then make a 15-second video of Clawd trying to catch a butterfly."
- ANIMATION_GUIDE.md: three goals (handmade, alive, one piece) and seven rules: solid medium (brush strokes, flat 2D,
  boil; "Never use plain p5 shapes ... they look like 2000s Flash"; "Never project 3D"), no text ("A sign that repeats
  the story is the classic failure"), an event in every shot, timing modelled on the viewer ("Write the reads"; "Fast
  actions, slow meanings"), alive (nothing still, faces act, Clawd big, everything on a beat), transitions at every seam,
  one piece (storyboard first, one world, colour arc, rhyme the ending with the opening).
- A full Disney-principles section rewritten for code ("motion written as code comes out mechanical, because code moves
  every part at once, on the same curve, by the same amount"; "Avoid twinning").
- Workflow: STORYBOARD.md with a per-shot list of "reads" with start-end times (a timing sheet) -> build one shot at a time,
  key poses first as stills -> review loop with sheets/strips/crops that the model opens itself, with a checklist and a
  minimum budget ("at least one sheet per shot, a strip for every key motion and transition, and a crop for every face")
  -> render.
- A "Common failures" list of what makes it look generated, and a worked timing example from the demo ("The first
  version packed all of this into about 1.3 s, and nobody could tell what had happened.").
- `emotions(t, keys)` bakes acting into the API: squint before the change, swap under the squint, a take sized per
  emotion, backOut settle, colour cross-fade, emote pop (checked in src/clawd.js lines 589-616).

## What it looks like (frames viewed)
- `frames/ClaudeAnimationBase/emotions.jpg`, `views.jpg`, `emotions_anim_*.jpg` (from docs/emotions.webp, 192 frames
  at 960x540): a terracotta block mascot on warm cream paper, thick tapered near-black ink outline that wobbles, flat
  wash with visible pigment pooling and darker wet edges, soft lilac contact shadows. 31 expressions are genuinely
  distinct and readable (furious opens the lid into a toothy lunchbox mouth; sad gets a rain cloud and a gloom band).
  Hats/views sheet is clean, model-sheet-like. Labels are a marker font (sheets only).
- `demo_sheet_rendered.jpg` (rendered here, 6 times of the 11 s demo) and `demo_crop_6s.jpg`: night sky in flat indigo
  with watercolour cloud banks whose bleeding edges are visible at full res, simple flat green/teal hills with one ink
  line, a cream moon, tiny four-point stars, the brush-wipe transition as diagonal violet/indigo bands with charcoal
  hatching. At full res the paper grain and pigment texture are convincing; at contact-sheet size the backgrounds read
  as simple and a bit empty, and Clawd is small in the wide shots.

## Quality (candid)
- 6.5/10 for the demo, 7.5/10 for the character kit. The texture system (paper + p5.brush + grain + boil) is the most
  convincing "handmade" code look I have seen without image models. Composition and backgrounds in the demo are plain;
  the charm is almost entirely in Clawd's face acting. It is a starter kit, not a finished film.
- Weak spots: everything is one character; backgrounds are big flat ellipses; no 9:16; p5.brush watercolour fills are
  slow without a GPU; text is banned, which conflicts with an explainer channel that needs some labels/formulas.

## What Picasso Lab should borrow
1. The guide's structure, nearly verbatim, as our 2D medium rules: "reads" timing sheet per shot, "fast actions, slow
   meanings", transitions at every seam, avoid twinning, the "common failures" list.
2. The self-review loop: `--sheet`, `--strip`, `--crop-at` renders the model opens with Read, with a minimum review budget.
   Our three.js pipeline already renders frames; add a strip/crop CLI exactly like this.
3. Frames as pure functions of t + `boilSeed(key)` per element (boil at 12 fps without jitter) + `onTwos(t)`.
4. The material stack: procedural paper under everything, p5.brush wash + tapered ink, grain multiplied over the top,
   `glow()` as the only additive mark. 3D (our three.js) can sit in as a rendered layer under the same grain.
5. Acting baked into the API (`emotions()` with anticipation/take/settle) for any recurring host character (a Picasso
   mascot) instead of hand-keying faces.
6. Keep text out of the film body and put our explainer labels on a separate, deliberate lettering layer (their
   `letter()` on the 2D compositor under the grain) used sparingly.
