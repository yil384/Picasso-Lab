# mexicat/pdoom-video

https://github.com/mexicat/pdoom-video  (MIT code; song, lyrics and fonts excluded)
2,346 stars, 256 forks, created 2026-09-24 (API, 2026-10-04). 12 commits; author Giacomo Magnanini, plus 3 community PRs.
Video: https://www.youtube.com/watch?v=5EoO5413dBY (4K; README says that upload is an older 4-sub-frame render).

## Who made it (verified, README only)
- README (added in commit cd88dc8 "README: link the rev 5 4K video, credit Claude"):
  "The video was made with Claude (Opus 5.5) in Claude Code: the concept and treatment, the lyric alignment and audio
  analysis, the renderer, every scene and the renders were all worked out in conversation with Claude."
- No commit carries a Co-Authored-By trailer (checked all 12 via gh api). TREATMENT.md assigns plates to owners
  A1-A8, B1 and "lead", and ENGINE.md says "Engine changes: ask the lead", "Do not edit src/timeline.ts": a lead +
  parallel scene-agent setup, though the docs do not name the agents as Claude explicitly.

## Stack
TypeScript + three.js 0.186, bun + Vite, opentype.js for glyph outlines, EMS/Hershey SVG single-stroke fonts,
playwright-core driving system Chrome (`--use-angle=metal`) for export, ffmpeg x264. Python (uv) analysis: Demucs +
mel-roformer karaoke stem, CTC forced alignment cross-checked with Whisper, beat/downbeat/onset analysis.
~3k lines engine, ~19.6k lines in 40 scene modules.

## Pipeline
- Each plate is a `Scene` class whose `render(f, out)` fully overwrites a HalfFloat linear-HDR target. Tools: fullscreen
  GLSL passes (raymarched SDF rooms/creatures shaded with `hatch()`/`engrave()` line shading), `LineBatch` GPU capsule
  segments (10k-200k hairlines), `Layer2D` Canvas2D layers for type, a compositor.
- Timeline: scene windows found by lyric content (`ly.get("I'm upping", n)`) and snapped to the beat grid; hard cuts on
  downbeats by default; per-word karaoke via `Lyrics.wordProgress`.
- Post (post.ts): 7-mip Jimenez bloom with soft knee (only values > ~0.85 linear bloom), red-orange halation from the
  same pyramid, radial chromatic aberration, a tone shoulder that desaturates hot values to white, ink/bone invert,
  flash, shake, zoom punch-ins, vignette, two-scale film grain stronger in mid-tones, HUD composited before grain.
- Export: each output frame = average of N sub-frames over a 0.2-frame shutter; `--samples auto` steps 4 -> 12 -> 36 ->
  108 -> 324 and stops when the next step changes the worst 2x2 block by < 3/255. 1080p60 crf 16, or true 4K (`--scale 2`).
  4K whole song ~2.5 h on an M5 Pro. Per-frame flicker must key to `frameIdx(t)` so it is constant across the shutter.

## How Claude was guided
- docs/TREATMENT.md is a full style bible: one-paragraph idea ("plates from an illustrated treatise on the end of the
  world"), tone rules ("Funny the way a straight-faced scientist is funny ... No emoji, no cartoon faces ... no mascots";
  "Not slop: no purple/cyan neon cyberpunk, no glowing brains, no Matrix code rain ... Nothing that looks AI-generated"),
  a strict 8-colour palette, a 4-family type system with kerning rules, karaoke rules, recurring motifs (the spark,
  the mask, P(doom) staged in-world), and a plate-by-plate treatment with numbered "revision N" notes recording client
  feedback (e.g. realistic engraved eye retired as "uncanny", ultramarine plate retired).
- docs/ENGINE.md is the scene-author brief: commands for stills/contact sheets/clips with `--only <scene>` isolation,
  "then LOOK at the PNGs with the Read tool", determinism rules, perf budget < 25 ms/frame, "don't edit files outside your
  scene files", report engine needs to the lead.

## Look (frames I viewed)
14 plate stills shipped in app/public/plates (actual renders, one per scene) + 6 frames I rendered myself with
12-sample motion blur at 19.0, 23.6, 29.2, 57.0, 122.0, 147.0 s.
- High-end motion-graphics / title-sequence look: near-black ink ground, bone-white type, one hazard orange, rare acid
  green. Big Archivo display type slammed full-frame (P(DOOM), BREAKING THROUGH, half outlined/unsung), mono annotations,
  hairline grids, crop marks.
- 3D appears as white hairline engraving: raymarched shoggoth of tubes shaded entirely in contour hatching with orange rim
  light; wireframe Chinese-room library; engraved paperclip lattice; contour-line loss landscape; black hole with lensed
  grid. A guilloche banknote "Lunar Reserve Note" with an engraved moon.
- Paper plates: "Form 7-B, Safety evaluation of a frontier system, Dept. of Reasonable Assurances", typewriter fill-ins,
  rubber-stamped SAFE ENOUGH, signature "We", footnote "Safe enough is defined in Form 7-C, which has not been drafted."
  This is genuinely funny deadpan comedy and crafted like real print design.
- Grain, halation and slight CA are visible and filmic at 1080p, not cheap.
- Weak spots for our taste: the prompt plates (ChatGPT/Sydney token-probability panels), the P(doom) zero-wall and many
  HUD readouts are UI/terminal/dashboard-like; overall it is kinetic typography, not 2D illustration or character
  animation. No painted texture, no characters beyond the smiley mask.

## Strengths
- The most polished craft of the four: typography, palette discipline, line quality, motion blur, grain.
- Real wit: puns and bureaucratic deadpan rather than cute mascots.
- Excellent written direction (TREATMENT + revision notes) and a render-effect toolkit worth porting.
- Adaptive sub-frame motion blur is a real quality upgrade for fast whips/slams.

## Weaknesses
- Not 2D-illustration-first: it is typographic motion design + 3D line rendering; several plates read as UI/HUD.
- 16:9 karaoke music video; heavy (4K export hours; ~5 GB Chrome per pipeline).
- Claude authorship stated in README only; no commit trailers.

## Borrow for Picasso Lab
- post.ts as our finishing chain: soft-knee bloom only on the signal colour, orange halation, tone shoulder, CA, two-scale
  mid-tone grain, vignette, punch-in zoom and shake as post params returned per scene.
- Adaptive sub-frame motion blur (4->324, stop at 3/255) for whip pans and slams; `frameIdx(t)` rule for boil/flicker.
- `hatch()`/`engrave()` GLSL: when 3D is an accent, render it as engraved line shading so it sits inside a 2D/print look.
- Single-stroke Hershey/EMS fonts written by a moving pen (`writtenLength` synced to word timings) for chalk/pen
  lettering in explainers.
- The TREATMENT format: tone rules with an explicit "not slop" list, strict palette, motif list, plate table with owners,
  and numbered revision notes that record each piece of client feedback so agents never regress.
- Deadpan "props as jokes" (forms, stamps, footnotes, out-of-office replies) suits LLM-systems explainers well.
