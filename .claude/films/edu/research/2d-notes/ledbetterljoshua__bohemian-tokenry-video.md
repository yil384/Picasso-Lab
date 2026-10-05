# ledbetterljoshua/bohemian-tokenry-video

- URL: https://github.com/ledbetterljoshua/bohemian-tokenry-video (2 stars, 0 forks; created 2026-09-24). License: MIT
  for code; "The song, its lyrics and the audio in `assets/` aren't covered by that license".
- Final video link: none in the README (unverified where it was posted). Earlier video by the same pipeline:
  ledbetterljoshua/functional-emotions-video.

## Who/what made it (verified)
- README: "Claude Opus 5.5 made it in Claude Code." and "**Everything in this repository was written by the model.**"
- Repo description: "Made by Claude Opus 5.5 in Claude Code."
- One squashed commit (gh api): joshua ledbetter, 2026-09-24, "Bohemian Tokenry: music video source (five styles, one
  opera)", trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Per-agent history is not public.
- Lyrics by Claude Sonnet 4.6, music by Suno (README credits).

## Stack
Plain Canvas2D (plus whatever each kit chose) in one HTML page, no framework, no p5. Playwright driving the local Chrome
(`channel: 'chrome'`, `--use-angle=metal`), ffmpeg. ~7,800 lines: `video/core.js` (211, director-owned timeline, 0.4 s
beat grid, audio features, `CTX(t)`, transitions, `CROSS()`), five kits in `video/styles/<style>/kit.js` (papertheater
634, rubberhose 1,117, claudesona 940, glam 750, pixel 370), each with an `API.md`; 12 chapter files `video/ch/` = 172
shots; `analysis/` Demucs + Whisper + forced alignment into `video/data.js`. 30 fps.

## Pipeline
- Each kit exposes `render(ctx, t, fn, info)` (full frame with its own post) and `layer(ctx, t, fn, info)` (transparent,
  no post). `CROSS(style, t, fn)` renders another kit's characters onto a transparent canvas, which the host kit mounts
  in its own material (a felt cut-out on a stick, a cardboard TV, an opera box). That's how styles mix in one shot.
- Paper kit internals (read in kit.js): procedural 512 px PAPER and FELT fibre textures (thousands of tiny curved
  strokes + specks); `cut()` fills a polygon, clips the fibre pattern inside, adds a top-light/bottom-dark gradient, a
  light cut edge, `fuzz()` strands along the normal, `stitch()` dashed seams, `wobble()` hand-cut edges; `bake()` caches
  each part as a sprite with a matching blurred drop shadow at load. Composite: z-sorted planes through a perspective
  camera (`1000/(z - cam.z)`), depth-of-field blur outside a focus band, a multiply light map of gel pools, screen-blended
  beams with dust, vignette, grain. Characters on twos, camera smooth.
- Rubber-hose kit: ink noodle limbs, white gloves, on twos with line boil, film post (grain, flicker, weave, dust,
  hairs, scratches, rounded gate). Pixel kit: rasterises into a 384x216 palette buffer with dithered lighting.
- `render.mjs t0 t1 out workers fps`: parallel Chrome pages, resumable JPEG frames, mux audio. README: "A full render
  takes about 90 seconds on an M5 Pro" (not verified). Measured here: 9 scattered stills in --full mode averaged
  759 ms/frame (cold pages, includes bakes; the sample NOTES quote ~20-27 ms/frame for rubber hose).

## How Claude is guided
- Human direction was three short prompts (quoted in the README), the decisive one: "it is your call. idk how we could
  use all these styles and make it feel cohesive. but if you manage it, it'll be incredibly impressive."
