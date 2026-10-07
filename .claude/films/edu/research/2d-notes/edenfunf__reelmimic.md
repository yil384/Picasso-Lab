# edenfunf/reelmimic

- URL: https://github.com/edenfunf/reelmimic  (1266 stars at 2026-10-04; created 2026-09-28; pushed 2026-10-04; MIT
  for its own code; bundled skills keep Apache-2.0 (HeyGen HyperFrames) / MIT (painted-animation, ClaudeAnimationBase)).
- A local web app + agent crew: give it a reference video (file / screen recording / YouTube link) and a one-line brief;
  it analyses the reference (shots, BPM, transitions, colours, camera moves), writes a plan for approval, then up to
  6 builder agents (Claude Code or Codex CLI) make 2D shots in parallel and fresh reviewer agents check every shot.

## Made with
- README: "The whole thing runs on your own computer, with your own Claude Code or Codex." Badges for both.
- Commits: 68, mostly by 許元豪 / Eden; only 2 Co-Authored-By trailers, both on small outside-contributor fixes
  ("Claude Opus 5.5 (1M context)" on an SSE reconnect fix; "Claude Sonnet 5" on a port-in-use message). Commit text
  mentions Claude Code PR review. No model is named for the three demo films -> model for the demos: unverified.
- The bundled `painted-animation` skill (upstream tuzhechen2005/painted-animation) says: "A Claude Code skill for
  producing hand-painted animation and lyric videos with Claude Opus 5.5" and that its method "is derived from ...
  PDoomVideo, a 156-second music video produced largely autonomously by Opus 5.5, and ClaudeAnimationBase". That claim
  is about the upstream engine, not ReelMimic's demos.

## How Claude is guided
- `CLAUDE.md` (Traditional Chinese): always load `/video-clone` first; 2D only ("3D 賽道暫停"; 3D references are
  re-made in 2D and the user is told); characters original unless the user owns or names them; plan maps every shot
  to a reference shot (`ref_shot` + `camera`); after building, `compare.py` side by side, every shot scored >= 4
  before delivery; after every render, extract frames and look at them with Read.
- `video-clone/SKILL.md`: the director. Goal stated as "驚艷、讓人起雞皮疙瘩，不是「沒有錯」": find the reference's
  1-2 climaxes (`analyze.py` peak candidates + flash frames), design ours (build-up -> held breath -> hit on the
  downbeat -> hold), compare as consecutive frames, not single stills. Production gates: required user inputs before
  approval -> director builds shared assets -> character gate (model sheet, 8+ expressions, 6+ poses, reviewed by a
  fresh agent) -> segment builds with immediate fresh review (max 3 rounds) -> assembly + `motion_check.py` (black
  frames, hard cut to black, unintended freezes) -> final critic with a "climax duel" against the reference. "Fixes
  need proof": before/after crops in fixes.json. A human-eye checklist (limbs attached, neck, no double outline, line
  width consistent, subject big enough, anticipation and follow-through).
- Style registry `video-clone/styles/*.md`: frontmatter `engine / medium / priority` + recognition traits + production
  defaults + known pitfalls (painted-story-mv, crayon-storybook, whiteboard-explainer, narrated-comic-vlog,
  paper-cutout, pixel-story, anime-cel, motion-graphics, faceless-explainer...).
- Engine skills: painted-animation (p5.js + p5.brush watercolour, from ClaudeAnimationBase, with its ANIMATION_GUIDE:
  handmade / alive / one piece; boil 12x/s; never project 3D; no text; "write the reads" timing; transitions
  always; anticipation, follow-through, avoid twinning), crayon-storybook (p5.brush crayon, 8 fps boil, page turns,
  CJK storybook captions), whiteboard (marker draw-on with a cartoon hand), pixel-art, paper-cutout, anime-cel,
  HyperFrames motion graphics; `vector_rig` (2D SVG skeleton characters with one merged outline per depth layer, so
  no seams or floating hands).

## Stack / pipeline
- App: Node 22 server + React front end, SSE job stream, agents spawned as Claude Code / Codex CLI processes.
- Engines: headless Chrome (puppeteer-core) rendering `studio.html` pages where each frame is a pure function of t;
  `render.mjs` has --sheet, --strip (12 fps strips), --crop and --crop-at (crop that follows a world point through
  the camera), cached parallel --frames, --encode with audio. Python tools: analyze.py (cuts, BPM, per-shot camera
  move + brightness/contrast/saturation, peak candidates), clip_strip.py (ours vs reference strips), compare.py,
  motion_check.py, align_lyrics.py (faster-whisper as a ruler, text only from the user), fetch_assets.py (Openverse,
  Pixabay, Freesound with licence logging).

## Rendered locally
- painted-animation template demo (ClaudeAnimationBase-derived) rendered with its own render.mjs after a 74 MB
  npm install (since deleted): frames/edenfunf__reelmimic/rendered_painted_template_sheet.jpg.

## Look (frames viewed: reelmimic_demos.png (Sugar Rush + Sunshine Boy), catbath_sheet.png,
## painted_animation_xiaozhen_sheet.jpg, rendered_painted_template_sheet.jpg)
- Sugar Rush / Sunshine Boy (music videos, "hand-painted"): Clawd-style block characters (tux, pink bow), magenta
  velvet stage with spotlights, a giant pastel layer cake under an arch with confetti; a block character at a door,
  a TV with a surfboard scene, night town. Watercolour fills with paper grain and boiling ink outlines - the P(doom)
  / ClaudeAnimationBase look almost unchanged. Cute, competent, but derivative and not distinctive.
- Bath Time (narrated comic, 30 s): clean vector sticker style, a boy with glasses, orange cat, Chinese title
  "3分鐘！", blue speed lines, crossed-out "3分鐘" -> "20分鐘" gag. Readable comedy timing, flat "web vector" look.
- painted-animation xiaozhen example: soft violet station at dusk, train, TV with a koi, a star, karaoke subtitles in
  a brush font with strike-through wordplay - the most charming of these.
- The README GIFs are tiny (420x203, cropped) and silent; I could not see the full films.

## Quality
- 6/10 for the visible output (derivative of ClaudeAnimationBase); the review/production machinery is 8/10.

## Borrow
- Reference-driven planning: analyse a reference film we admire (cut lengths, camera moves, brightness/contrast,
  climax), map every one of our shots to a reference shot, then compare side by side (`analyze.py`, `compare.py`,
  `clip_strip.py --vs`).
- Climax-first design (build-up, held breath, hit on the beat, hold) and a final "climax duel" against the reference.
- Gates: character model sheet reviewed before any shot; fresh-context reviewer per segment; fixes require
  before/after crops; motion_check for freezes/black frames.
- Render tooling: `--strip` at 12 fps and `--crop-at` (crop following a world point through a moving camera).
- `vector_rig` idea: skeleton + one merged outline per depth layer instead of primitives glued together.
- The ClaudeAnimationBase ANIMATION_GUIDE rules (reads, alive, transitions always, avoid twinning, no text).
- Note it, too, paused its 3D track and went 2D-only - the same move Picasso Lab is making.
