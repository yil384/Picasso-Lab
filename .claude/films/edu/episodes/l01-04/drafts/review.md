# Review: L01-04 "Temperature and Top-p" (preview r3)

## Verdict
Not ready. The spine is good: the hook (walks / treats) is paid off at 2:33 and at 6:45, every term is defined before
use, the dog odds match the RUN table, and all seven clip captions match clips.json exactly. The faults: the
slide-zoom panels, two bar panels, and three wordings (one lettered, two in the post).

## Must-fix
**M1. Lettering clipped or in the top zone during zooms.** f05760, f06840: "her slide 30/31" sits at y 0-100, and the
title is cut to a stray red "t" at the right edge. f06150, f06930: "top-k" / "top-p" at y 0-115. f02760: "er slide 28"
is cut at the left, and the slide paper hides the bottom of "greedy" ("areedv"). Fix: fade the heading row out before
each zoom, or pin it in screen space at y >= 280. In f02760, move the row into the frame, above the paper.

**M2. The credit fix is unreadable while the wrong credit shows.** f06150: "figure: Hugging Face blog, 2..." / "Fan et
al. used k =" is cut at the right edge and sits at y 1500-1640 (bottom zone), while the slide's "...805.04833 (20"
shows next to the caption. Fix: crop the slide's credit line during zooms, or pin the fix in screen space at y
1150-1270, left-aligned. In f06390 keep it out of the right rail.

**M3. Captions hide lettering.** f09360, f09780: the caption covers the bar labels treats / naps / sticks / baths.
f06840: the caption sits on the axis label P(w|"The") and the slide footer. f05760: it sits on "PICASSO Lab". Fix:
raise the bars baseline on panels 13-14 by about 110 px (labels end above y 1290), and crop slides 30/31 above the
footer or move the zoom up.

**M4. f09780: "+ top-p 0.9: cut" is lettered on top of the red bracket.** The bracket breaks around it and it reads as
a scribble. Fix: draw one clean bracket over the five kept bars with a cut mark between baths and homework, and put the
label above the bracket's right end.

**M5. f10530: "the API reference: change one, not both" drops "generally".** F4 is a soften row. Fix: "change one,
generally not both".

**M6. X post 3/: "a fixed k is wrong half the time" has no FACTS row.** The quantity is invented. Fix with F22: "too
small when many words fit, too big when only a few do".

**M7. X post, main: "Lecture 1 ... in 7 minutes" claims the whole lecture.** This episode is slides 25-34. Fix: "Part 4
of Lecture 1 (slides 25-34) of ...".

## Should-fix
**S1. Rings cut through the neighbouring words.** The "k = 6" ring runs through "sampling" and "this" (f05760, f06390).
The "p=0.92" ring runs over "Nucleus" and the second line (f06840). The 0.7-0.8 and 0.8-1.2 rings cut "Conversational"
and "Writing" (f10530). Fix: tighter, flatter ellipses around the number only.

**S2. f04260: "0.4 × 0.9 = 0.36" crosses the "car" branch line, and the red trace hides "dog".** Fix: move the sum to
x 60-480, y 1050-1150, and draw the trace below the label.

**S3. f01920: the arrow from "every time" covers the 5 of "45%".** End it above the label.

**S4. Subject width.** The knob in f09000 and f09360 is about 33 %; enlarge it to about 60 %. The knob panel (f11130)
and the papers (f11850) run edge to edge, 97-99 %, with the right paper clipped; scale them to about 88 %.

**S5. f06390: slide 30 zoomed out is unreadable on a phone.** The labels are about 10-12 px and the lower half of the
frame is empty. Fix: scale the slide to full width, or hold this view under a second.

**S6. Clarity, n24: "step" is never explained.** Fix: "That was the word after 'The': a flat step. Now the word after
'The car': a sharp one."

**S7. Clarity, jargon for a first-year.**
- n3 "one per drawer": newcomers have not met the clerk. Say "one drawer per dictionary entry".
- n19 "the API's temperature": say "the temperature setting you send with each request".
- n37 / card l3 "how the math is batched": use F8's verified wording, "a busy server computes many requests in one
  batch, and the batch size changes the arithmetic".

**S8. The C6 caption breaks mid-phrase** ("...probability of the | top six tokens"). Re-chunk: "if you use the top six,
| the overall accumulated probability of the top six tokens | only adding up to 0.68."

**S9. The mic tag during C2 (1:13.9-1:20) is not sampled.** At its fixed spot on the pushed slide 28 it would likely
cover "time step," / "token with". Render f02220. If it overlaps, move the tag to the blank lower-left of the tree (x
40-260, y 1000-1220).

**S10. Bookend f12570 (and f00135).** The opaque caption cuts the student off at the lap, and "made-up odds" reads as a
label for "down for code, up for stories". Fix: scale the student group to about 88 %, anchored at the top, and put
"made-up odds" by the 45% / 30%.

**S11. f08220: "flatter" is red, "sharper" black, and the "Flatter" underline is missing.** Match them; underline both.

**S12. X post 1/: "about 200,000 of them" over-generalises.** F10 says "a large dictionary". Fix: "in a large
dictionary, about 200,000".
