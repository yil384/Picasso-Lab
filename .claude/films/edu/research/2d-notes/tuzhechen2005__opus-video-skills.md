# tuzhechen2005/opus-video-skills

- URL: https://github.com/tuzhechen2005/opus-video-skills (107 stars on 2026-10-04, created 2026-09-26, 4 commits)
- License: MIT ("Copyright (c) 2026 tuzhechen2005"; portions in skills/painted-animation/template/ and kinetic-reel's render.mjs are
  "Copyright (c) 2026 John Heibel", MIT).
- Form: two Claude Code skills packaged as plugins (`/plugin marketplace add tuzhechen2005/opus-video-skills`), each with SKILL.md, a runnable
  template, references and a worked example. Bilingual README (English / Simplified Chinese).

## Provenance (verified)
- README: "A collection of Claude Code skills for producing videos with Claude Opus 5.5, one skill per visual style." and
  "The skills and examples were produced with Claude Opus 5.5 in Claude Code."
- examples/xiaozhen/STORYBOARD.md: "Made with this skill by Claude Opus 5.5 in Claude Code."
- All 4 commits end `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` (author JellyTu).
- README: "All imagery and all music are generated procedurally in code; no image, video or audio generation model is involved."
  (The Xiaozhen lyric video uses the David Tao song itself, not included.)
- Derivation: I diffed the painted-animation template against JohnHeibel/ClaudeAnimationBase: ANIMATION_GUIDE.md, src/clawd.js and render.mjs
  are identical; src/core.js differs by 3 lines (extra fonts, an `overlayHook` for karaoke). The README credits this: "The painted-animation
  engine and guide are adapted from ClaudeAnimationBase by John Heibel (MIT License), and the method follows his PDoomVideo."

## Stack and pipeline
- painted-animation: p5.js + p5.brush watercolour, 1920x1080, pure f(t) shots, headless Chrome (`--use-angle=metal` on macOS) for
  `--sheet/--strip/--crop/--crop-at/--clip/--frames/--encode/--loop`; adds `src/karaoke.js` (word-by-word KTV fill, Ma Shan Zheng brush font
  subset, `opts.pun = {from, to, at}` strike-through gags, `opts.hold` two-row hold), `scripts/beat_grid.py` (BPM + beat phase + each LRC line's
  beat index), `scripts/new_project.sh` (scaffold + npm install + toolchain check), `references/music-video.md` (P(doom) lessons for long videos,
  a CHAPTER_BRIEF.md template for parallel subagents).
- kinetic-reel: `reel/reel.js` (ES module) = three.js layers rendered into an offscreen WebGL canvas (`glA`) and drawn into a 2D type canvas via
  `glShot()`, then a WebGL post pass on the output canvas (`FX`: RGB split, row slice glitch, grain, vignette, flash). GL layers: particle terrain,
  domain-warped liquid marble, chrome torus knot with inked outline, a 9k-particle cloud that morphs from a shell to a silhouette and can project
  points so 2D lines hit real 3D points. Transitions table `TR` (zoom through a UI element, iris from a lit node, push, wipe, slats, grid dissolve;
  0.45-0.6 s, never three of one kind in a row) renders scene A frozen on its last frame then B live. `music/score.mjs` synthesises the score in Node
  from the same `cues.js`. 120 BPM, cuts on beats.
- I scaffolded and rendered both templates locally: kinetic-reel 1-140 ms/frame, painted-animation 90-190 ms/frame on an M2.

