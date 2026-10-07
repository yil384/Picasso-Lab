# L01-03 review 2 (independent, on r7)

Looked at: r7 sheets s0-s3, all 26 r7 full frames and guides_r7, plus fresh snaps in
`~/picasso-work/daily/L01-03/review2_frames` (680, 1900, 2900, 3300, 4600, 5400, 8450, 10230, 10480, 11199, 11420,
11700, 12200). Checked: every TTS word list against vo_lines.json (all 42 match), every caption against vo_lines /
clips.json (all equal; no caption page over 2 rows), every on-screen number against FACTS, item timings against panel
cuts, x_post.md lengths.

## First-review items
- M1 partly: replies 2/, 4/, 6/, 7/ now carry the conditions. The main post lost F8's verb (see N5), and the credits reply is too long (N4).
- M2 fixed (f9948: `pr5` gone).
- M3 fixed: `hookc` 36, `alone` 40, `cq3` 34 (handwriting); `vsent`, `same`, `cnt0`, `lim3` are 30 px sans, 2 px under the asked 32 but readable at f2577, f3519, f9294, f7839.
- M4 partly (f5808, f5400): fixed are (a) the wash replacing the underline, (c) the "every" underline dropped, (d) no zoom. Still open, and still a must-fix:
  - (b) Both rings are flatter and narrower than their numbers: the arcs cross the "1" and "M" of 131M and the "8" and "M" of 819M, so both numbers still read as struck.
  - Fix: replace the two rings with yellow washes, one per number (about w 190, h 58), at the same times. Or cut the clipping into two one-line clippings 120 px apart and ring each with r ≈ [100, 38].
  - Also: the clipping runs x ≈ 5-1075. Use w 1000 -> 960.
- M5 partly:
  - p3 fixed: the tag clears the fingers at f2577.
  - p10 fixed: the tag sits on the slide's top margin at f9387.
  - p8 partly: at f7428 the tag now sits on the cabinet's top rail. The mic-tag exception allows this.
  - p7 not fixed, as the producer chose. The new problem it causes is S-1 below.
- M6 fixed (f0, f90, f639, f12300): the small cabinet clears the caption, there is no push and no text above y 260.
- M7 fixed (f9294, f9387): "chat" sits above the line and the caret sits in the gap, clear of the tag. The 28 px size is S-5 below.
- M8 fixed (f1560): the whole "keeps growing" stands in the Era column from 49.3 s.
- M9 fixed (f9948).
- M10 fixed (n2 at 13.0 s, F39 row; caption at f639).
- S1 fixed (n27). S3 fixed (n23, f6891). S4 fixed (n12, n13, f4098). S6 fixed (n37). S7 fixed (n9, f2900). S10 fixed (f12390, post). S11 fixed (f9294; the unvoiced underline is gone). The c4 break is fixed (f1779).
- S5 partly (f11328, f11541): the signs, n39 and the label edges are done, but the signs sit in a white smudge (S-3).
- S8 partly (f4600, f4932): at most 3 labels now. The ribbon got smaller (w 500, about 45 % of the width), and the caption still sits on the coil (S-2).
- S9: p9 fixed (f8349); p7 not done, as stated.

## New must-fix
**N1. p14 `tot5` flashes half-written (f11199).**
- Dropping n38 left it at 372.69 s, and the panel cuts at 373.41. The last frame shows "5 questions: $0.03412", cut off mid-number.
- Fix: delete `tot5` from p14. p15 shows $0.034125 at 374.7 s and n39 says "3.4 cents". Update SCRIPT beat 14.

**N2. p13, her slide 5 (lecture 2): the red pen crosses the digits** (f10809; the stroke starts under "tokens" at f10480).
- The ring on 0.175 (`r [52,30]`) cuts through the "0" and the "5" and touches the line above.
- The ring on $0.0455 (`r [92,36]`) runs through the "$", so it reads "S0.0455".
- Fix: 0.175 ring r [74, 28], centred on the digits; $0.0455 ring r [104, 36] (it still ends before the slide edge at x ≈ 1049).

**N3. p4, slide 22: the long underline under "A 128k-vocab model can "remember" ... 3x the" grazes the next line** (f3519, f4098).
- It slices the ascenders of "space in a 32k-vocab model.", so that line looks struck. This is the same defect as M4(a).
- Fix: pen y 664 -> 659 (sl:px), lw 4 -> 3. Or drop the underline: the struck "3x" and the card carry the point.

**N4. x_post.md: the credits reply is 436 characters (444 if X links incompetech.com).** The limit is 280.
- Fix: split it into two replies:
  - (a) "After Prof. Yufei Ding's ... computed by us." (257)
  - (b) the Music line plus the synthetic-voice and clips lines (186).

**N5. x_post.md main post: "almost 700 million parameters (input table, width 4,096)" has no verb.**
- It can read as the table's size, which is about 819 million. F8 says the growth adds 688 million to the input table alone.
- Paragraph 1: "Grow a model's dictionary from 32,000 entries to 200,000: its input table alone gains almost 700 million parameters (width 4,096), all untrained. Why?"
- Paragraph 2: drop " (LLM System Optimization)".
- The post is then 264 characters.

## New should-fix
**S-1. p7 / C7 (f6435): the mic tag and the clipboard label read as one red block.**
- "Prof. Ding · lecture 1" sits 55 px above "the output layer", in the same red script, and three ticks poke out of the tag ("lecture 1✓").
- Fix: move `ckout` to ["clerk", 0.56, 0.262] (the lower half of the clipboard) in ink, not red. Drop the ticks at row 0.1696, cols 0.7451, 0.8551 and 0.9514 (they sit under the tag).

**S-2. p5 ribbon (f4932): the caption sits on the floor coil, and the ink runs to y ≈ 1470 and into the rail.**
- The drawing is about 2.3:1 tall, so it cannot be both wider and clear of the caption.
- Fix: w 430 at xy [690, 815], so the ink ends near y 1300; the labels already fill the left half.

**S-3. p15 (f11328, f11541): the `gt`/`lt` signs' paper patch erases the pillar foot, leaving a white smudge in the drawing.**
- Fix: patch 0. Move the sign below the base, at ["bal", 0.5, 0.7865, 0, 190] (y ≈ 1255, between the base and the caption).

**S-4. The hook's second half lands at 6.1-7.3 s** (n0 ends at 4.97, then a 1.13 s gap). The rule wants the whole hook in the first 5 s.
- Fix: start n0 at 0.2 s and n1 at n0.end + 0.35. "before it has learned a thing" then ends at about 5.6 s.

**S-5. p10 `chat` is 28 px** (f9294, about 10 pt on a phone), and it is the slide's one correction.
- Fix: px 36, same anchor.

**S-6. p14 (f11172): the ringed three strips and the hand sit in the right rail** (x 745-1020, down to y 835). That is where X's buttons sit.
- Fix: strips w 1040 -> 880 at xy [480, 800], ring r [115, 150].

**S-7. p4 cards (f3519, f4098): the slide's footer peeks out as a clipped "UC Sa" left of the card, with "22" to its right.**
- Fix: both card rects x 100-980 -> 30-1050.

**S-8. p11 (f9948): the paper's line ends show as stray hash marks between the paper edge (x 62) and the price card (x 105).**
- Fix: price card rect x0 120 -> 50.
