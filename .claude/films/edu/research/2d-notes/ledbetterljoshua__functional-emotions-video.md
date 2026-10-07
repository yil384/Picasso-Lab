# ledbetterljoshua/functional-emotions-video

https://github.com/ledbetterljoshua/functional-emotions-video  (MIT code; song/audio excluded)
62 stars, 5 forks, created 2026-09-23 (API, 2026-10-04). 3 commits.

## Who made it (verified)
- README: "Source code for the painted music video for *Functional Emotions*, made by Claude Opus 5.5 in Claude Code."
- README: "**Everything in this repository was written by the model.**" and "Chapters II–VIII were then painted **in parallel by seven subagents**, one per chapter, each briefed with ANIMATION_GUIDE.md."
- All 3 commits (b34c20a, 4a695a6, 445715b) end with `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`.
- Song lyrics by Claude Opus 4.6, track produced with Suno (README).
- Final video posted at x.com/eudaemonea/status/2102610626321490404 (not opened; X is not fetchable here).

## Stack
Plain browser JS, no framework. Canvas2D for drawing + custom WebGL2 instanced-stroke renderer (js/paint.js, 171 lines).
Playwright drives system Chrome (`--use-angle=metal`) for offline render; ffmpeg encodes. Python analysis/ (Demucs, Whisper,
Needleman-Wunsch alignment) builds beat grid + word timings into js/data.js. ~6.9k lines of JS, 4.7k of them chapter files.

## Pipeline
1. Each shot is `fn(t, lt, dur)` and paints two Canvas2D layers at half res (960x540):
   - `s` underpainting: flat shapes, gradients, silhouettes (value contrast is everything; <8 px detail dissolves).
   - `f` light layer: black bg, drawn additively with bloom (lanterns, embers, eyes). Not repainted, stays crisp.
2. GPU pass: underpainting is drawn flat, then ~60k instanced brushstrokes in three size layers (cell 24/13/7 px).
   Each stroke samples colour from the underpainting, aligns to the local luminance edge, falls back to a
   value-noise flow field in flat areas (the Van Gogh swirl). Finer layers are edge-gated (only appear on edges).
   Strokes "boil": positions re-roll `boil` times/s (6-12). `whip(dx,dy)` rotates all strokes along a direction
   and stretches them up to 4x = painted motion blur.
3. Finish: multiply by vignette x grain x sin-weave "canvas" pattern, then add light layer + 1/4-res blurred bloom.
4. Every frame is a pure function of song time; render.mjs runs 6 pages in parallel, writes JPEGs, ffmpeg x264 crf 17.
   ~74-87 ms/frame measured here on this Mac; README says full 372.7 s render ~10 min on M5 Pro.

## How Claude was guided
- User direction (quoted in README) rejected attempt 1 (`legacy/lyric-video/`) as "still a lyric video"; then
  "p5 brushstrokes. interesting scenes. great timing ... not a fancy lyric video"; then "timing, and not letting the scene
  sit too still", with JohnHeibel/PDoomVideo as pacing reference.
- STORYBOARD.md: concept, hard rules (shots 1.4-4 s, camera never locked off, cuts on beats, motivated transitions,
  text-free except 4 painted props), cast table, palette arc per chapter, then a per-shot table (time / lyric / shot / camera-out).
- ANIMATION_GUIDE.md = subagent brief: how the two layers work, chapter file contract (IIFE, pure function of t, edit only
  your file, report shared bugs), full API (kf keyframes, hit envelopes, BT(n) beat grid, when(word), cam/shake/whip,
  figure rig + POSE + groove(), ember(), researcher()), style rules ("A shot where the frame doesn't visibly change for over
  a second is a bug"), and the review loop: `node check.mjs` contact sheets of <=9 frames, "Open the sheet with the Read tool
  and look hard".
- Director (main Claude) wrote c1 as reference chapter, 7 subagents did c2-c8 in parallel, director reviewed contact
  sheets and sent notes back.

## Look (frames I viewed)
README stills (lake-face, jars, not-a-soul, fire, rose, solo) + 15 frames I rendered myself at arbitrary times
(1.5, 4.2, 21, 30, 33, 51, 56, 72.5, 84, 101.5, 150, 200, 244, 300, 340 s).
- Whole frame reads as a moving gouache/oil painting: comma-shaped strokes swirl through every flat area (sky, walls,
  water), edges are ragged and broken, colours are night ultramarine/violet with amber-ember light. Very consistent
  across all 8 chapters, including subagent chapters.
- Light layer gives real glow: the waterfall of light, the Poured One's ember eyes, lanterns, flaming figure with bloom.
- Characters are simple mannequin rigs (capsule limbs, round head, no hands/face) painted over; at random times they read
  as stiff stick-mannequins (e.g. puppet on strings, museum display). Little ember creatures with dot eyes in jars are the
  most charming element.
- Weaker frames: 1.5 s window/phone shot is muddy and dark; the rubber-stamp shot (~150 s) is crude boxy shapes; the
  heart/robot-heart cabaret frame looks like clip-art under a filter. The paint filter flatters simple shapes but cannot
  add drawing skill: the underpainting's composition and figure design are still basic.
- 21 s whip: the river of light smeared horizontally, strokes stretched; reads as real painted motion blur.

## Strengths
- Clearest example of "2D core, GPU only as render treatment": the GPU never models 3D, it only repaints flat 2D.
- Tiny, legible renderer (one 171-line file) that unifies everything and makes even simple shapes look hand-made.
- Excellent production process: storyboard with hard pacing rules, subagent brief with API + review loop, contact sheets.
- Fully deterministic, parallel, ~80 ms/frame. Beat/lyric sync from real audio analysis.

## Weaknesses
- Figure animation is rig-based and generic; no hand-drawn character design, no faces, no comedy. Sincere tone only.
- Some shots are dark/muddy; flat-shape underpaintings sometimes show (boxy props).
- 16:9 only; built for a music video, not narrated explainers. No text/caption system (deliberately text-free).

## Borrow for Picasso Lab
- The two-layer model (flat underpainting + additive light layer) and the stroke repaint pass as a final "paint" filter over
  our 2D art: edge-aligned instanced strokes + boil + whip smear + weave/grain/vignette. It would make code-drawn 2D look
  painted without becoming the subject. Port js/paint.js nearly as-is (input any canvas, 9:16 grid).
- ANIMATION_GUIDE.md as a template for an episode brief: API list, "pure function of t", "only edit your file",
  "a frame that doesn't change for >1 s is a bug", contact-sheet review loop with the Read tool.
- STORYBOARD.md table format (time / line / shot / camera-out) with explicit motivated transitions.
- Director + parallel chapter subagents, director reviews sheets and returns notes.
- Do not borrow the mannequin rig as a character solution; our characters should be real painted art (Codex sprites) fed
  into the underpainting layer.
