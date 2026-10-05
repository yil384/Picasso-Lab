# illodev/drawn-by-code

https://github.com/illodev/drawn-by-code  (LICENSE: MIT for code/styles/skills/docs; fonts OFL; sfx under
ElevenLabs terms; rendered videos/GIFs/stills "shared for viewing only". GitHub API reports NOASSERTION.)
16 stars, 1 fork, created 2026-09-24, last push 2026-10-02 (API, 2026-10-04). 421 commits. Repo ~700 MB
(most of it renders); I sparse-checked-out without the two biggest mp4s and fetched those via raw URL to extract frames.

## Who made it (verified)
- README: "Animations and videos made **with code** by Claude." and "**The goal: push Claude's knowledge and visual
  limits as far as they go.**"
- Commit trailers (gh api, all 421 commits): 309 end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`,
  2 with `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>` (311 total). The brief I was given
  said 88; the current count is 311.
- CLAUDE.md / HANDOFF.md are written to Claude Code sessions ("so a Claude Code session on the user's own computer ...
  can pick up where it left off"); the user talks in Spanish, repo is English.
- Music and sfx: ElevenLabs (README / LICENSE). Some pieces are 1:1 replicas, made as studies, of films by Kevin Ngo
  (@kevin_t_ngo), credited in the README.

## Stack
Plain JS on a 2D `<canvas>` (WebGL2 only for clay3d/felt3d/tabletop3d/engraving raymarch), one global `Motion` core,
a kit per style. playwright-core + Chromium renders frames; ffmpeg encodes. Node tools: review.mjs (automatic critique),
reference.mjs (measure a reference video), detail.mjs (zone-by-zone detail gate vs a reference), tempo.mjs, mix.mjs,
transitions.js, strip/gif makers. 13 styles (~5.4k lines of kits, engraving alone 2.3k). 21 skills in .claude/skills
(~2.2k lines).

## Pipeline
- `Motion.scene({ fps, duration, logical, uses, fonts, bpm, shots, setup, draw(g, t, env) })`; a frame is a pure
  function of t, stop-motion styles change drawing every 1/12 s ("on twos"). Expensive pieces are painted once into a
  sprite cache at output resolution.
- `node engine/render.mjs scene.js --at 1,2.5` stills, `--size 1920` mp4, `--gpu` probes ANGLE backends (software GL
  falls back to SwiftShader; HANDOFF says an engraving frame took minutes on CPU, ~0.4 s on a laptop GPU).
- Style kits do the "material": paper.js `cutout()` = torn white edge + colour + marker strokes + pasted-paper shadow;
  detail.js has splines, tapers, knit/rib/newsprint/wood-grain printed papers, marker paths, creases, and a proper
  `hand()` with poses (open, wave, point, fist, pinch, wrap) by side and view. riso.js is a simulated press: you draw
  density on per-ink plates (pink/yellow/blue/navy), it prints them in multiply through rotated halftone screens with
  misregistration, ink starvation blotches and paper grain.
- Measured here: risograph and paper-cutout templates each render a 1280 px still in ~1-2 s on this Mac (SwiftShader).

## How Claude was guided
- CLAUDE.md: map of skills and engine; "The loop (mandatory)": never sign off without rendering and Reading frames;
  run skill review (auto critique, <=3 rounds) before showing the user; record user feedback and distil lessons into
  skills; one commit per round `review(<experiment>): round N · <lesson>`. "The detail bar": nothing shown until
  detail.mjs PASSes (with a reference) or every element is cropped at full res.
- animate skill: brief -> shot table (every shot "one action you can tell in a sentence with a verb", density in 3
  layers, one evolving visual idea, cuts on the beat, nothing still > 1 s, dress the set, IK bodies, physics for throws,
  "every joke has to read") -> 4-7 s style test that locks the look -> animatic -> final; 9:16 "recomposed, not cropped";
  parallel block agents with exact join states; a dated Lessons list (e.g. "Transitions the user liked were continuous
  physical ones ... Generic wipes and kaleidoscope irises read as filler"; "An adversarial review by parallel agents ...
  found ~50 issues").
- review skill: automatic critique checklist (legibility, clarity, density, motion, photosensitivity <= 3 flashes/s,
  rhythm, origin and physics, continuity, composition, accuracy, ending, detail, hands), user feedback verbatim in
  review.md, and a table of where each lesson goes (style skill vs animate vs engine vs review.mjs).
- Per-style skills with Rules / Detail / Checklist / Lessons (paper-cutout: "Nothing boils", white edge on every main
  piece, pasted-paper shadow, Patrick Hand lettering, heavy-lidded eyes, hands never circles, no arm stretched in from
  the frame edge).
- Each sandbox experiment keeps brief.md, review.md (physics-history has 16+ rounds with verbatim Spanish feedback such
  as "Me falta mucho dinamismo", "Hay transiciones que no estan nada cuidadas"), review/sheet.jpg and the render.

## Look (frames I viewed)
Frames extracted from physics-history (67 s), pyramid-engraving (64 s), saas-promo (50 s), exquisite-corpse (30 s),
opus5-riso, felt-cats; the 6 style strips; and my own renders of the riso and paper-cutout templates.
- physics-history (risograph, 1280x720): a real picture-book film. Heavy, visible halftone dots in 4 spot inks on a
  night-blue ground, overprint colours, misregistration, paper grain. Galileo's eye in macro next to a brass telescope
  projected from 3D, Jupiter's moons in the eyepiece, Newton by an apple tree with ladder, sheep and farmhouse, Faraday's
  coil, Curie holding a glowing vial with a black cat, young Einstein chasing a light ray across a perspective grid with
  the cat, Schrodinger's box split into worlds. Characters are recognisable and charming, but anatomy is sometimes stiff
  (Newton's crouch reads oddly) and the grid/box shots are thinner.
- saas-promo (paper cutout, 1920x1080): best craft in the repo. A woman at a desk buried in paperwork; every piece has
  a torn white fibrous edge and soft pasted shadow, wallpaper with a sprig pattern, calendar, clock, cork board, marker
  scribble writing, fingers drawn individually. Looks like a real paper-cutout studio short. Also shows the risk: the
  product screens (invoice form, phone app) are flat UI.
- pyramid-engraving: 3D raymarched pyramid/temple drawn as charcoal hatching on sepia paper with a cyan accent line;
  atmospheric but grey and low-contrast; the "drawn" read is weaker than the 2D styles.
- exquisite-corpse: paper frog -> 70s poster mushroom ("GLUP!") -> liquid light -> kaleidoscope -> stick-figure line;
  a fun style showcase, uneven (the line segment is deliberately crude).
- felt-cats (720x1280, 9:16): raymarched needle-felted cats in cowboy hats; fuzzy material reads, motion paused/unfinished.
- opus5-riso replica: Saturn in pink/yellow/blue halftone, very convincing print texture.

## Strengths
- The most transferable system of the four for a 2D-first channel: material-first style kits (paper, riso press, clay,
  comic, engraving) where code fakes a physical medium convincingly.
- A self-improving process documented in public: skills with dated lessons, a mandatory render-and-look loop, automatic
  review (determinism, cuts off beat, stills > 1 s, flashes), detail gate against references, verbatim user feedback.
- Explicit hand/anatomy/physics rules learned the hard way, which is exactly where code-drawn characters fail.
- physics-history is a narrated-free science explainer with a recurring cat: proof the approach can explain real science
  with charm.

## Weaknesses
- Uneven: some styles are "in testing" and the 3D ones (felt, clay3d, engraving) are slower and less charming.
- Character anatomy is still stiff in places; heavy halftone at 720p is busy.
- No shared look across experiments (by design it is a style hub), so no single "channel identity".
- Rendered media is view-only licensed; code is MIT.

## Borrow for Picasso Lab
- riso.js press (per-ink plates -> halftone, overprint, misregistration, starvation, grain) and paper.js/detail.js
  (torn-edge cutouts, printed-paper textures, proper hands) as the base of our 2D look; both run per frame on Canvas2D.
- The animate + review skills nearly verbatim as our episode workflow: brief with "must NOT happen" list (physics-history
  lists accuracy traps like "Marie Curie credited alone"), shot table with one verb per shot, style test that locks the
  look, animatic, final; review checklist incl. "in vertical, keep the bottom 250 px and the top 150 free".
- Accuracy section in the brief: a "what must stay accurate" column per figure, ideal for LLM-systems/quantum facts.
- engine/review.mjs-style automatic checks (still stretches, flashes, determinism, cuts on beat) before any screenshot
  goes to the user; detail.mjs zone comparison when we replicate a reference.
- Lesson: continuous physical transitions (object carried across the cut) beat generic wipes; a recurring animal
  character (the cat) gives charm and continuity.
- Not to borrow: the "everything drawn by code, no bitmap assets" rule; our house rule prefers painted assets (Codex
  sprites) for characters, with code doing material, motion and print treatment.
