# klsoen/opus-js-animations

- URL: https://github.com/klsoen/opus-js-animations (17 stars on 2026-10-04, created 2026-09-24, 7 commits, no releases)
- License: MIT (LICENSE file, "MIT © klsoen")
- Form: a Claude Code skill + plugin (`/plugin marketplace add klsoen/opus-js-animations`), not a film repo. The finished films
  (Shaml, The Script of Me, a 4-minute 15-agent film, a mosaic, a kite planet) are NOT in the repo; only two short GIF excerpts are.

## Provenance (verified)
- README: "Every frame is Canvas 2D, written by Opus 5.5." and "Claude Opus 5.5 directs and renders films in JavaScript".
- All 7 commits (2026-09-25 .. 2026-10-03) end `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`.
- The 4-minute / 7,200-frame / ~15-agent film is claimed in references/production.md but not published (unverified).

## Stack and pipeline
- One HTML page per film, `window.__film = { duration, ready, seek, shots, marks }`; every frame is `seek(t)` into one canvas.
- Canvas 2D by default; WebGL shaders composited in for skies, light, glow (`shaders.md`), WebGL2 instancing for thousands of tiles/birds/letters
  (`tiles-and-flocks.md`); three.js or raymarching only when 3D is explicitly chosen (`threejs.md`).
- Scripts need Node >= 22 and Chrome only, no npm install: `render.mjs` (parallel headless Chrome workers, frames leave as raw pixels over
  local HTTP, `--ss 2` supersampling with Lanczos downscale, CRF 16 + AAC), `stills.mjs` (sheets, frame strips, 1:1 crops),
  `verify.mjs` (renders each time several times, hashes, proves seek(t) is pure), audio tools (yt-dlp fetch, loudness/onset/tempo/spectrogram
  analysis, Whisper word alignment, ElevenLabs/OpenAI voiceover line by line with timings), `paint.py` for painted stills.
- Delivery notes for social platforms: no animated grain in the upload (claims it cost more than a third of the quality surviving Instagram),
  BT.709 TV-range tags, 2x supersampling, an upload checklist.
- I ran it: `stills.mjs` + `verify.mjs` on the bundled template work on macOS Chrome out of the box ("seek(t) is pure at every tested time").

## How Claude was guided
- SKILL.md is a director's workflow with hard stop points: (1) brief reflected back, (2) ask where the sound comes from (file / link / Web Audio
  score / TTS voiceover), (3) analyse the audio and report "what I hear", (4) direction questions (look from a style menu, pacing, 2D vs 3D,
  the points a muted viewer must get), (5) a written treatment saved as `film/FILM.md`; "Nothing is built until you say go."
- Build rules: data-driven timeline that both picture and sound read; no hidden state in draw paths; deterministic physics replay
  (reset from seeded state, step at fixed dt); hardest shot first; text in the platform safe zone.
- Inspect loop: purity test, whole-film contact sheet, frame-by-frame strips at handoffs, 1:1 crops of faces and hands; "Say plainly whether you
  listened to the soundtrack".
- references/styles.md: a style menu with deep recipes, especially "Cut-paper stop-motion print" (hand-cut edges by pushing subdivided edge
  points along normals, paper-fibre texture `source-atop`, contact shadows from the blurred silhouette, rim light, 3-7 parallax sheets, and
  the two-clock rule: puppet poses at 12/15 per second with per-pose boil and exposure flicker, camera smooth every frame).
- references/design.md §8 "Lessons from real revisions" records client notes, including "no longer shall we do 3d" (which made 2D the default),
  "generalize the idea; don't illustrate every line", "rich rendering of few elements", keep stars fixed pixel size when zooming,
  tone-map additive glows.
- references/production.md: bible + script, kit agents (character rig, world kit, props kit, each with a test contact sheet), prove the cold
  open, then scene directors in parallel, an audio team, render farm, continuity pass.

## Look (frames viewed: the two README GIFs, 320x569 and 360x640, plus my render of the template)
- Shaml (paper lightbox, 9:16): night city in flat cut-paper vector, a medallion of ~336 coloured paper shards (gold, teal, blue, red) bursting
  into spiral arms around a white-gold sun, with motion-blurred shards flying past the lens; two thin figures (one in a thobe) by a lit dome;
  neon "SALE" and "%" signs on the left side; a wet floor mirrors the scene; Arabic calligraphy title + English subtitle at the top.
  Polished and graphic, closer to premium motion-design than to cartoon; figures are simple capsule silhouettes with no acting.
- The Script of Me (9:16): a macro of a real illustrated journal page (watercolour clock with roses and vines; a real asset, not code-drawn)
  with soft depth of field, a letterboxed pendulum on black with italic serif captions ("The house is quiet." / "The heart is not."),
  then a flat-lay on mauve paper: clock face, copper gears and hands laid out like a specimen plate under "No. 1 THE CLOCK / Brass · Water · Patience".
  Elegant, calm, editorial; reads like a luxury product reel.
- Template render: a gradient night sky to dawn over a dark hill with an italic Garamond caption. Placeholder only.
- No humour or character acting in the visible samples; sample size is tiny (10 s total, GIF-compressed).

## Quality
7/10 on what is visible: tasteful, clean, platform-aware; less charm and comedy than PDoom. The value is the process and tooling.

## What Picasso Lab should borrow
- The stop-before-building treatment step (FILM.md) and "what I hear" audio report, adapted to our voiceover script.
- `verify.mjs` purity proof and the stills/strip/1:1-crop review commands; raw-pixel fast export; `--ss 2` supersampling.
- Delivery rules for X/Douyin: no animated grain in the upload, BT.709 TV-range tags, upload checklist.
- The two-clock stop-motion rule (poses on 12/15 fps with per-pose boil, camera smooth every frame) for a charming 2D look with a smooth camera.
- Shaders composited into 2D for sky/light/glow, which is exactly "3D/GPU as accent, 2D as core".
- design.md §8 lessons, especially "generalize the idea; don't illustrate every line" for explainers.
