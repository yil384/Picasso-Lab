# sanjuhs/opus-5.5-film-experiment-with-animation (bonus find: one source, 16:9 AND 9:16 cuts)

- URL: https://github.com/sanjuhs/opus-5.5-film-experiment-with-animation (found by web search while looking for the
  shadow-theatre post; outside the assigned list but directly on topic: how a vertical cut is made from one script).
- gh api (2026-10-04): 0 stars, 0 forks, created 2026-09-26, 1 commit.
- Made with: README "Made as an experiment with Claude Opus 5.5."; the single commit ends with
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- 2:22 explainer, 30 fps, OpenAI TTS narration, numpy music/SFX, canvas JS visuals, Playwright -> ffmpeg.
  Frames: frames2/sanjuhs-vietnam-explainer/vertical_sheet.jpg (every 9 s), landscape_sheet.jpg.

## How the vertical cut is made (src/core.js, src/main.js)
- `?vertical` flips `W, H` to 1080x1920; `V(a, b)` picks the landscape or vertical value (103 `V(` calls in scenes.js);
  `stage(dx, dy, fn)` translates landscape-designed artwork into the tall frame (used once).
- Subtitles: size `V(36, 44)` px, wrap width `V(1300, 900)`, line height `V(48, 58)`, last baseline at `V(1000, H - 430)`
  = y 1490 in vertical, white on a rounded black box at 62% opacity.
- Chapter tag at `y = V(52, 150)`, year badge at `y = V(44, 140)` (pushed down ~100 px for the phone's top bar); a
  1945-1975 timeline at `y = H - 330` = 1590 in vertical (inside the bottom overlay zone of Shorts/Reels).
- One chapter name is shortened for vertical (' & THE FALL OF SAIGON' -> ' & SAIGON'): long titles must be rewritten,
  not shrunk.

## What it looks like
Dark map-and-card infographic: a sunset palm-tree title card, a red/blue map of Vietnam with labels, "THE DOMINO THEORY"
with literal domino tiles, a bar chart of US troops, "THE COST 58,220", stamped texts. In 9:16 the side panels stack
above the map; the top quarter carries title/chapter/year, the map sits mid-frame, the subtitle box sits at ~y 1450-1500,
and the lower ~20% holds only the timeline. Exactly the "animated dashboard" look the user rejects.

## Quality (candid): 4.5/10
Competent, clear and fully vertical, but generic: cards, charts, a ticker, 0.6 s crossfades between scenes
(`T.crossfade` in timings.js), a slideshow by construction.

## Borrow (only the mechanics)
- One source, two cuts via a `V(landscape, vertical)` picker and a vertical query flag; rewrite long strings for vertical.
- Subtitles 44 px / 900 px wrap / baseline y ~1490 at 1080x1920 as a lower bound for a narrated cut.
## Avoid
- The look (dashboard, map labels, bar charts), crossfade scene changes, putting a meaningful element (the timeline) at
  y 1590.
