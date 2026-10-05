# neelnanda-io/dont-go-quiet-on-me

- URL: https://github.com/neelnanda-io/dont-go-quiet-on-me (3 stars, 1 fork; created 2026-10-04, i.e. today)
- Video: https://youtu.be/xhTMRykVb8I (4:22, 67 shots; not watched here). Reference page:
  https://neelnanda-io.github.io/dont-go-quiet-on-me/ (216 references, each with a still; the stills ship in docs/stills).
- License (gh reports NOASSERTION): README says code MIT (c) Neel Nanda, base kit MIT (c) John Heibel; "The song audio,
  the lyrics and the music video: (c) 2026 Neel Nanda, all rights reserved." Fonts OFL.

## Who/what made it (verified)
- README: "Claude Opus 5.5 wrote the lyrics, made the mix and animated the video. Every frame is drawn by JavaScript
  (p5.js and p5.brush) in headless Chrome, and no image or video models appear in the final cut. Suno v6 generated the
  vocals and band."
- Credits: "Lyrics, animation and mix: Claude Opus 5.5, working in Claude Code"; "Prompt inspiration: Donald Jewkes's
  video prompt for "I'm Upping My P(doom)""; "Animation kit: built on JohnHeibel/ClaudeAnimationBase".
- All 5 commits (gh api) are by Neel Nanda with `Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>`
  and `Claude-Session: https://claude.ai/code/session_01AjgD3NsSncKad1m2EeJoV6`.
- Other models used along the way (from the skills, all as tools not final pixels): LLM judges via OpenRouter, Gemini 3.1
  Pro as a watcher/listener, Nano Banana Pro image frames as look targets only (15 images, $2.24), a Seedance 2.5
  rotoscope test that was abandoned, ElevenLabs sketches.

## Stack
`video/kit/` = fork of ClaudeAnimationBase (p5 2.x WEBGL + p5.brush 2.x, puppeteer-core, ffmpeg), grown to ~9,500 lines:
`src/type.js` (Canvas2D text + song timing + text registry), `src/dgq/` (shoggoth.js puppet with one growth parameter
g 0..5, naturalist.js researcher puppet, props.js, board.js FINAL registry/HUD/mock switches, styles.js riso and
cut-paper post passes), `src/scenes/final_*.js` one file per section, `src/data/dgq_shots.js` (67-shot list),
`song.js` (beats.json + word-aligned lyrics), `figures.js` (real data). Python tools for lyrics/audio QA/judging;
`scripts/figures/` reproduce grokking (1-layer mod-113 transformer trained here), superposition toy model, GPT-2 small
induction heads and logit lens, Qwen2.5-1.5B refusal direction, each with a provenance block.

## Pipeline
Every frame is a pure function of t and the song: beat grid (133.35 BPM) and forced-aligned word times are bundled into
`song.js`, so cuts snap to the beat before a sung word (`at: 'L<n>'`) and hits key off word onsets (`wT(line,/re/)`).
`render.mjs --frames --workers=5` then `--encode --audio=...` (x264 crf 17). M4 Pro: 60-250 ms/frame, 6,288 frames in
10-20 min. QA: `--textcheck` (overlaps, title-safe, min px, contrast, reading time, missing glyphs), Gemini eye on a
640x360 proxy (~26% of flags real), frame-a-second tiles of the encoded MP4, pixel-identical regression in a git
worktree, flashcheck (photosensitivity), avsync. `--style=B|C` re-prints any frame as risograph or cut paper.
Measured here: style A 84 ms, B 989 ms, C 399 ms for one 1280-wide sheet frame.

## How Claude is guided
- `skills/making-research-music-videos/` (12 files, ~2,100 lines): stages with sign-off gates; the brief prompts
  verbatim (Donald Jewkes's: "I don't want you to produce something that is GPT slop. Instead, I'd be more impressed if
  you come up with a coherent style"); video-direction.md, video-production.md, delegation.md (subagent brief
  templates, a 7-fork parallel protocol with file ownership and name prefixes), lessons.md (ranked).
- `skills/making-explainer-videos/` (Manim + ElevenLabs TTS, from an earlier refusal-direction explainer; code not
  included): script in beats, one voice clip per beat, scenes timed to clips, transcribe-back audio QA with two
  transcribers, contact sheet per beat plus full-res text crops, `make_text` 40x oversampling fix for Manim kerning.
