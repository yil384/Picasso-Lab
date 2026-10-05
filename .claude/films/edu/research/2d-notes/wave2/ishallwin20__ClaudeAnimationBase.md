# ishallwin20/ClaudeAnimationBase (vertical fork of JohnHeibel/ClaudeAnimationBase)

- URL: https://github.com/ishallwin20/ClaudeAnimationBase (fork; parent JohnHeibel/ClaudeAnimationBase, 761 stars)
- gh api (2026-10-04): 0 stars, 0 forks, created 2026-09-25, pushed 2026-10-04. 16 commits ahead of upstream, 0 behind.
- Owner's use: Instagram reels for Rishi Katha picture books (rishikatha.com, @therishikatha): comedy reels on `reel/*`
  branches, captioned explainer ads on `ad/*` branches (5 ad + 5 reel branches).

## Made with (verified)
- Every one of the 16 fork commits (author "shalvin") ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
  (read from `gh api repos/JohnHeibel/ClaudeAnimationBase/compare/main...ishallwin20:ClaudeAnimationBase:main`).
- Upstream README: "All test videos were generated with Opus 5.5 on xhigh reasoning in Claude Code."

## Exactly what changed for vertical (diff vs upstream main; full patch in repos2/ishallwin20_vertical.diff)
1. `src/config.js`: `PROJECT` gains `w, h`; default set to `w: 1080, h: 1920` ("This project is a 9:16 Instagram reel").
2. `src/core.js`: `const W = 1920, H = 1080` -> `const W = PROJECT.w || 1920, H = PROJECT.h || 1080`.
3. `src/core.js`: new `SAFE = { top: 420*H/1920, bottom: 1500*H/1920, right: 930*W/1080 }`, with the comment: the top
   (status bar, "Reels" header, camera icon) and bottom (username, caption, audio) are covered, "and the like/comment/share
   column covers the right edge from about y 1000 to 1750".
4. `src/core.js`: new `caption(txt, y, age, {life, size})`: screen-space reel caption, default size 66 px, line height
   1.18 x size, lines pop in 0.1 s apart, hold, fade over the last 0.18 s; cream fill on a thick ink stroke
   (`sw: .22` = stroke width 22% of size), rotation -0.025 rad, x = 0.47 W (centred slightly left of the button column),
   `maxW` 800 px; y is CLAMPED so the whole block stays between SAFE.top and SAFE.bottom.
5. `src/core.js` `drawLetters()`: `maxW` (shrink a line that is too wide) and `sw` (stroke width) options; plus
   `picture(img, x, y, w, h, {rot, pop, alpha, r, shadow})` for real images (book covers, logo) on the lettering layer,
   images held in `PICS` as data URIs so the canvas stays untainted; `setup()` waits for `PROJECT.fonts` and `PICS`.
6. `src/core.js` `setup()`: the output canvas takes W x H and `aspectRatio = W/H` instead of a fixed 16:9.
7. `studio.html`: `#out` was `aspect-ratio: 16 / 9; width: min(100%, 1280px)`; now `width: auto; max-height: 85vh` so
   a tall canvas fits the preview; extra Google fonts (Marcellus, Poppins) for end cards.
8. `render.mjs`: `--encode` falls back to `PROJECT.audio` like `--clip`; `--audio=none` renders a silent copy (music is
   added inside Instagram).
9. `ANIMATION_GUIDE.md`: documents `caption()` ("On a 9:16 reel Instagram's own UI covers the top ~420 px, the bottom
   ~420 px and the button column on the right ... Keep every read that carries the story in that band too"), `picture()`,
   and a new "Sound effects" section (tools/sfx.mjs, a Node synth with whoosh/thud/plink/..., cue list from scene constants).
10. New `CLAUDE.md` "Reel rules (from what worked and what didn't)":
    - "9:16, 1080x1920. Captions and every story read sit inside Instagram's safe band: y 420-1500, left of x 930."
    - "Frame 0 is a finished picture: the hook caption is already up ..., one simple subject on a plain background, no
      fade or iris in." (checked with `--stills=0`)
    - Ads "end on the full call-to-action card (no fade out)".
    - "No voiceover by default: captions carry the explanation, a synthesized SFX track sits under it ..., and music is
      added on Instagram, so always render a `--audio=none` copy too."
    - Write the platform caption too: keyword question in the first ~125 characters, 12-15 hashtags.
- Everything else in the diff is new characters (Bappa/Ganesha, Shiva, Parvati, Nandi, Kamadeva, ...; ~3,500 lines) and
  brand assets. Nothing in the medium rules (no 3D, boil, Disney principles) was changed.

## What the vertical explainer looks like (rendered here from branch ad/1-book1-bull, 42 s, 24 fps, bpm 100)
Frames: frames2/ishallwin20-ClaudeAnimationBase/bull_sheet_a.jpg, bull_sheet_b.jpg, safe_pair.jpg (Instagram band drawn
over full-res stills), crop_face0.jpg. Render cost here: 0.19-1.2 s/frame.
- Frame 0: "WHY DOES SHAILPUTRI / RIDE A BULL?" (70 px cream + 104 px marigold, Permanent Marker with a fat ink stroke)
  over a chibi goddess on a white bull, blue mountain behind, cream snow. Everything that matters is inside the red
  safe box; the top 420 px is just sky/mountain peak and the bottom 420 px is empty snow. The ground line is y ~1400-1420.
- The pull-back (camera keyframes zoom 1 -> 0.56 in world space) reveals the mountain while "SHAIL = mountain",
  "PUTRI = daughter" pop in at different heights (y 600 and 1000), a heart floats to the peak: words and picture land
  together.
- "STRENGTH / STABILITY / STEADFASTNESS" stack up one per proof (boulder bursts on his head, gale bends pines and flags,
  snow piles on him overnight). This is the strongest beat: a list built by three acted gags, the caption grows as a
  tally.
- Seams are designed: snow-coloured brush wipe, a dusk iris that becomes the arch of a lamp niche (match cut), nine
  niches lighting one by one, an orange brush wipe to the end card with the real book covers (picture()).
- Look: flat fills with a single tapered ink outline and grain; much flatter and more "children's-book vector" than the
  upstream watercolour demo. Clean and readable on a phone, charming faces, but the backgrounds are simple shapes.

## Quality (candid): 6.5/10
Readable, well-timed, genuinely explains a "why" in 42 s with no voice. Weaknesses: captions do most of the explaining
in places (it is caption-led, not picture-led), the flat vector look is close to generic kids' app art, and the camera
is mostly a single slow push/pull per set.

## Borrow for Picasso Lab
- The whole vertical delta is ~40 lines: W/H from config, SAFE band, a `caption()` that clamps itself into the band,
  `maxW` auto-shrink, preview that fits a tall canvas, a silent render. Copy it into our three.js/q5 kit verbatim in
  spirit (our band must be measured for X and Douyin, see synthesis note).
- "Frame 0 is a finished picture with the hook caption already up" (no fade-in, because the feed shows frame 0).
- Captions as a tally that grows with each acted proof (STRENGTH / STABILITY / STEADFASTNESS).
- Per-video branches with STORYBOARD.md holding "reads" with times, and the SFX cue list copying the scene's constants.
- End on a full card with no fade-out so a pause/loop still shows the call to action.

## Avoid
- Letting captions carry the argument; the upstream guide's "no text" rule was relaxed here and it shows in places.
- The flat clip-art finish; keep the upstream paper/brush texture stack if we use this kit.