## How Claude was guided
- painted-animation SKILL.md: scaffold, read ANIMATION_GUIDE.md in full and look at the model sheets (`docs/emotions.jpg` 31 emotions,
  `docs/views.jpg`) with Read, storyboard with timed "reads" and show it to the user, block key poses as stills first, then render-and-look every shot
  (>= 1 sheet per shot, a strip per key motion and transition, a crop per face). Rules: only p5.brush strokes (no plain p5 shapes), flat 2D (turns via
  drawn key views, never 3D projection), no text except karaoke and a few SFX, something happens in every shot, time for the viewer, alive
  (idles, drifting cameras, boil), transitions at every seam, one piece (one world, colour arc, ending rhymes with the opening). Engine gotchas are
  concrete and useful (boilSeed per prop, don't shadow p5 globals, paint doorway jambs back over whoever stands in them, scale outline weight under zoom).
- kinetic-reel SKILL.md: decide emphasis/time budget first; "Facts are sacred" with a SCHEMATIC label on anything illustrative; "Every shot has a
  mechanism, not just words"; beat-locked; shape-continuity transitions; "No noise whooshes"; check the synthesised score with spectrograms and say
  you cannot hear it.
- Both skills record lessons from real revisions (Xiaozhen: get the LRC and measure tempo first because the first draft was twice too slow;
  carry a gag across a line boundary; Work Reel: rebalance chapter proportions by adding runtime, not cutting the loved part).

## Look (frames I viewed: xiaozhen-sheet.jpg, koi-gag.gif frames, emotions.jpg, work-reel-sheet.jpg, work-reel.gif frames, my template renders)
- painted-animation / Xiaozhen (16:9, 31 s): the PDoom look applied to a Mandopop lyric video: a dusk railway platform with a lamppost and
  houses, a sad Clawd on a bench with a suitcase and a rain cloud, a sepia spotlight-on-stage memory with radial lines, the pink Clawd with a flower
  crying at a train window (tears streaming), a night waiting room where painted smoke puffs clear to reveal a TV whose award stage shows a golden koi
  wearing her flower and a tie, the lyric 大经理 struck through and replaced by 锦鲤, the koi leaping out of the window and swimming across the night sky
  until it becomes a smiling star with a soft glow, then a teal steam train at the platform. Clear motif continuity (the flower) and a real gag; the
  watercolour washes and glows are pleasant. Weaker than PDoom in density: many frames are a single prop on a flat sky.
- Template demo: Clawd asleep on a hill under a moon, idea bulb, picks up a fallen star, star eyes, heart eyes. Charming but sparse.
- kinetic-reel / Work Reel '26 (16:9, 84 s, the author's own portfolio): condensed Anton headlines ("CALL THE RIGHT TOOL.", "SIX WAYS TO BE WRONG.",
  "CONSTRAIN THE DECODER.", "FOUR GATES.") on rotating black / lime / cream / electric-blue grounds, mono HUD micro-type in all four corners,
  tool grids, dot-matrix eval rows, odometer numbers, a JSON code card, a particle-cloud thyroid, a chrome knot, liquid marble behind an italic serif
  line. Very slick, but it is precisely the "animated web page / dashboard / slideshow" look the Picasso Lab user rejects, and the 3D layers are small
  decorative accents rather than storytelling.

## Quality
6.5/10 overall: painted-animation ~7 (good gag, borrowed engine), kinetic-reel ~6 for this channel's taste (high polish, wrong genre).

## What Picasso Lab should borrow
- kinetic-reel's compositing architecture (not its look): three.js renders into an offscreen canvas, `glShot()` draws it into the 2D frame as one
  layer, then a WebGL post pass; `cloud.project()` lets 2D ink lines attach to real 3D points. This is a clean "2D core, 3D accent" contract.
- The transition table with shape continuity (zoom through the element the eye is on, iris out of the thing that just lit up), varied, 0.45-0.6 s.
- "Facts are sacred" + SCHEMATIC labels for illustrative diagrams in technical explainers.
- painted-animation's karaoke module for the Chinese Douyin cut: word-by-word fill, subset CJK brush font, strike-through pun gag.
- beat_grid.py / tempo-first rule; the CHAPTER_BRIEF.md template for parallel chapter subagents; the model-sheet-as-image habit (emotions.jpg) so the
  agent can see its own character library.
