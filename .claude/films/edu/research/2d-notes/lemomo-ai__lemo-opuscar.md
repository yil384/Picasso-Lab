# lemomo-ai/lemo-opuscar

- URL: https://github.com/lemomo-ai/lemo-opuscar  (970 stars at 2026-10-04; created 2026-09-26; MIT LICENSE file
  "Copyright (c) 2026 LemoLab", GitHub API reports NOASSERTION because the README adds third-party asset terms)
- 43 styles, each `styles/<slug>/STYLE.md` (style prompt) + `DEMO.md` + `demo/` source; films hosted as GitHub Release
  assets (`web` tag 720p, `films` tag 1080p) and a Pages gallery. Packaged as a Claude Code plugin/skill
  (`claude plugin install lemo-opuscar@lemolab`).

## Made with
- README: "Every frame, every note and every cut was written in code by Claude Opus 5.5." and "Every film here was
  made by me, with Claude Opus 5.5. The styles are tuned for Opus 5.5; other models may not reproduce them."
- Demo CREDITS files: "LemoLab × Claude Opus 5.5" (crayon-book, whiteboard). The halftone-dossier film's end card reads
  "本片由 Claude 用代码一帧一帧画完。" (seen in extracted frame).
- Commit trailers: none - 20 commits (all of the history), authors lemomo-ai / Lemomo, 0 with Co-Authored-By: Claude.
  So the model claim rests on the author's README/credits only (single source, plausible, not independently verifiable).

## How Claude is guided
- `CLAUDE.md` is just `@AGENTS.md`. AGENTS.md: router + workflow: Brief (ask once) -> TREATMENT.md (3 candidate
  structures, choose one, BEFORE opening the demo) -> style frames / model sheet rendered with the real code ->
  optional storyboard sheet -> produce (voice -> ASR check -> score -> animation -> mix -> render) -> self-check.
- `DIRECTOR.md` (craft rules): judged in order sound, rhythm, camera, directing; benchmark works (learn / don't take);
  one subject-goal-turn; hook in 3 s; one "native move" of the medium at the emotional peak; cue map before
  animating; every visible action has a sound; >=2 real silences; J/L-cuts; >=4 camera moves; one signature shot;
  transitions made from the medium; anticipation/action/follow-through; reading-time formulas (Chinese chars/4.5+1.5 s);
  "not the demo again" (4 of 6 aspects must differ); list of most-seen failures.
- `TECHNIQUE.md`: page exposes `window.DUR`, `window.render(t)`, `window.READY`, `window.EV` (sound events),
  `window.TEXTS(t)` (on-screen text boxes for readcheck); deterministic; one world->screen function; animate on twos
  but keep camera smooth; grain added in ffmpeg not in page (speed + compressibility); one `timeline.js` drives
  picture, score, mixer, subtitles, cuecheck (aim 0 ms); Kokoro (EN) / edge-tts (ZH) + faster-whisper ASR check;
  sampled score from CC0 libraries (VSCO2 CE, VCSL, Salamander...) + Karplus-Strong plucks; procedural foley from EV;
  two-pass loudnorm -14 LUFS; review loop = contact sheets every 1-2 s, 0.2 s strips of key actions.
- Each STYLE.md is a ~10 KB style bible: essence & what it is not, materials & rendering recipe, colour logic, type &
  subtitles, motion quality, camera grammar table (move -> meaning -> use), sound palette, native moves menu,
  pitfalls, engine API, variation space with openings/endings far from the demo.

## Stack / pipeline
- Canvas 2D for most styles, three.js r170 + WebGL2 post (DOF, GTAO) for 3D ones; `core/render/still.mjs`,
  `video.mjs` (Playwright headless Chromium, JPEG screenshots, workers), `events.mjs`, `readcheck.mjs`, `mux.sh`.
- All art procedural (CREDITS: "All pictures are drawn by code... No generated images"); paper-popup uses Poly Haven
  CC0 HDRI + wood texture; scores sampled or synthesized; some demos use Kevin MacLeod CC BY tracks.
- Engines worth reading: `styles/whiteboard/demo/engine/wb.js` (stroke-order handwriting from a single-line Hershey
  font, floating pens solved to deadlines, multiply ink, dry texture, sheen, eraser, keyed camera with 1/z zoom
  interpolation and sub-frame motion blur); `crayon-book/demo/crayon.js + gl.js` (crayon pressure layer, paper-grain
  shader decides adhesion, line boil = jitter seed changes every 2 frames); `scifi-toon/demo/toon.js` (own affine
  stack so line width stays constant at any zoom; boil cycling 3 states at 12 fps; flat fill -> clipped hard shadow ->
  stroke); `silent-film/demo/engine/` (image-to-ink redraw + film damage).

## Rendered locally
- I rendered whiteboard t=47.5 s and 88 s with the repo's own `core/render/still.mjs` (needed one gitignored font,
  ArchitectsDaughter, fetched from google/fonts): frames/lemomo-ai__lemo-opuscar/rendered/whiteboard_47.5.jpg -
  identical in look to the released film.