- `samples/BRIEF.md`: an art-direction bake-off. Five subagents each build a 20-35 s sample of the same two moments
  (quiet intro for mood/lighting, the argument for comedy/crowds/energy), with a strict technical contract
  (`window.__frameJPEG(t)`, pure function of song time, <150 ms/frame), deliverables (two mp4s, hero.jpg, NOTES.md with
  pitch, cast, palette hexes, how it scales to 150 shots, risks) and a self-review rule ("fixed at least one round of
  problems ... honest one-paragraph self-critique"). Notable bans: "Don't use watercolor or brushstroke painting and
  don't imitate the "Functional Emotions" video" and do not look at earlier attempts.
- `STORYBOARD.md`: one concept (the song is one conversation's lifespan staged as one opera in a paper toy theatre;
  each act in the style that fits it) + six cohesion rules: lead always wears a cream bowtie; Claude terracotta always
  #D97757; the moon is the context clock (`CTX(t)` crescent -> full); the User is three bouncing typing dots; the
  gradient is downward arrows; act changes are staged transitions (curtain, pixelate, iris, echo, film burn). Then
  per-shot tables with times, lyric and one action per 1.2-3 s shot.
- `GUIDE.md`: production rules for the five agents (now the crew): "Story over lyrics ... never as karaoke", "Nothing
  sits still", "Cute, friendly, funny", "Hold your sample's quality bar or beat it"; kit contract (IIFE, nothing leaks
  but `STYLES.<style>`), API.md per kit "one screen", ownership table, "Edit only your own files", "message the
  director" for core changes, contact-sheet review ("at least 3 samples per shot ... fix at least two rounds"), report
  with "what you're proud of, what's weakest". The director reviewed every chapter on contact sheets, ~two note rounds.

## What it looks like (frames viewed)
Viewed: the 9 README stills (`frames/bohemian-tokenry-video/sheet_docs.jpg`), the 5 sample heroes
(`sheet_sample_heroes.jpg`, full res `hero_papertheater.jpg`, `hero_rubberhose.jpg`), and 9 frames I rendered across
the song (`sheet_rendered.jpg`, `rendered/t_*.jpg`).
- Paper theatre: genuinely tactile. Felt Clawd puppets with fuzzy fibre edges, stitched seams and soft blush; cardstock
  balustrades and arched windows; red felt curtains; warm gel spotlights and dust beams; real depth-of-field blur on
  near/far planes. Reads like a lit stop-motion set. The training-data starburst (hundreds of hanging cut-out cards on
  strings forming the Claude asterisk) is a beautiful image.
- Rubber hose: sepia 1930s cartoon, bold ink, white gloves, noodle arms, glossy terracotta highlight as the only
  colour, heavy grain and rounded film gate. Convincing period pastiche.
- Claudesona: clean cel-shaded kawaii sticker art (thick outlines, pastel room, crying sun-maned character). Competent
  but the most generic/vector-looking of the five.
- Glam '75: psychedelic op-art rings, sunbursts, halftone, art-deco temple with a giant "NO!". Loud, poster-like.
- Pixel: 16-bit JRPG look with a lives counter and softmax bar columns; on-model and funny.
- The style-mix seam (t=260 s 3x3 grid of glam Claudesonas, t=205 s motion-blurred rubber-hose Clawd on the paper
  stage) works because of the shared bowtie/terracotta/moon rules.
- Candid: the strongest craft of the four repos in texture and lighting (paper theatre), and the clearest example of
  "a look that holds up as a system". Weak spots: claudesona and glam drift toward generic vector/poster art; it is a
  comedy music video, not an explainer, and text use is minimal by design.

## Quality
8.5/10 (paper theatre 9, rubber hose 8.5, pixel 8, glam 7.5, claudesona 7).

## What Picasso Lab should borrow
1. The material recipe of the paper kit, for our 2D-first look with real texture and "3D only as render effect":
   procedural fibre textures clipped into wobbly hand-cut polygons, fuzz and stitches, baked sprites with blurred
   drop shadows, z-planes through a real perspective camera for parallax, depth-of-field blur by plane, a multiply
   light map plus screen beams. This is exactly "2D core, 3D as a render effect".
2. The art-direction bake-off: N subagents build a 20-30 s sample of the same two moments (one quiet/mood, one
   comedy/energy), each with hero.jpg + NOTES.md (pitch, palette hexes, how it scales, risks) and a self-critique; the
   user picks after seeing motion.
3. Cohesion rules as a short numbered list that survives style changes (a signature prop, a locked brand colour, a
   running-gag clock like the moon = context window, the User as typing dots). For our channel: a recurring lab mascot
   prop, the KV cache or a qubit as the "clock".
4. The kit contract: each style kit is an IIFE exporting `render` and `layer`, with a one-screen API.md for other
   agents, and a `CROSS()` to borrow characters across styles. Ownership table + "edit only your files" for parallel
   agents.
5. Staged transitions between acts (curtain, pixelate, iris, film burn) as part of the grammar.
6. Their running-gag idea maps directly onto LLM-systems explainers (context window as a filling moon, instances
   spawning, the gradient as a river of arrows).
