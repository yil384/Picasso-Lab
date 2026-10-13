# L03-01 judge: script A (story first) vs script B (worked example first)

Final clip list: C1, C11, C12, C15, C23, C27 only. A used three failed clips (C21, C28, C24), B used three (C28, C24,
C25); neither used C15 or C27. Both keep 4 clips as drafted, so both are re-flowed below to 6 clips (32.4 s).

| Criterion | A | B | Why |
| --- | --- | --- | --- |
| Hook (first 5 s, concrete puzzle) | 6 | 8 | A answers "What is 'it'?" at once and saves "wide" for the last 15 s; B flips to "wide" at 0:08 ("one word at the far end decides"), which is the real puzzle. |
| Clarity for a first-year | 8 | 6 | A goes in causal order (question card, score, shares, mix, then her numbers) and explains the analogy (n6). B gives her 0.119/0.881 before scores, queries or keys exist, says "softmax" (n4) a line before defining it, and only names the analogy (n7, n18). Neither says who "her" is. |
| Accuracy (FACTS) | 9 | 8 | A: rows cited, traps avoided; one line without a row (n24). B: n4 ties the threads to her numbers (trap G), n15 says the word "exploding" out loud, P1 draws an attention thread for "wide" (no picture cleared, F2 is meaning only). |
| Her voice and slides | 6 | 6 | Both lose 3 clips. B uses her slide 7 numbers better (n9: the mix with 0.119 / 0.881). |
| Pace | 7 | 8 | Both 632 words, about 5:08. A's P8 (Xavier fix + exploding fix + card) and P9 (knob + bars) each carry two ideas; B gives one idea per panel. |
| Craft | 8 | 7 | A's party (card, badge, parcel) carries every step and the recap, so the joke does the explaining. B's analogy is just a caption. Both keep to the house content rules. |
| **Total /60** | **44** | **43** | |

**Winner: A.** Build on A, take the hook and the d_k section from B, and fix the lines below.

## Grafts into A (lines in order)
- **n1** (B n1 + v0 n2): "The animal. Change one word, 'too wide', and 'it' is the street. Same 'it', same spot: only the other words decide. A model has to work that out from the words alone, with a part called attention. Prof. Yufei Ding's course at UC San Diego starts here." (F1, F2, F4, SL). Then **C15** (2.5 s). New panel P0b is B's P1, but with a red ring/arrow moving to "street", not an attention thread.
- **n4**: keep. Drop C21.
- **n9 + n10**: merge into one line. Drop C28; P6 loses its mic tag.
- **n11** (B n10): "...every query against every key, softmaxed into shares, then used to mix the values. One step is left: a division by the square root of d k, where d k is how many numbers each query and key holds." (F11, G d_k). This replaces "scaled down", so d_k is defined before n14 needs it.
- **n14**: "Why divide? Her slide marks it self study, so here is the short version." (slide 8 title "(Self Study)").
- **n15** (v0 n13): "Variance measures spread. A dot product adds up d k products. If the numbers are independent, with mean zero and variance one, its variance is d k: with 64 numbers, scores spread about 8 times wider. Dividing by the square root of d k brings the spread back to one." (F6, F14, F15). This replaces C24 and drops the early "a head's size" aside.
- **n16** (v0 n15): "...A softmax that is all or nothing hardly moves when nudged, so its gradients, the nudges training runs on, become tiny, and learning stalls." (F16)
- **n20 + C27**: "...mixed by one more matrix. Call a token's numbers going in x, and coming out z." then **C27** (4.8 s; note card "x in, z out, same size"), then "So each token leaves the layer the same size it came in. How big is each head?" then C12 (F20, F22).
- **n21** (B n20): "...so 64 per head. That 64 is the d k we divided by." (F21, F14)
- **n22** (v0 n22, optional): "That's the power, and the bill: ..."
- **n23** (B n22): "So, who is listening to whom? Every token, to every token, in shares that add up to one." (F7). The P14 bookend can still show the ring sliding to "street".
- **Panels**: split A's P8/P9 as B does: variance card on slide 8 (B P9); bars 58 % to about 100 % (B P10); strike "exploding" and write "tiny" while n16 plays (B P11); knob (B P12).
- **Optional** (B n9, if time allows), after n13: "So token one's new vector is 0.119 of the first value plus 0.881 of the second." (F12, F9)

## Lines that must change
- **A n24** "K for keys, V for values": no FACTS row (F25 clears only "Next: the KV cache."). Cut it: "Next: the KV cache."
- **A n14** "Now that divide": no divide has been mentioned yet (n11 says "scaled down"), and d_k is used before it is defined. Fixed by the n11/n14 grafts above.
- **A, all lines**: "her slide" is said before she is named. Fixed in n1.
- **Do not graft** v0 n19 "the new 'it' knows it is a tired animal", n20 "to keep the cost flat", n16 "not a proof", n17 "what state is it in?" or n23 "avoids redoing all that work". None of these has a FACTS row.
- **If any B line is reused**:
  - Cut n4 "How thick is thick?" (it puts numbers on the threads). Use "For real numbers, her slide takes the smallest case: two tokens, each looking at both."
  - Cut n15 "Small gradients, not exploding ones." (trap G; the red pen already makes the fix silently).
  - n11 "Her self-study slide:" leads into failed clips. Use the n15 graft above.
  - Do not say "K-transposed" (never defined). Say "every query against every key".

## Length after grafts
About 675 words, 6 clips (C15, C1, C23, C11, C27, C12 = 32.4 s, about 10 %), 16 panels: about 5:18, inside 4.5-5.5 min.
To get back to the brief's 650 words, cut about 25: n5 "How does it choose?", trim n19 to "Like readers at one banner,
each glass on a different spot, several heads look for different relationships at once.", and trim n3. The four decimals
in n12 are slow to speak, so time the voice before cutting more.
