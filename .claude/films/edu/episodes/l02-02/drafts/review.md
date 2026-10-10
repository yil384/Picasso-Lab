# L02-02 "The Gate" - independent review

Passed: clip captions equal clips.json exactly (C15 "near" is a recognizer slip, usable); quote F29 exact; no CJK, no house-rule hits, no mascot, closed models or Traps; titled cover; logo end card; third-party images covered; main post 265 characters.

## MUST-FIX

1. **P12 (5:12), strings `sc3`.** The red "so-so" over the SiLU column is drawn upside down (it reads "os-os"). Fix: draw it at the same angle as "yes, yes" and "no, no".

2. **P8 (3:35), strings `q`.** "slope ≤ 1/4" sits beside the steep black SiLU curve, where the slope is about 1, so it reads as a claim about SiLU, which is false (F12 is about the sigmoid). Fix: put the label next to the grey sigmoid at its midpoint with a short leader, and keep the `sg` "sigmoid(x)" label visible on the grey curve through n26/n27.

3. **P15 (6:44), strings `cmp`.** The handwritten "compute" correction is tiny and is written over the first letter of "Adopt", unreadable at phone size. The crop also cuts the box's right edge ("original ReLU widt"). Fix: write "compute" at least as large as the slide text, in the clear space above the struck "latency" (after it, not over "Adopt"). Widen the crop or scale the sheet to about 92% of the width so "width" is whole.

4. **P11 / P12 (4:54, 5:12), right safe-zone.** The pen's main targets fall inside the right-rail keep-clear zone in review_guides: slide 20's struck "sigmoid(x2) -> SiLU(x2)" cell and slide 21's SiLU column (the boxed "esp. SwiGLU variants" cell and "so-so"). The X buttons will cover the exact words the voice is pointing at. Fix: zoom or pan each slide so the corrected cell or SiLU column sits left of the zone.

5. **P1 (1:10), strings `hk1`-`hk5`.** The Hornik card is pasted over the ruler drawing (it hides the wavy curve and rulers), and `hk5` "exists ≠ easy to find" runs into "1993: ReLU too" on the same baseline (already touching at "eas"). Fix: move the card into the clear band between the drawing and the caption box (about y 1000-1200), or fade the drawing out. Put `hk4` on its own line under `hk3`.

## SHOULD-FIX

6. **P3 (1:48), strings `gate`.** The caption says "The hand on the tap is the gate", but no "the gate" label is on screen, only "the content" (which also touches the water stream). Fix: letter "the gate" beside the hand when n13 reaches "gate", and move "the content" about 20 px left of the stream.

7. **P6 (2:48), `lsw` / `ldm`.** The bulb cords end in dots that sit on the "a" of each label (it reads "ä switch"). Fix: start the cords below the labels or raise the labels by about 30 px.

8. **P10 (3:52-4:39).** The labels float with no leader lines. "content: x V" sits between the two circles, so it's unclear which person is which. Fix: put "content: x V" directly under the boy's pitcher circle and "gate: SiLU(x W)" beside the girl's valve circle, each with a short red leader. Also add motion: 4:30 and 4:38 are identical.

9. **n39 / cap n39.** "today's models use SiLU, mostly as SwiGLU" overreaches F26 (name only Llama, Mistral, OLMo), and it contradicts n37's Gemma/GeGLU line eight seconds earlier. Fix: "And her last row: the winners today run SiLU, mostly as SwiGLU, like Llama, Mistral and OLMo."

10. **Clarity, SwiGLU's name.** "GLU" and "Swi" are never decoded. Fix n34: "SwiGLU, Swish plus GLU, gives that hand a SiLU: ..."

11. **Clarity, undefined terms.** "token" (n12), "transformer" (n10) and "hidden layer" (n7) come before any definition. Fix n12: "Each token, a word or piece of a word, arrives as h numbers ...". Fix n10: "Inside a transformer, the design behind these models, ...".

12. **Hook payoff, OLMo.** The hook says Llama and OLMo shrink, but only Llama's numbers are paid off. Fix n48, adding: "OLMo's 7B lands on the same 11,008." (F40)

13. **n36 / cap n36.** "as her own caption says" is confusing in a captioned video. Fix: "as the figure on her own slide says."

14. **P0 cover, `strip`.** "CSE 291P · Lecture 2" while the film also uses Lecture 3. Fix: "CSE 291P · Lectures 2-3 · UC San Diego".

15. **cap c6.** A page break leaves "One is just for the gating and the" ending on "the". Fix the split: "One is just for the gating|and the other one is just for the value."

16. **P13 (5:45), mic tag.** The lab drawing fills only about 55% of the width, and the mic tag overlaps its top-right corner. Fix: scale the drawing to about 75% width and set the mic tag clear of it.

17. **P12 (5:12).** The ellipse on the "Healthy gradient" row covers the row label ("simila as") and also takes in GELU's tick. Fix: circle only the ReLU cell "X (0 on all negatives)".

## Post (x_post.md)

18. **Main post.** "Lecture 2 of ..." should read "Lectures 2 and 3 of ..." (still under 280). Every number traces to FACTS.

19. **Thread lengths.** 1/ is 320 characters, 2/ is 289 and 3/ is 288. If the account isn't on long posts, trim 1/ (drop "(Hornik, 1991; a 1993 follow-up covers ReLU)" or move it to 7/) and cut about 10 characters from 2/ and 3/.
