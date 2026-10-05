# kuhnhomeuk-cell/procedural-film (topic -> 30 s vertical film, reference: life of a monarch butterfly)

- URL: https://github.com/kuhnhomeuk-cell/procedural-film  (author Dean Kuhn)
- gh api (2026-10-04): 487 stars, 55 forks, MIT, created 2026-09-17, 19 commits (last 2026-09-24), release v1.0.0.
- Reference film watched here: examples/butterfly-life/exports/butterfly-life-phone.mp4 (720x1280 phone transcode,
  24 fps, 32.0 s, with audio). Source of the film is in the repo (17 scene files, 35,086 lines of scene code).

## Made with (evidence)
- README: "Requirements ... An agent that runs skills and dispatches parallel subagents, for example Claude Code";
  install by symlinking into `~/.claude/skills/`. "Expect a long run: one agent per shot writes a scene file of 1000+
  lines, then critic waves review every shot, so a film spends a large share of a usage plan."
- No model named in README/SKILL.md; no Co-Authored-By trailers. NOT verified as Opus 5.5.
- The look is copied from Kevin Ngo's "The life of a fruit fly" (x.com/kevin_t_ngo/status/2099858454043349342; the
  repo's docs/reference-analysis.md says "posted 15 Sep 2026, 633K views" and "The author describes the piece as one HTML
  file in which Claude Opus 5 drew every frame with JavaScript" - Opus 5, not 5.5).

## Format and pipeline
- Vertical 1080x1920, 24 fps, 17 shots of 1-3 s, 32 s, 120 bpm, every boundary on the beat grid; all hard cuts (one
  0.125 s flash) with MATCH CUTS on shared shapes (egg 02->03 and 16->17, the J, the chrysalis 06->07->08, the hanging
  adult 09->10->11), push-ins (11: 40x into wing scales; 16: 47x snap onto the egg), pull-backs (03 egg->leaf; 13 leaf ->
  plant -> meadow -> continent). Shared-geometry tables in the storyboard so match-cut shapes sit on the same pixels.
- Two alternating plates: warm "illustrated" (cream paper, diagonal stripes, ink outline, directional hatching, flat
  muted colour, construction lines) and cool "schematic" (navy blueprint, lavender double outlines, hex lattices,
  glow nuclei, guide circles). "The schematic shots explain what is happening inside; the illustrated shots show the life."
- Zero assets: every pixel in vanilla canvas JS, score synthesized in Web Audio; one self-contained HTML player + MP4s.
- Process: research (web search -> 2-4 sources) -> art bible with exact px line weights and palette -> storyboard (8
  subsections per shot) -> timeline -> one subagent per shot -> music cues -> critic waves on contact sheets (critics
  MEASURE geometry in px against the art bible; P1/P2 fix waves; determinism spot-check by hashing frames).
- `check.cjs` gate (6 checks) includes determinism, no Math.random, and a SAFE-AREA check on the rendered text
  (commit 01a2d7b "measure drawn text against the safe area on the rendered frame").
- Later additions: photo-doodle mode (rembg cut-outs + doodles), retro NES mode, a playable platformer.

## What it learned about 9:16 (art bible section 1, verbatim numbers)
- "YouTube Shorts draws its own interface over the video. The title and channel row covers roughly the bottom 380 px,
  the button column covers roughly x 950 to 1080 from y 1000 down, and the top bar covers roughly the top 180 px."
- "Anything the viewer must read (the subject, a match-cut shape, a glyph that carries meaning, the wordmark) sits inside
  x 60 to 940 and y 220 to 1540. Backgrounds ... run full bleed."
- "The safe area is non-negotiable ... If a composition collides with it, move the scenery - never the must-read content."
- "Compose for the height, never crop a square. Hanging, climbing, falling and rising subjects use the vertical axis.
  The frame centre line x = 540 is the default axis for the subject. Large subjects fill 60 to 90 percent of the frame
  width so they read on a phone."
- The reference was 1080x1080: "compositions must be re-thought for a tall frame, not cropped."
- Wordmark moved from bottom-right ("on Shorts that corner sits under the button column") to centred x 540, baseline
  y 1470, 44 px.
- Text: drawn mode has NO text except the final wordmark ("No text appears in any schematic shot"; "Measurement is shown
  with brackets, tick scales and arc annotations, never with numbers"). Photo-doodle mode: text 42-58 px at 1080
  (one sound word up to 80), "One or two text elements per shot, never more", "Nothing important below 40 px",
  "Text sits in the paper space above or beside the object", lettering revealed ~14 letters/s.
- Critic test: "Start with the whole film on one sheet ... --scale 0.25. A shot that fails to read at that size is a P1 -
  the fix is composition, not more detail." Photo-doodle critic: "With the words removed, does the frame still say what
  is happening?"
- Loudness: master normalised to about -14 LUFS for the feed ("a score that passes both checks can still land near
  -20 LUFS, which is half the loudness of everything else in a feed").
- Cadence: measured the reference "drawn on twos at 24 fps"; house style re-seeds grain at 12 fps.

## What it looks like (frames: frames2/kuhnhomeuk-procedural-film/butterfly_sheet_a.jpg, full_trio.jpg, crop_wing.jpg, full_*.jpg)
- 0 s: a monarch, wings open, fills ~85% of the width on a milkweed head; cream/yellow diagonal stripes; a magenta ring
  and a blue protractor arc with tick marks over it; ink-hatched leaves at the bottom. At full res the wing has fine
  directional hatching inside the orange cells and white dots on black borders; paper grain everywhere.
- 2-3 s: navy blueprint egg drawn with a double lavender outline, a white star nucleus, small instrument glyphs.
- 6-7 s: a milkweed stalk running the full height with a magnifier circle on the caterpillar (uses the tall frame).
- 10-11 s: caterpillar in J-hang under a hatched wood branch, then a jade chrysalis with a plumb line and ruler ticks.
- 13-15 s: chrysalis under a sun arc that ticks round (time passing), leaf below; 20-21 s push into scale mosaic.
- 26-27 s: a vintage map of North America with migration paths, then a column of hundreds of monarchs rising over hatched
  hills and pines with a blue attention ring on one.
- 28-29 s: oyamel fir trunks at night hung with clustered butterflies, moon-phase tally across the top. 31 s: loops to
  the blueprint egg with the "monarch" wordmark.

## Quality (candid): 8.5/10 (look), 6/10 as an explainer
The best-crafted vertical 2D piece in this cluster: dense, warm, real hatching texture, uses the tall frame on purpose,
match cuts make 17 hard cuts feel like one line of thought. But it explains by montage only: no words, no argument, no
character, no comedy. Cost is very high (17 subagents x 1000-2000 lines + critic waves).

## Borrow
- The two-plate system mapped to our channel: warm illustrated "life" shots vs cool blueprint "inside the machine" shots
  (a GPU die, a KV cache, a qubit) cut against each other with match cuts on shared geometry.
- The art-bible discipline: exact px line weights at 1080 width, palette by act, hatch spacing, safe-area numbers, and a
  gate that measures rendered text against them.
- Critic at 0.25 scale on one sheet; "with the words removed, does the frame still say what is happening?"
- -14 LUFS delivery; twos for characters, 24 fps for camera/overlays, 12 fps boil.
## Avoid
- Wordless montage for a course explainer (we need an argument and a host); the per-shot hard-cut grammar if we want
  one-take carries; the token cost of one-agent-per-shot for every episode.
