# L01-04 "Temperature and Top-p": judging A and B

Recounted: A 804 words / 7:15 (111 wpm), B 772 / 7:13 (107 wpm), both under 160 and about 14 s over 7:00. Clips: A
7, 38.4 s (8.8 %); B 7, 46.9 s (10.8 %).

| Criterion | A (story first) | B (worked examples first) |
| --- | --- | --- |
| 1 Hook | 7: concrete sentence, but the puzzle completes about 6 s in and the cover sits still 28 s | 8: the work-order line by about 5 s, cover 21 s; "same question" over a sentence completion |
| 2 Clarity | 8: one sentence carries every method; temperature used at n21, defined at n33 | 7: API knobs and the seed's "draw" before sampling; "reasoning paths" undefined; number-dense |
| 3 Accuracy | 9: no Trap broken; soft lines (fixes 1-3) | 9: no Trap broken; n22 "after The car" is in no FACTS row |
| 4 Her voice | 7: C5 (a question) and C8 (a verdict) explain nothing | 9: C6 + C7 carry the top-k argument; n30 echoes C9's "divide" |
| 5 Pace | 8: P12 runs 48 s | 7: a 20-s knob detour before the first method; P5, P6 38 s each |
| 6 Craft | 8: subjects 80-96 % wide; full-frame homework gag; P2, P12 overloaded | 6: P1, P5, P6 hold three ideas each; small top-right dogs in P11/P12 read as stickers |
| **Total** | **47** | **46** |

**Winner: A.** The spine is the hard part: one made-up sentence asked twice, greedy and beam ruled out because
neither rolls a die, the case solved by 2:45, every method tried on the same dog. B's strengths graft cleanly.

## Graft from B
1. C6 + C7 replace C5 and C8 (B's P7: n21, c6, n22, c7, n23); the pen writes "0.68" and "0.99" on her words.
2. B n10 into A n13: "A sentence's odds are its words' odds, multiplied. 0.5 times 0.4: the nice woman scores 0.2."
3. B n14 as the set-up for C4: "Better, but still no guarantee. And it has a habit."
4. Pen on her words: in C2 ring "0.5" on "nice", "0.4" on "woman" (no retrace); in C11 the boxes fill on
   "result 2" / "result 3".
5. Split A's P12 as B does. "Turn it down" (n36-n38) ends on the F8 card, worded as B n34 ("One honest limit. Even
   at temperature 0, ..."), right after "back to greedy". Then "turn it up" (n39, C9, n40-n42). P14 keeps only
   n46-n47.
6. B P9's sum in A's P10: "45 + 30 + 12 + 8 = 95%", one term per tick, then "≥ 90%".
7. Cover's second bubble "treats." (the two tallest bars); bookend tags "walks 45%" / "treats 30%" + "made-up odds";
   n22 "Walks one time, treats the next."
8. B P1's clipboard: "My dog loves" / "5444 · 6446 · 19620" (F35), no extra voice.
9. A n42: "Her slides pair the two knobs, and so did our dog." On P13, B's red bracket "both?" over the two
   column heads.

## Fixes for the synthesis
1. n21 "Left alone, the API's temperature dial sits at 1: every reply is a fresh draw." uses an undefined term.
   Fix: "Left alone, the API's temperature, a dial for how random the draw is, sits at 1: every reply is a fresh
   draw." (F2, F3)
2. n11 "The dog loves walks, every time. So greedy can't explain our two answers." clashes with F8 (n48). Fix: "On
   paper, greedy says walks every time. Our two answers need something else."
3. n50 "...and they won't all agree." overclaims (F32). Fix: "...and they don't always agree." Keep "Her toy
   example:" before C11 (Trap).
4. n26 "Here, six words cover only 0.68 of the odds. Here, 0.99." would repeat C6/C7. Fix: "That was a flat step.
   Now a sharp one." (F24). Not B's "after The car".
5. n0 completes after 5 s. Fix: "Ask a model to finish 'My dog loves...' twice. You can get two answers." Move n3 to
   the cover strip and end card; cover at most 15 s.
6. n13 "Together: 0.2." does not say multiply: graft 2.
7. P2 packs softmax, odds, decoding and greedy into 32 s: letter "decoding" and "greedy" only after the bars settle
   and the homework ring holds.
8. P8 keeps A's "figure: Hugging Face blog, 2020 · Fan et al. used k = 10" (B drops k = 10; Trap F20).
9. Runtime after grafts 1 and 5: about 7:23. Trim to 7:00: n3 off the voice, A's cut items 2-3 (n19's middle
   sentence, n46), and n15 to "Beam search keeps the best two paths at every fork: two hikers, two lanterns."
10. Listen to C2 and C11 before captioning (normalised text).
11. Every bars panel keeps "made-up odds"; percentages only at T = 1, 0.2 and 2 (F29).