## Look (frames viewed: styles_sheet_a/b.jpg (43 gallery frames), 6-frame sheets from the web mp4s of whiteboard,
## scifi-toon, rubber-hose, crayon-book, midcentury-toon, halftone-dossier, ink-wash, paper-popup, opuscar98)
- Range is genuinely wide and mostly charming. Best 2D work: crayon-book (wax strokes with paper tooth, boiling
  lines, a sleepy moon with a nightcap, ends on a real-looking open picture book on a wood desk with crayons),
  rubber-hose (sepia 1930s, pie-eyed coffee cup with white gloves, film flicker, iris), scifi-toon (Rick-and-Morty-ish
  sitcom: thick boiling outlines, flat fills with hard shadows, character dialogue with speaker-tag subtitles, alt
  dimensions), ink-wash (dry-brush mountains on rice paper, swordsman, a huge ink wave, scroll unrolling), whiteboard
  (clean glossy board, floating markers with soft cast shadows, ghost marks, handwriting subtitles - tasteful but
  sparse), midcentury-toon (50s classroom film, flat textured colours, step cards), halftone-dossier (Chinese
  case-file comedy about an orange cat, halftone dots, stamps, misregistered type).
- Weaker / off-taste for this lab: dark-keynote, hologram-hud, dataviz, iso-infographic, game-show read as
  motion-graphics / product-launch / dashboard. Character drawing is clean vector "competent cartoon" rather than
  hand-made; some characters are generic. OPUSCAR 98 is mostly three.js diorama shots with painterly textures,
  a brick-red block Clawd mascot, letterbox lower-third title bars; impressive breadth, uneven per-shot craft.
- Default 16:9; vertical via `--size 1080x1920` (no vertical demo exists).

## Quality
- 8/10 as a catalogue and method; individual demos range 5-8.

## Borrow
- The STYLE.md template (essence / materials recipe / colour logic / type / motion / camera grammar table / sound
  palette / native moves / pitfalls / variation space) for writing ONE Picasso channel style bible.
- DIRECTOR.md rules verbatim-in-spirit: treatment with 3 structures, benchmark learn/don't-take, one native move at
  the peak, reading-time formula, >=4 camera moves, J/L-cuts, real silences, "not the demo again".
- `window.render(t) / EV / TEXTS(t)` page contract + readcheck (text on screen long enough), cuecheck (visual hits vs
  music beats), ASR check of TTS lines, 0.2 s strips for key actions, grain in ffmpeg.
- Engine tricks: line boil on twos with constant screen-space line width; crayon/paper-grain adhesion shader;
  whiteboard stroke-order writing with deadline-solved pen speed and a 2D camera that zooms in 1/z with sub-frame blur.
- Candidate channel looks to prototype: whiteboard (for course explainers), crayon-book / rubber-hose / scifi-toon
  (for comedy), halftone-dossier (Chinese title-card comedy, good for Douyin). Avoid the keynote/HUD/dataviz family.
