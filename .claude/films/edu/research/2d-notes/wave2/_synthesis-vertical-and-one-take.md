# Synthesis: what a 9:16 2D explainer needs, as these projects learned it (cluster: vertical and one-take)

Sources: ishallwin20/ClaudeAnimationBase (Instagram reels, Opus 5.5), kuhnhomeuk-cell/procedural-film (YouTube Shorts),
feitangyuan/onetake (16:9 only, continuity method), x4b47x shadow theatre (9:16, Opus 5.5), masahirochaen twin paradox
(1:1 + a letterboxed Shorts repack, Opus 5.5), sanjuhs Vietnam explainer (16:9 + 9:16 from one source, Opus 5.5).
All numbers are at 1080x1920 and are quoted from the projects; nothing below was measured on X or Douyin.

## 1. Safe areas (what each project wrote down)
| platform | covered by app UI | must-read box | source |
|---|---|---|---|
| Instagram Reels | top ~420, bottom ~420 (1500-1920), button column x > 930 from y ~1000-1750 | y 420-1500, x < 930 | fork's core.js `SAFE`, CLAUDE.md |
| YouTube Shorts | top ~180, bottom ~380, button column x 950-1080 from y 1000 down | x 60-940, y 220-1540 | procedural-film art bible 1.1 |
| both at once | | x 60-930, y 420-1500 (870 x 1080) | intersection |
- X and Douyin overlays were not measured by anyone here. Measure them ourselves (phone screenshots of a grid test card
  on both apps) before fixing our band; until then the intersection box is the conservative choice.
- Backgrounds, scenery, grain, guide geometry run full bleed; only must-read things obey the box. "If a composition
  collides with it, move the scenery - never the must-read content." (procedural-film)
- Enforce it in code: the fork's `caption()` clamps its whole block into SAFE; procedural-film's gate measures drawn
  text on the RENDERED frame and fails the build. A literal-y lint alone missed computed positions.
- Corners: procedural-film moved the reference's bottom-right wordmark to centre x 540, y 1470 because that corner sits
  under the button column.

## 2. Caption sizes (1080 px wide canvas)
- Story captions (no voice): 56-84 px, hook up to 104 px, max line 800 px with auto-shrink (`maxW`), line height 1.18x,
  a fat ink stroke (22% of size) so it reads over any picture, 1-3 lines, centred at x ~0.47 W (nudged left of the
  button column), lines pop in 0.1 s apart (fork, Permanent Marker).
- Narration subtitles: 44 px, wrap 900 px, last baseline y ~1490, white on a 62% black box (sanjuhs; 36 px in its 16:9 cut).
- Doodle/label text: 42-58 px, one shouted word up to 80; "Nothing important below 40 px"; "One or two text elements per
  shot, never more"; text "sits in the paper space above or beside the object", never over it; ~14 letters/s reveal
  (procedural-film photo-doodle).
- A hanging caption sign of ~60 px serif lines (x4b47x, estimated) and pinned torn-paper cards (masahirochaen) show
  captions can be objects in the world rather than a subtitle bar.
- Long strings are rewritten for vertical, not shrunk (sanjuhs: "& THE FALL OF SAIGON" -> "& SAIGON").
- CJK sizes were not measured in this cluster.

## 3. Composition rules
- "Compose for the height, never crop a square" (procedural-film). The failure mode is visible in the masahirochaen
  Shorts repack: a square film letterboxed on a blurred copy with a title band, so its own captions stay square-video
  size and the top/bottom bands are spent on a permanent title.
- Subject on the centre line x = 540, filling 60-90% of the width "so they read on a phone" (procedural-film).
  The onetake 16:9 rule "small elements, big ground, 70 % white" does not transfer to phone-vertical.
- Use the vertical axis: hanging, climbing, falling, rising subjects; a full-height stalk; a pull-back that reveals a
  mountain above the subject; comparisons stacked top/bottom (light-clock rows, stacked panels).
- Fork layout that worked: ground line at y ~1400-1420 so characters stand just above the bottom band, sky/peak in the
  top 420, captions placed at different heights per beat (y 500-1000) next to what they name.
- Frame 0 is a finished picture: the hook caption already up, one simple subject on a plain background, no fade or
  iris in (fork; checked with `--stills=0`). End on a full card with no fade-out so a pause or loop still shows it.
- Review at phone size: one contact sheet of the whole film at 0.25 scale; "A shot that fails to read at that size is a
  P1 - the fix is composition, not more detail"; and "With the words removed, does the frame still say what is
  happening?" (procedural-film).
- Delivery: about -14 LUFS (procedural-film); also render a silent copy for platform music (fork `--audio=none`).

## 4. One-take vs cuts
- onetake: carry something across every seam and MEASURE it (continuity score < 0.5 fails); vary shot length >= 4x;
  keep ~a third dead still; camera = log-zoom keys, lead the subject ~0.1 s on sineInOut, whip to a pre-keyed landing on
  expoInOut, a two-sine hand that is zero in holds, seeded shake on landings, a far parallax layer, screen-space anchor
  for deep zooms, shutter motion blur for anything > 80 px/frame, a framing guard so the subject never leaves frame.
- fork: one set per act with a carrying world-space camera inside it, and each seam designed (brush wipe in the set's
  colour, a dusk iris that becomes a lamp-niche arch, an eye-shaped iris) - 4-6 seams in 42-54 s.
- procedural-film: 17 hard cuts in 32 s made coherent by match cuts on shared-geometry tables (same pixels across the
  cut) and two alternating plates (illustrated life / blueprint inside).
- x4b47x: a locked proscenium is one take for free, but a minute of it is static.
- masahirochaen: hard cuts between scenes, saved by material and an ending that rhymes with the opening.
