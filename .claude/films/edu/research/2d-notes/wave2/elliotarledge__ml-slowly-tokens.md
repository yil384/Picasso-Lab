# Elliot Arledge - "ML, slowly" course, #2 "Tokens" (unreleased; rendered here from source)

- Source: https://github.com/Infatoshi/ai-video `projects/tokens/` (+ downhill, meaning, who-is-it, learning-to-write). Provenance as the other two (README credits Claude Code / Claude Opus 5.5; commit trailer). Not uploaded anywhere per AGENTS.md ("v1 done 2026-09-28 ... not uploaded").
- VIEWED: rendered 12 native 9:16 stills locally with the repo's own renderer (`bun scripts/render.ts stills --portrait`, headless Chrome) at 12-222 s: frames2/elliotarledge-ml-slowly-tokens/ (sheet.jpg, f_0030.00.jpg etc.). No audio heard.

## Why it exists (the most useful lesson in the cluster)
- AGENTS.md: "Beginners said the first two were too fast ... Measured: Next Token sings 169 words/min and cuts every 0.39 s ... Chasing the Roofline 103 words/min, a cut every 0.87 s."
- Pace rules the course gate enforces (tools/gate/gate.py, profile "course"): <= 95 sung words/min (<= 120 in the busiest 30 s); <= 6 hard changes/min ("cuts plus anything that pops in within a frame; fade or draw things in over >= 0.3 s"); median shot >= 8 s; "Something always moves gently; nothing frozen > 3 s"; "The chorus is the episode's one definition: the same words every time over the same picture; each return adds one layer. Concrete example first, then the rule."; "One number on screen at a time"; "No concept-word slams"; "4-8 instrumental bars after each new idea, the picture finishing it with no new text."; 3.5-4.5 min.
- Shot plan for Tokens: "The whole song is one continuous scene. Every idea lives at a station on one sheet of paper and stays there; the camera flies between stations ... and floats slowly on a circle between moves, so nothing freezes and nothing cuts."

## What I see
- Same riso paper/halftone/misregistration finish as Next Token, HUD "ML, SLOWLY 2/5", sung line top centre with pink lead words, a two-line source footnote at the bottom ("split and numbers: the Llama 3.1 tokenizer (meta-llama/...)").
- The question as a row of letter tiles (wobbly printed outlines); r's in pink numbered 1 2 3; a crossed arrow "it never got the letters" into a box labelled "the model / Llama 3.1 8B Instruct"; tiles fuse into 8 chunks, each flips to its id (4438 1690 436 ...); a BPE merge counter on a line of the song ("merge 29: t + o -> to, 8 times in the song"); a 10x10 grid of 100 answers, "67 of 100 said 2".
- In 9:16, 50-60% of most frames is empty paper; the content is a row of tiles and a rounded rectangle. It reads as a well-printed diagram.

## Good / slide-like
- Good: the pacing doctrine (measurable gates), one continuous sheet with stations, chorus = definition repeated over the same picture, honest source lines, real data.
- Slide-like: slowing down was done by removing almost everything - no character, no set, no camera depth visible in stills, boxes-and-arrows. Exactly the "diagram boxes" look our user rejects. The fast version had the charm; the slow version has the clarity. Neither has both.

## Borrow
- Numbers for our gate: <= ~95-130 words/min of VO, <= 6 hard changes/min, median shot >= 8 s, nothing frozen > 3 s, hold 2-4 s of picture with no new text after each idea.
- One sheet/one world with stations and a travelling camera = our desk-miniature table. Keep the world dense and alive while the *ideas* are slow.
