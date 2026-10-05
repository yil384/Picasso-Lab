# bishpls/animation-pipeline

- URL: https://github.com/bishpls/animation-pipeline (6 stars on 2026-10-04, created 2026-09-24, 578 commits, active through 2026-10-03)
- License: none declared for the repo (GitHub reports null). THIRD_PARTY.md lists vendored pieces; fonts are OFL; docs/references holds
  ClaudeAnimationBase's guide under its MIT licence.
- Size: about 1.8 GB (TSUZUKU rig PNGs and audio). I cloned blobless with a sparse checkout that excludes tsuzuku art/audio, most
  engine fonts, charkit refs/assets and hello-world assets (95 MB on disk incl. node_modules).
- Releases with videos: OPEN ALL NIGHT (93 s, 1920x1080, 24 fps), WORDS ARE FOSSILS (85.9 s, 1080x1920, 24 fps), HELLO, WORLD! (2:38 + an
  8.6 s "vertical" clip), FRAME PERFECT (Melee machinima). I downloaded the first two and the vertical clip, extracted frames, then deleted the mp4s.

## Provenance (verified)
- 558 of 578 commits end `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>` (author Michael Bishop).
- README: "A base of operations for making films with Claude Code" / "Made with Claude Code" / "five parallel Claude subagents building sections
  against one craft guide". The README itself does not name Opus 5.5; the trailers and TSUZUKU's MAKING-OF do:
  "Opus 5.5, the producer session", "A second Opus 5.5 session, in parallel", "33 subagents (Opus 5.5 and Fable 5.1)",
  "Claude API turns | 5,495: Opus 5.5 5,302, Fable 5.1 193", "Wall clock | about 28.5 hours".
- README: "Influences and prior art: ... John Heibel's PDoomVideo and ClaudeAnimationBase"; CRAFT.md: "It distils three earlier projects
  (EMBER I-III ..., John Heibel's I'm Upping My P(doom) and ClaudeAnimationBase)".
- Not pure code everywhere: songs and narration are ElevenLabs (Music v2.5, TTS with word timestamps); HELLO, WORLD! uses image-model illustrations
  (`tools/imagegen.py`, `tools/gptimage.py`) rigged in code, plus two Seedance 2.5 image-to-video cut-ins; a Gemini pass is used as a (distrusted) critic.
  OPEN ALL NIGHT and WORDS ARE FOSSILS: "use no generative video at all".

## Stack and pipeline
- `engine/` (about 2,200 lines): core.js (easing, kf, spring, hash noise, onTwos, boil, beat clock), riso.js (a print press: shots draw coverage
  into separate Canvas2D ink layers, a WebGL compositor prints them on paper with multiply overprint, halftone or line screens for tints,
  misregistration, ink mottling, letterpress squeeze and deboss), type.js (fontkit glyph outlines, per-glyph kinetic type with variable-font axes),
  studio.js (timeline), render.mjs (headless Chrome, parallel resumable frames, `--sheet/--strip/--stills/--crop/--shots/--clip/--serve/--eval`),
  pop.js (chibi kit), puppet.js (cut-paper puppets), rig.js (Live2D-style mesh rig), moves.js (dance choreography), warp.js, plate.js, edit.js.
- `tools/` (Python): music.py, tts.py (narration + word timestamps), audio_analyze.py (beat grid, seams, cue sheet), lyric_check.py (STT diff),
  edit_audit.py (pacing audit), filmscan.py (pops/jumps over rendered frames), sfx/sfxmix, gemini.py, imagegen/gptimage, chroma.py (green-screen
  keying), rig tools, seedance.py (off by default).
- A project = `index.html` (script order is the film) + `src/` + `assets/cues.json` + `STORYBOARD.md`. One clock: picture, type and SFX read the
  same cue sheet.
- WORDS ARE FOSSILS specifically: `assets/vo/*.mp3` + `*.json` per line with character and word timestamps; `src/words.js` is pure data (each word:
  surface, older forms, a split with glosses, an engraved plate), every stop cued as `[voId, wordIndex, offset]` so the camera arrives when the
  narrator says the word; `src/film.js` is "one shot: a continuous descent through a core sample, then a rush back to the surface";
  `src/picto.js` holds the pictograms; `look.js` sets letterpress (bone stock, ochre and slate line screens, oxblood and black dot screens, squeeze,
  deboss) and 8 period fonts (Alfa Slab One wood type, Cinzel, UnifrakturMaguntia, IM Fell, EB Garamond, Archivo).
- I rendered Fossils locally (needed only puppeteer-core + 8 fonts): about 68 ms/frame on an M2; output matches the release.

