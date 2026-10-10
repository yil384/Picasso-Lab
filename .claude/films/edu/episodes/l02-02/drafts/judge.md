# L02-02 "The Gate" - judging drafts A and B

## Scores (1-10)

| | A (tap first) | B (worked example first) |
| --- | --- | --- |
| 1 Hook, first 5 s | 7: three named models + "three-matrix trick" by 5.8 s, a direct "Why would anyone do that?" at 13 s | 6: the puzzle is in n0, but "Follow two numbers... to the answer" promises what they cannot deliver (2 and -1 never lead to two-thirds; the parameter count does) |
| 2 Clarity | 8: matrix multiply -> linear -> activation -> FFN in order; one picture per idea. Weak spots: "vector" (n12) undefined; panel 5 makes water the gradient after panel 3 made it the content | 6: "activation" used in n4, defined only in n8; a stream of 3-digit numbers (n15-n21, n31) on top of the gate idea; "matmuls" lettered on panel 6 |
| 3 Accuracy | 8 (fixes below) | 7: n31 "-0.54, nearly shut" is wrong in spirit (a SiLU gate goes negative: the output flips sign, it is not shut); n15-n21, n31, n44 numbers are not in FACTS (correct by my check: Phi(2)=0.977, sigmoid(-1)=0.269, 3x4096x11,008=135,266,304, but rows must be added); section 1 note quotes a Mistral width "from memory" (not in FACTS: delete) |
| 4 Clips and slides | 9: 7 clips, 33.8 s (8%), each set up and never paraphrased; slides 17/20/21/L03-4 used as briefed, pen fixes sigmoid->SiLU and latency->compute | 9: same 7 clips; the slide-21 scorecard filling row by row with the last row held is the best slide use in either draft |
| 5 Pace | 7: 856 words, 6:51 by the formula, 125 wpm; 51 s over the 6:00 aim | 8: 788 words, 6:22, 124 wpm |
| 6 Craft | 8: every drawing does a job (switch/dimmer, card catalog "re-found a tap already in the drawer", two people = GLU); 17 panels (brief: 12-15) | 6: the "x = 2 / x = -1" cards pinned in a top corner for the whole film act like a corner element and steal frame; panels 11 and 14 are crowded (slide + cards + boards + ghost board + balance); 17 panels |

Neither draft breaks the house rules: no closed model, no drawn real person.

## Winner: A

Clearer story, closer to FACTS; B's best parts graft in cleanly.

## Graft from B (numbered, with line ids)

1. B n24-n25 (the scorecard read row by row: "Cheap forward? Cheap gradient? ReLU: yes, yes. GELU: no, no. SiLU: so-so. ... Healthy gradients? Not ReLU") replaces A n38. It matches slide 21 exactly.
2. B n10's second clause into A n9: "a 1993 follow-up covered ReLU" (F3), so the theorem visibly covers the activation the episode starts with. Add "1993: ReLU too" to A panel 1's card.
3. B n40-n41 (name d_ff, "Three matrices of h by d_ff: 3 h d_ff. Set that equal to 8 h-squared.") before A n45, so the 2/3 is solved on screen, not stated.
4. B n35's opening "Better, but only a little" into A n39.
5. One worked value only, x = -1, on A panels 4/7/8 as small lettered cards: "-1 -> 0" (ReLU), "-1 -> -0.16" (GELU), "-1 -> -0.27" (SiLU), from B n11/n16/n21. Add a RUN row to FACTS (Phi(-1)=0.159, sigmoid(-1)=0.269). Do not adopt the pinned corner cards.
6. B panel 15's tallies "135,266,304 weights (3 boards)" vs "134,217,728 (2 boards)" as a card on A panel 15 (add a RUN row).
7. B's end card: "Lecture 2 and Lecture 3" and Leshno et al. 1993 in the sources.

## Factual fixes needed in A (numbered)

1. n38 "SiLU, in its SwiGLU form, dominates": reads as "much better" (Trap, F28). Superseded by graft 1; if kept, say "is the one modern models use, especially as SwiGLU" (slide 21's row is "Dominant in modern LLMs", i.e. use, not quality).
2. Panel 0 cover letters "about 2/3" under "Llama · Mistral · OLMo": implies all three shrink to two-thirds. Only Llama is cleared (F35). Letter "Llama 7B: about 2/3" or move the names off the squeezed boards.
3. Panel 1 card "Hornik, 1991: one hidden layer, enough units, close to any continuous function" drops "bounded activation" and "on a bounded region" (F2 soften). Add both.
4. n43 "A third one adds half again": say "at the same width 4h" (RUN: 12h^2 vs 8h^2 holds only before the shrink).
5. n44: use F32's wording, "about two operations per token, a multiply and an add", so FLOPs is defined, not just named.
6. n16-n17 blur the weight's gradient with ReLU's own slope. Use F10's wording: "Its slope, the gradient, is one for positive inputs and zero for negative ones."
7. Panel 7 margin "BERT · GPT · GPT-2's code": "first GPT" (F16).
8. n19 "No water ever reaches it": the water is the content since n13. Say "No learning signal ever reaches it, so it never grows" (keeps F13, removes the clash).
9. n12 "widens each vector": "widens each list of h numbers" (term not defined).
10. End card credits Lecture 2 only, but c20 and the worksheet are Lecture 3 (see graft 7).
11. Runtime: cut to about 6:15 with A's own list (n30 optional, n12 lettered only, n43's second sentence), after the grafts add roughly 30 words.
