# L03-03 judge: script A vs script B

A: 933 words, 7 clips
(45.5 s), est. 7:40 (7:55 at 144 wpm). B: 903 words, 7 clips (43.5 s), est. 7:49.

## Scores

| Criterion | A (story first) | B (worksheet first) |
| --- | --- | --- |
| 1 Hook | 8: F23 wording, "How?", three props as teaser (n1) | 7: sharper paradox, but n0 runs 15 s, then six numbers before any term (n3-n4) |
| 2 Clarity | 8: heads, latent, projection, bracket rule, RoPE, dropout defined; absorption and the RoPE clash explained | 6: "KV heads", "head size", "layers" undefined (n2); latent "just means hidden" (n6); picture after the math (n7) |
| 3 Accuracy | 8: breaks n20 (F11), n3 (F1), n27 (G Llama what-if) | 7: breaks n0 (F22, G "proven"), n4 (G Llama), n10 (F5/F6), n36 (F8) |
| 4 Clips, slides | 9: each clip turns a beat; c5 before n17 explains "loop"; C13 in her voice | 7: n13-n14 put our paraphrase in her mouth ("Her answer: ..."); n17 pre-empts c5; c22 repeats n21 |
| 5 Pace | 7: 150 wpm, on the cap; P9, P10 two ideas | 7: 144 wpm; n35 45 words, two ideas; P9, P10 overloaded; worksheet numbers said twice |
| 6 Craft | 8: map exact; stop said (n10); takeaway + "Next time" ok | 6: picture decorates the math; "Unpacked in the glasses" breaks the map |
| **Total** | **48** | **40** |

**Winner: A.** The picture is the explanation.

## Graft from the loser (B into A)

1. B n15 "The score, how well the new question matches an old name tag, is key times query. The key is W-UK times
   the pouch." Replaces A n13's second sentence.
2. B n16 "In the model, the query is multiplied by W-UK first." After A n15's first sentence: where the glasses stop.
3. B n23 "The score is two parts added: content, through the glasses, and position, from the tags and small turned
   pieces of each head's query." Replaces A n22's last sentence (F12).
4. B n9 "every head opens the same pouch, with its own slice of the unpacking matrices". Into A n8 for "and by every
   head" (F4).
5. B n3's "gives every head its own keys and values". Into A n27 (fix 3).
6. B n27 "More heads, bigger win." Into A n27 before "14, 28 and more than 56".
7. B P6's lettered loop (`for each past token: ...`, glasses term lifted above it). On A P5 during c5.
8. B P10's taped results card. For A n28 (fix 8).

## Fix in the winner (A)

1. n20 (F11: the turn sits between the query side and W^UK, not "between the glasses and the pouch"). Say: "Now
   every pouch is turned by its own angle, and the turn lands between the question and W-UK, the two the glasses
   glued together. Factors may regroup, never swap places."
2. n3 (F1: GQA "lets" groups share; a design, not learned). "Last time, grouped-query attention let groups of heads,
   the parallel copies of attention, share one rack."
3. n27 (G "Llama 3 would save 93%"; F18). "36,864 bytes per token, instead of 524,288 if every head kept its own keys
   and values." Letter "(a what-if)" on P9 at that moment.
4. n2 (term before definition). "every token, a word or a piece of one, carries ..."
5. n7 (four terms, 37 words). Split: "In the model, the pouch is a latent vector: a short hidden summary, learned in
   training. It is called c-KV." / "A learned matrix, W-down, squeezes the token into it. Multiplying by a learned
   matrix is called a projection."
6. n25 ("two heads' worth" is ambiguous: a head has a key and a value). "A group keeps one key and one value, 128
   numbers each: 256. 576 over 256: two and a quarter groups, whatever the number of heads." (F14, F15, C)
7. P9 (two ideas). Split: P9a racks + "512 + 64 = 576" + slide 20 text (n24-n25); P9b her L04 slide 5 alone
   (n26-n27). Keep only the MLA row of the re-lettered table. Merge P6 into P5's end (n18) to stay at 14 panels.
8. P10 (result + her first guess). n28 on the results card; the hedge arrives on n29.
9. Pace (on the cap; grafts add about 45 words). Cut about 80 to land under 900: n1's credit sentence (P0 letters it);
   merge n4+n5 ("This time the clerk packs: multi-head latent attention, from DeepSeek's V2 paper."); n18's "keys and
   values are never computed out" (lettered); n14's "A times B, then times C, ..." (the red brackets show it); n32's
   "So hold it loosely:" (c14 says it). Keep n34b (F29).
10. n35 (F15). "the cache shrinks to two and a quarter groups" becomes "a cache the size of just two and a quarter
    groups"; screen line to match.

B's breaks (keep out of grafts): n0 "lose nothing" (F22: one score 0.7 lower; V3 "comparable"); n4 "DeepSeek's
design: 36,864 bytes" on Llama shapes (G); n10 "so every head can find its key and value in it" (her REC 30:33
reason stated as fact; F6); n36 "Unpacked in the glasses" (F8).