## How Claude was guided
- CLAUDE.md (rules) + `.claude/skills/make-film/SKILL.md` (order of operations: frame it with the user, sound first because it is the clock,
  storyboard shot table, look development as board loops before shots, scaffold with slates then one subagent per section file,
  review rounds, sound design, exports) + docs/CRAFT.md (50 KB of method and dated lessons, with the producer's quotes).
- Key rules in CRAFT.md: video models off by default ("EMBER III's Veo take was judged 'painful, embarrassing slop'"); author motion and timing by hand;
  one clock; look at everything (sheets, strips, crops via the Read tool); "Let every shot conclude" with measured minimum holds (>= 0.75 s after a
  payoff, >= 1 s after a punchline, cards >= 1.5 s) enforced by `tools/edit_audit.py`; "Score to picture" for narrative work; "Measure, don't only
  look"; distrust AI critics (Gemini position bias, blind shuffled Borda rankings).
- §4 "Timing: model the viewer" (reads per shot, "fast actions, slow meanings"); §5 animation principles as code (anticipation/overshoot/settle,
  offset parts, avoid twinning, characters on twos, camera and type on ones, exaggerate); §8 "things that make it look generated" (every-frame
  sameness of speed, stacked reads, tiny characters in big empty frames, text labels repeating the lyric, faces that snap, symmetric twin motion,
  gradients that don't belong to the medium, every shot in a different world, Corporate-Memphis figures, synthwave neon cliches).
- §10 (Fossils): verify facts before writing the script and flag myths as myths; trim dead air before the first word; vertical safe area (keep captions
  and key text out of the bottom ~420 px and right ~140 px; 74 px captions read on a phone, 60 px did not); pace the picture to the voice.

## Look (frames I viewed)
- OPEN ALL NIGHT (16:9): a Saul Bass / Catch Me If You Can cut-paper title sequence printed in four riso inks (blue, fluorescent pink, yellow, black):
  bakery awning and neon OPEN sign with a halftone glow, a pink cut-paper girl pointing at a gold constellation, a giant eye whose iris is an
  "ALL IT COSTS" auction dial with "0.014 s", a paper plane over a rooftop sunrise, a girl under a halftoned street-lamp cone looking at a bread
  poster in the rain, a city whose lit windows spell OPEN. Lyrics on Kruger-style black bars with a pink italic accent word. Bold, graphic, confident;
  genuinely designed, the strongest pure-2D graphic look of the four repos. Characters are simple single-ink silhouettes.
- WORDS ARE FOSSILS (9:16): letterpress on bone stock; horizontal strata bands (ochre, slate, oxblood, black) with torn edges, speckle, line-screen hatch;
  engraved pictograms (a window with an eye in it, two black hands breaking a loaf, a flexed arm with a mouse inside, a labyrinth with a ball of red
  thread, a salt mound stamped "MYTH?", a log cabin with "WALDEN, 1854"), italic "fig. N" captions, a bordered caption card that types on, period type
  per stratum; a fossil-ammonite title card. Texture holds at 1:1 (visible halftone and slight misregistration). Calm and elegant, an editorial
  explainer. Weak spots: motion is slow and sparse (a 1.5 s strip shows almost no change), no characters or comedy, and in many frames the lower ~40% of the
  vertical frame is plain paper (the caption zone).
- HELLO, WORLD! (stills + 9:16 clip): polished anime idol illustrations (image-model art rigged in code) and a chibi Clawd troupe on checkerboards.
  The "vertical" clip is a 16:9 frame letterboxed into a 9:16 pink card with big headers.

## Quality
8/10 overall (Open All Night ~8.5 for design; Fossils ~7 for a lovely look but low motion and no comedy).

## What Picasso Lab should borrow
- The narrated-explainer architecture of Fossils: TTS with word timestamps -> each visual stop cued to `[line, wordIndex, offset]`; script as data;
  facts verified before the script; one continuous camera move (descent) instead of cuts.
- A print-press compositor (draw coverage per ink in Canvas2D, composite in a WebGL shader with halftone, misregistration, paper) as the
  "3D/GPU as a render effect" layer over a 2D core.
- CRAFT.md's measured rules: shot-conclusion holds + pacing audit script, the "looks generated" failure list, vertical safe-area numbers, caption size,
  the review loop (sheet per shot, strip per key motion, crop per face), distrust of AI critics.
- The make-film skill's order (sound as clock, storyboard table, look boards before shots, slate animatic, one subagent per section file).
- Sparse checkouts / worktrees for asset-heavy repos.
