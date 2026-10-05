# tollens-ai/quality-education  ("Software Quality Theory 101")

- URL: https://github.com/tollens-ai/quality-education  (0 stars; created 2026-09-24; pushed 2026-10-01)
- Licence: code MIT, content CC BY 4.0 (LICENSE-CONTENT), (c) Tollens Ltd. Clawd and other makers' marks excluded.
- 4 episodes out (vertical 1080x1920 animated music videos, ~3 min, posted on X by @yanqingcheng). A domain expert
  (Qing / Yanqing Cheng) checks every claim; the agent is "the content creator".

## Made with (verified)
- README: "Claude designed and wrote every posted film: episode 3's is by Claude Sonnet, which signs it, and episode
  4's by Claude Opus, with three Opus builders drawing parts of it to the same brief." Also: "Episode 2's people
  and places were drawn through Codex by OpenAI's image generation, from the film's own frames, then cut out and
  animated as paper." Songs: MiniMax (ep1), Suno (ep2-4); lyrics "Qing with Claude", ep4 lyrics by gpt-6.1-sol.
- Commit trailers over all 266 commits: 214x "Co-Authored-By: Claude Opus 5.5 (1M context)", 27x "Claude Opus 5.5",
  19x "Claude Sonnet 5.5", 2x "Claude Opus 4.5 (1M context)".
- An earlier ep4 film ("The Green Room", poster in episodes/04-did-you-actually-test-it.jpg) was drawn by Sol (Codex)
  and not posted.

## How Claude is guided
- `CLAUDE.md`: roles (agent creates, expert corrects); bring finished ambitious drafts; ask the expert only about
  claims; polish before she sees it; Qing's craft standard "every 3 seconds, why would they watch the next 3
  seconds? ... why would they SHARE it?"; truth files (CANON.md expert-approved wording with dates; episode files
  with expert notes verbatim); research gotchas.
- Skills in `.claude/skills/`: `write-episode` (treatment + reviewers), `songwriting`, `music-video` (11 steps:
  orient -> hear and measure the record (Gemini listens; word timings from the voice) -> choose world and style
  together -> storyboard every line (one subject, a mime action a stranger follows with sound off) -> build the look
  as a layer first (kit, style layer, lettering, cast sheet, hero environment, hero frame) -> shots in song order
  (parallel builder subagents with a standing brief, ~4 at once) -> watch the whole film (1 fps contact sheets,
  motion per second, 30 fps strips across cuts) -> measure (typo-audit of every word every 0.1 s) -> craft pass at
  full and phone size -> hand-back gate (all notes re-checked, clarity pass, one place to look, one style, motion,
  details, fresh-eyes independent model) -> master + verify -> document + report). It also demands max effort.
- `VIDEO.md` (45 KB): table of every attempt, how it was made, and the expert's verbatim verdict; lessons:
  "One auteur, no committee"; build the look as a layer; "A hand-made look drawn in code is a process, not a
  path" (noise on clean outlines reads as "a child's drawing made in Paint"; draw boxes as overshooting strokes,
  loops that don't close, scribbled fill that spills; opaque shapes; hold fills still and let only outlines boil;
  one `HAND.clumsy` dial); "Where code can't draw it well enough, generate it and animate it as paper" (people drawn
  from code primitives "show the circles"); give the image model the film's own frames or it drifts to glossy
  semi-realism; "Every episode draws its own" + thumbnail comparison; "One place to look" (subject centred, words
  just below, no words that aren't lyrics, mime over text); bar as checks; word timing from the voice.
- Per-style references (`references/style-*.md`): ink-and-gouache, cut-light, pencil-polka, rubber-hose, etc.

## Stack / pipeline
- JavaScript Canvas 2D in headless Chromium; every frame a pure function of song time; `video/lib/render.mjs`
  (stills, `--sheet`, `--video`), `render-parallel.sh`, `strip.sh`, `sheet.sh`, `motion.py` (mean abs frame
  difference per second; lists near-still seconds), `storyboard.py` (phone-size PDF of claims for the expert).
- Per episode renderer folders, e.g. `video/ep04/ball/`: `kit.js` (drawing clock on twos = 12 drawings/s, beats and
  sung words), `ink.js` (boiling brush line, soft form shading, hose limbs, gloves, pie-cut eyes), `rig.js` (blinks,
  bounce on the beat, singing mouths, brows, sweat), `bg.js` (watercolour washes with granulation and dried rims,
  glazes, light pools), `places*.js` (painted places baked once), `type.js`/`lyrics.js` (one lyric place, bouncing
  ball), `tools/text-audit.mjs` (no stray lettering), `typo-audit.mjs` + `typo-report.py`.
- Music analysis in `music/epNN/` (beats.json, lyrics.json aligned per word, align_words.py...); an all-code band and
  singing voice exist (`music/voice`, `music/lib/band`) but posted films use generated songs.

## Rendered locally
- With the repo's own renderer (Playwright from the npx cache), silent: ep01 pier (28.9, 84.3, 140 s), ep02 cutlight
  (20, 60, 100, 140 s), ep03 polka (60, 100, 150 s), ep04 ball (10.6, 40, 63.6, 95, 130, 160 s).
  Frames: frames/tollens-ai__quality-education/ep0N/*.png and the row composites.

## Look (frames viewed)
- ep04 "Press, Stress & Guess" (rubber hose, Opus): the strongest. Painted brick-cellar and theatre backgrounds with
  watercolour washes and light pools, a pink phone with a face, a detective tester with deerstalker and magnifier,
  a strongwoman in stripes, a wind-up robot; bold boiling outlines, Cuphead-ish character design, white gloves,
  pie eyes, a red bouncing ball over chunky cream Corben/Lilita lyric type in a dark band under the picture,
  silhouetted audience foreground. Real charm and comedy.
- ep03 "Pencil Polka" (Sonnet): coloured-pencil doodles on cream paper, hand-printed capitals, dachshunds,
  a dog show ring, scribble fills that spill; adorable, kid-book energy.
- ep01 "The Pier": ink-and-gouache night pier, big marquee "MAKE IT GOOD FOR WHO?" in bulb letters, a huge crowd of
  round-faced people, Clawd on a stage; warm, polished, a little "illustration-stock".
- ep02 "Cut Light": dark stage with neon-green drum kit, stencil grunge type, Clawd band, generated painted people
  (Gran with a phone) cut out as paper over a clinic; most "AI-ish" of the four, and visibly mixed media.

## Quality
- 8/10 (ep04 8-9, ep03 8, ep01 7, ep02 6).

## Borrow
- The whole working method: one auteur, look built as a layer first, character sheets + hero frame before shots,
  builder subagents drawing parts to a standing brief with shared kit and drawing clock, then a hand-back gate.
- The expert-note ledger: attempts table with verbatim verdicts; turn each correction into a principle in the right
  file. Picasso already has `social/x/versions/` - make it the same kind of lessons table.
- The bar as measurable checks: `motion.py` (near-still seconds), per-word typography audit every 0.1 s with phone
  UI safe zones (bottom 400 px, right 140 px lower half), text-audit for stray lettering, thumbnail comparison
  across episodes.
- Drawing rules: outlines boil on twos (3-state cycle), fills held still; hand-made look as a stroke process with
  one clumsiness dial; opaque shapes; camera on ones.
- Generated art only from the film's own frames + concepts, then cut out and animated as paper (fits the lab rule of
  Codex-generated sprites on #00FF00).
- "One place to look": subject centred, caption just below centre, no non-spoken words, mime over text - very
  relevant to a 9:16 explainer.