- Key direction rules: "find one image that carries the song's idea" (a researcher studying a tiny shoggoth that
  outgrows her); motif procedural with ONE continuous parameter; one material world ("One researcher's field notebook,
  2020 to 2026": graph paper, ink #2A241E, vermilion, indigo, gold; Instrument Serif lyrics, Fraunces titles, Caveat
  marginalia, mono for data); chorus = same composition every time with one motif state; verses = one camera world
  each; a fixed transition grammar (lens iris into choruses, page turn into verses, match cuts); escalating HUD (year
  stamp ticking on sung words, "said out loud" meter); "Scale as numbers, not adjectives"; "Canonical pictures over
  word-matches" (circles for neurons, plummeting loss); "Concrete scenes beat metaphors"; real figures redrawn with
  credit; never invent a tweet. Approval by tapping on still mocks of left-out ideas (57 taps in an evening; 0 of 10
  caption-only proposals tapped). Show the opening ANIMATED in each style before asking for a pick.

## What it looks like (frames viewed)
Viewed: four 12-still contact sheets I tiled from docs/stills (hook/verse 1-2, choruses 1-3, verses 3-6, bridge/final
chorus/end), V5b.jpg at 1280x720, and my own renders at t=58 s in styles A/B/C.
- House look: an editorial-illustration notebook. Cream graph paper with punched holes and a red margin line; flat,
  slightly textured colour with thin dark outlines; a navy many-eyed shoggoth with orange irises and yellow smiley
  masks, drawn with real charm and growing from a toy under a magnifying glass (hook) to a walled fortress (final
  chorus); a small researcher in a mustard cardigan. Big serif lyric type (hero, left) in choruses, karaoke captions
  in verses, a red rubber-stamp year box top-right, a "said out loud" meter, paper title tiny bottom-left.
- Variety of worlds: dark neuron-diagram room with a lamp glow (V1), specimen locket and pocket-watch clock for
  superposition and grokking, a dictionary for SAEs, a blue graph-paper lab, a corkboard, a red-curtain theatre stage
  ("TEST", "REPORT CARD misaligned 0/100"), a cluttered study wall (lasagna recipe, iPod apple, Kyle name tag), a
  kraft-paper crime board with police tape for CoT reading, a stone castle wall, an end card on black.
- Real data figures redrawn as notebook plates: the grokking train/test curves, the mod-113 clock, the superposition
  pentagon, a steering-vector bar chart.
- Candid: it is the most finished Claude-made film I have looked at, and it explains real ML concepts. But it leans on
  text and UI-ish props (chat windows, speech bubbles, cards, meters, gauges) and the people are stiff, flat vector-ish
  figures. Some boards (V3a probe grid, V6 scatter plot, CoT monitor) look like an illustrated slide. The p5.brush
  watercolour boil is barely visible at this size: the look is closer to clean flat illustration than to painting.

## Quality
8/10 for craft and density; 7/10 against Picasso's "no slideshow / no web page" bar (the strongest shots are the
creature shots; the weakest are charts/cards on paper).

## What Picasso Lab should borrow
1. The concept rule: one image that carries the episode's idea, plus a motif with ONE continuous parameter that changes
   state per section (for an LLM-systems episode: a KV cache that fills a room, a GPU that grows a queue).
2. One material world per episode (their field notebook) with a fixed palette, a 3-font type system and a fixed
   transition grammar; verses as camera journeys through one world, not unrelated boards.
3. Real data -> redrawn figure plates with provenance (their scripts/figures + figures.js pattern): our course
   numbers (roofline, KV-cache sizes, qubit fidelities) computed by script, drawn by hand-style code, credited.
4. A text layer that is a first-class, checked layer: `tx()` with roles (lyric >= 40 px, label >= 26 px) and
   `--textcheck` for overlaps/safe area/contrast/reading time. Essential for 9:16 phone captions.
5. Timing from audio: word-level forced alignment of the voiceover into a timing module, cuts snapped to words/beats.
6. Post-pass style variants (riso, cut paper) on the same frames for style shoot-outs, "show the opening animated in
   each style" before the user picks.
7. Approval loop: still mocks of left-out ideas behind `mock('key')` switches, tap to add.
8. Process lessons: resolution independence from day one (one scale constant - critical for 9:16), render exits on page
   errors, frame-a-second tiles of the ENCODED mp4, fresh subagents with written briefs instead of forks.
9. The Manim explainer skill's voiceover QA (two transcribers, word diff) if the channel adds narration.
