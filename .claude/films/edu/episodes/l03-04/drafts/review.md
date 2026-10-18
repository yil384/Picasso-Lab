# L03-04 "The Residual Highway" - independent review (2026-10-17)

Read: sheet_a/sheet_b, SCRIPT, FACTS, strings, clips, vo_lines, check.json, x_post, slides 22-31, preview/report.json.
All 7 clip captions equal clips.json text exactly (C8 and C9 split by "|" only), and all 7 check as exact.
No politics, no countries, no assistant names anywhere. Every number traces to a FACTS row.

## Must-fix

1. **n32 contradicts itself (narration, post 6/).** "It can never stretch the signal. With mHC, the gain stays near
   1.6." A sharp student asks how something that never stretches gets a gain of 1.6. (1.6 is a measured number. F27 is
   about the mixing matrix alone.) Re-voice n32 only:
   > "So stack a hundred layers, and the total mix still obeys the rule, so the mixing itself can't blow up. Measured, the gain stays near 1.6, instead of 3,000."

   Caption n32 to match: `So stack a hundred layers,|and the total mix still obeys the rule,|so the mixing itself can't blow up.|Measured, the gain stays near 1.6, instead of 3,000.`
   strings `st` -> "a hundred layers: the mix stays a mix"; `16` -> "measured gain: near 1.6 (not 3,000)".
   In x_post 6/, replace "so the mix can never stretch the signal: the gain stays near 1.6" with "so the mixing itself
   can't blow up: the measured gain stays near 1.6 instead of 3,000".
2. **p4, strings `ex` "the real reason: it tests better".** F8 says "her own words only", and "tests better" is not
   her wording (it also reads like "scores higher on tests"). Use `"her slide: experiments show it works better"`.
3. **p15, caption over the drawing.** The four-clones drawing reaches the caption band: "Same token, a richer picture of
   itself," sits on the chairs and table. Scale the drawing to about 85% and lift it so it ends above y about 1330. It
   should still fill about 75% of the width.
4. **preview/report.json logs a 404 (`Failed to load resource`).** Something in the lesson page never loads. It could be
   the planned cover drawing `line_cover_l03_04`, which was never made, or the line_round_table / line_knob_board /
   line_mic reuse. Find the missing URL and confirm that no panel is missing a drawing. On the sheet I see no
   meeting picture on p15 and no knob board on p16.

## Should-fix

1. **Terms used before they are defined.** These are screen-only fixes, so nothing needs re-voicing:
   - "token" (n8): `ln` -> "LayerNorm: one token (a word piece), all its numbers".
   - "feature" (n7): `bn` -> "BatchNorm: one feature (one number slot), across the batch".
   - "warm-up" (n14): `wu` -> "big gradients at the start: needs a warm-up (small steps first)".
   - "loss" (n26): `fs` -> "1.8 times faster to the same loss (error), in tokens".
   - "matrix" (n20 says "matrix multiplications"; n30 says "doubly stochastic matrix"): on p13, show `ds` as
     "the pour table is a matrix: a column per jug, a row per pot". Put it in the header block, not on the jugs.
2. **p5, slide 24 printout is only about 62% of the width.** Its top line and the LayerNorm formula are too small to
   read on a phone. Scale it to 85% of the width. The left column alone has room.
3. **p8, slide 25 has no red pen.** During n16, underline "Only earlier Transformer models (e.g., Bert) used Post-LN."
   During n15/n17, circle "x_l + f(LayerNorm(x_l))".
4. **p4, slide 23 strip.** The italic line is light grey and tiny, so the red underline marks words you can't read.
   Enlarge the strip to the full width (about 1.4x). The first p4 tile is also mostly empty: show the tailor drawing
   from p3, or the slide strip larger, under the text.
5. **p2, p3 and p13: captions touch the drawings.** On p2 the caption box covers the whisperers' shoes. On p3 and p13
   it touches the feet and the shelf. Leave a gap of at least 30 px (lift the drawing or trim its bottom margin).
6. **p14, slide 30.** The two cut-outs overlap, and the matrix digits are unreadable at phone size. Fine as texture, but
   keep the red box on "Row sums ... Column sums ..." and make that box larger. That is the only part the viewer
   needs.
7. **p12, a stray red "1" under the header.** If this is the 1.1 count-up starting, give it its final position and size
   from the first frame. Otherwise remove it.
8. **n33 "27B parameters".** Confirm by ear that the voice says "twenty-seven billion", not "twenty-seven B". If it
   doesn't, change the text to "27 billion" and re-voice. While re-voicing, "parameters" also needs a 3-word gloss
   ("27 billion learned numbers").
9. **n28 "When DeepSeek measured...".** Trap 13 allows this, but the channel's rule is to stay clear of
   anything that leads into country talk. If n32 is re-voiced anyway, consider "When the mHC team measured plain
   hyper-connections..." and drop "(DeepSeek)" from `xie`. Optional.
10. **Post.**
    - "in 8 minutes": the film is 7:34, so say "in under 8 minutes".
    - Check that the course title "(LLM System Optimization)" matches the official title. FACTS does not cover it.
    - Thread 1/: "layer 100's gradient" is her example number. That is fine, as F2 phrases it.
11. **p16 strings `t3` "lanes are fine".** This overclaims. Use "lanes are safe if rows and columns sum to 1".

Analogy check: the road as the residual stream, a town as a block, a toll gate as normalization (Post-LN on the road,
Pre-/Peri-LN on the ramp) and four lanes as hyper-connections all map correctly. The jugs and pots map correctly too
(column = a jug's pour, row = a pot's fill). The hook "what if four / keep from blowing up" is paid off at 3,000 vs
1.6. Cover frame 0 is finished, and the safe zones are respected throughout.

**Verdict:** A clear, well-sourced and well-crafted episode. Fix the 1.6 contradiction (one re-voiced line), the
"tests better" wording, the p15 overlap and the 404, then ship.
