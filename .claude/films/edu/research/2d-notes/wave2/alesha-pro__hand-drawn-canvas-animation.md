# alesha-pro/tools — skills/hand-drawn-canvas-animation

- URL: https://github.com/alesha-pro/tools/tree/main/skills/hand-drawn-canvas-animation (repo 671 stars, 76 forks,
  MIT; the repo is mostly ComfyUI/local-inference tools by @superalesha). Skill commits 2026-09-16 .. 09-25 (16
  commits: alesha-pro, plus Mike Shevchenko "workshop" and Anzal Abidi fixes). Forks: anzal1/hand-drawn-film,
  jingol0818/hand-drawn-canvas-animation, alsharmani0/canvas-animation-skills.

## Made with Claude / Opus 5.5? (only the source films are attributed, to Opus 5)
- No Claude co-author trailers in the repo; no model named in the skill. Not verified as Opus 5.5.
- The five looks are measured from Kevin Ngo's films (references/reference-films.md). Their X posts (read via the X
  syndication endpoint): fruit fly 2026-09-15 "Claude Opus 5 drew every frame of this animation using JavaScript.";
  riso flipbook 2026-09-14 same sentence; doodles on photos 2026-09-17 "I asked Claude to search the web, download images
  it liked, and then doodle on them. Every doodle was drawn by Claude Opus 5 using JavaScript." The flipbook sign-off
  reads "opus 5 / claude" per the skill's notes. I did not watch Kevin Ngo's videos themselves.

## Stack / pipeline
- One HTML film loading local `core.js` (palettes, four finishes, marks, camera, timeline, player), `cels.js` (whole
  stroke drawings, exposure sheets, inbetweens, graphite/ink brushes), `studio.js`, `materials.js`; engines `roto.js` +
  `scripts/roto.py` (trace real motion), `sand.js`, `paper3d.js`. Canvas 2D only, Web Audio score, 24 fps default.
- `scripts/render.mjs` (puppeteer-core driving installed Chrome): `--grid N` sheet in seconds, `--strip`, `--only`,
  `--ar`, `--width`, `--look ink|pencil|riso|screen|doodle`; `photo.mjs` cuts a found photo (rembg) into `photos.js`
  with a coordinate check sheet so drawings hang on the object's real points.
- Philosophy (README): "The default for characters is a sequence of whole-pose drawings with visible strokes, authored
  breakdowns and intentional holds"; "Uniform wobble, perpetual boil and a paper overlay cannot supply the drawing."

## What I rendered (frames2/hand-drawn-canvas/)
sketchbook-bird grid (24) + frames 0/62/68 at 1920x1080; becoming-phoenix grid (24 of 1440) + frames
200/438/520/700/960/1150; held-once grid (18) + a `--ar 9:16` test (frames 60, 200). Also read the shipped previews.

## What I saw (candid)
- **Doodles on museum photos (held-once, the phoenix lantern shot): the standout.** Real CC0 Met photos (1755 teapot,
  pocket watch, Stradivari violin, a lantern, a blue-and-white cup) cut out on pastel sheets; brush-pen hedgehogs in red
  scarves, hand-lettered words ("tick ... tick", "soon?", "almost", "for two", "you came"), a violin that becomes a boat
  with a drawn sail, two hedgehogs peeking from the teacup, polaroids pegged on a line at the end. The photo carries
  the real texture; the doodles carry the charm. Line weight has brush taper.
- Pencil bird (sketchbook-bird): a believable sketch with tapered contour and short hatching, but the tail is a fan of
  straight lines converging to a point (string-art artifact), hatching is ruler-parallel, and the whole thing is so
  faint it would vanish on a phone.
- Ink forest (phoenix 200): bold flat dark trunks, wind lines, bird with brushy feathers; decent screen-print feel.
- Riso (phoenix 700): uniform coarse dot fills, blobby bird. Sand (438): grey noise like TV static plus a black blob,
  not sand. Pop-up book (960): flat-shaded cards on a brown table, crude. Phoenix (1150): flat vector feathers, stock.
- `--ar 9:16` just enlarges the canvas: the held-once teapot shot sits in the top third with the bottom two-thirds
  empty pink; the README admits other aspects "still need composition review".

## For our 9:16 explainer with a painted white cat
- Best fit in this cluster: the **doodle-on-photo** look. Real cut-out photos of the actual hardware (a GPU board, an
  HBM stack, a server rack, a keyboard) on pastel paper, the painted cat sprite beside them, brush-pen doodles drawing
  on as the explanation (arrows, tiny workers inside the GPU, a queue of requests as doodled mice). It obeys our "real
  assets over procedural" rule and suits desk-miniature staging and quick comedy.
- Take `photo.mjs` (cutout + coordinate sheet so doodles anchor to real features) and the whole-pose/hold philosophy.
- Avoid: sand, pop-up 3D, riso and the code-drawn phoenix; re-compose every shot for 9:16 rather than using `--ar`.
