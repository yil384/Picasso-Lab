# Elliot Arledge - "Next Token" (how an LLM writes, music video) + its vertical hook Short

- Source: https://github.com/Infatoshi/ai-video `projects/next-token/` (same repo/provenance as Chasing the Roofline: README "Made with Claude Code (Claude Opus 5.5)", commit trailer Co-Authored-By: Claude Opus 5.5).
- YouTube: https://youtu.be/OK-Rf8VqfBQ (170 s, 16:9; 67 views 2026-10-04); hook Short https://youtu.be/JgXY8wtrp90 (20 s, native 1080x1920 layout; 74 views).
- VIEWED: downloaded both with yt-dlp; 42 frames at 1/4 s + full frames + 10 Short frames: frames2/elliotarledge-nexttoken/ (sheet1, sheet2, short_sheet, full_36).

## What I see
- Risograph print look, and it is the most "printed object" look in this whole cluster: off-white paper with fibre, fluorescent pink + riso blue + black, every frame separated into three inks and halftoned (8 px cells, pink 15 deg, blue 75 deg, black 45 deg), each plate ~1.6 px out of register, new registration on every cut (SPEC "Print"). 3D objects are flat-shaded and printed as halftone with constant-width black outlines; backgrounds never black.
- Concept carriers: the model is a building - a tower of 32 floor slabs ("32 FLOORS", "43 x 4,096"), the residual stream a light shaft, tokens are printed tiles with leading-space dots ("·strawberry 73700"), the KV cache a shelf that keeps growing ("RECOMPUTED: 0"), sampling is a big pink/blue die that tumbles and lands on "2" (69.7%), temperature a dial "T = 0.2 SAFE / BET", attention arcs as pink bridges over the token row, 32 head heat-maps as a wall of small printed charts, roofline as a printed ramp ("16.06 GB", "1,805.5 tok/s at batch 100 - measured").
- Real data: a recorded Llama 3.1 8B run answering the strawberry question (the 2 won a 69.7% roll); numbers marked "measured" vs "computed".
- Typography: Archivo 900 slams ("CHUNKS", "AGAIN", "GUESS"), Plex Mono data everywhere in the margins (a texture of real token ids).
- Vertical Short: recomposed for 9:16, not cropped: "WHAT IT SEES" over stacked id tiles, giant "straw berry" type, the tower filling the height, the die huge, end card "NEXT TOKEN / There are 2 r's ... The dice said 2 (69.7%). The answer was 3 (30.3%)" with a giant overprinted "23".

## Narration / pacing
- Sung lyric (174 BPM drum and bass), karaoke line at top centre, token-strip HUD at the bottom accumulating the answer. Author's measurement: 169 sung words/min, a cut every 0.39 s (440 cuts in 170 s). Beginners replied it was too fast -> led to "ML, slowly".

## Good / slide-like
- Good: the riso post-process turns 3D into print; real data; a recurring prop (die) and set (tower); the vertical cut is natively composed; numbers become huge graphic objects. Charm comes from density + print texture + the die gag.
- Weak: far too fast to learn from; frames are crowded with HUD/mono numbers ("busy dashboard" risk at a glance); no character with a face.

## Borrow
- The print pipeline: ink separation + halftone at angles + misregistration + paper fibre, re-seeded per cut; "small type must be solid ink"; flat 3D with outline. A strong 2D-print finish for code-rendered scenes that is not generic glow.
- Colour semantics: pink = the thing being taught right now, blue = the data it acts on, ink = structure. Keep it identical across episodes.
- Recurring physical props for abstract steps (die = sampling, shelf = KV cache, tower = layers).
