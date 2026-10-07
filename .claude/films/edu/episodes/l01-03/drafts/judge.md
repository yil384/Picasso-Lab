# L01-03 script judgement: A (story first) vs B (worked example first)

Both drafts quote all 7 of their clips exactly, and every clip is "exact" or "near". Neither hits a hard trap. Both plan
about 6:00, and both admit they come to about 6:40 on real TTS takes.

## Scores (1-10)
| Criterion | A | B | Note |
| --- | --- | --- | --- |
| Hook | 7 | 8 | B's n1 "Where do they come from?" is one concrete puzzle, and n18 closes it in the same words. A's payoff "That's the hook." is meta. |
| Clarity | 7 | 5 | A names the embedding matrix and defines a cache (the post office keeps a copy). B never says "embedding", and plays C13 before a cache is explained. Neither defines "width". |
| Accuracy | 8 | 7 | A slips on tone and bounds. B's slips are on screen (the slide-20 Strategy column, the embedding footnote). |
| Voice, slides | 8 | 7 | A's C1 sits on the glued tile, and A puts a flap over slide 20. B's C11 is the best bridge in either draft, but its C13 comes too early. |
| Pace | 7 | 5 | Worksheet voice: A 113 words and about 14 numbers. B 153 words and about 20 numbers ("$0.0175, $0.0042, $0.0217", "$0.034125"). |
| Craft | 7 | 7 | A: the post-office sign gag, the tick cascade, the dust. But A tilts a balance that has no tilted cut, crowds beat 11, and leaves the clerk idle in P15. B: a better bookend, but a code-drawn weight (beat 6). |
| **Total** | **44** | **39** | |

## Winner: A

## Graft from B
1. **The hook loop.** B n1 "Where do they come from?" replaces A n1's second sentence. In A n19, drop "That's the hook." and add B n18 "That's where they come from: one long strip for every new drawer."
2. **C11 as the bridge (B beat 12).** It goes after A n30, with the pen arrow off slide 24 to "cost analysis ->". To stay at 7 clips, drop C3 (A's own first cut).
3. **Name retrieval.** B n35's first sentence, "Retrieval systems cut documents by tokens." (F20), goes on slide 24 as the pen underlines "Split documents by tokens". A n36 then opens "Or send less: retrieval."
4. **Frame the slide-22 claim.** Take B n9's framing (see accuracy 4).
5. **Bound the tenth.** B n33's "On this price list" goes into A n35 (F30).
6. **The balance (B beat 17).** Instead of A beat 14's tilt, the pen writes ">" and later rewrites it "<".
7. **The bookend (B beat 18).** Replace A P15 with the cover cabinet: three labels and one ringed drawer. B n38's "paid for three times" folds into A n39, which keeps the smarter half.
8. **Two worksheet panels (B P11, P12).** `line_paper`, then `line_receipt`, each full frame.
9. **B n20's tag "The same two numbers, now as work."** goes on A n22.

## Accuracy problems
1. **A n25.** "Not quite dust-free", right after C9, reads as "she is wrong" (Trap). Fix (F12): "One honest limit. A 2024 study still found under-trained entries in every model it tested: typically 0.1 to 1 percent of the vocabulary."
2. **A n35.** The tenth has no bound, and her clip says "their" price. Fix (F30): open with "On this price list, cached input costs a tenth."
3. **A n24.** "A drawer nobody opens" overstates F11. Fix: "A drawer that's hardly ever opened gathers dust." (F11: "seen less often in training")
4. [redacted 2026-10-07: this line used an example in a language other than English (the user's rule)]
5. **A beat 4(a).** The pen strikes "thinking", which is not a FACTS erratum. Fix: underline it and write the margin note "more meaning per step" (F14).
6. **B beat 2.** Slide 20 is taped whole, so the Strategy column is on screen ("The Omni-Model", "Extreme compression..."), and none of it is in FACTS. Fix: A's flap over the column.
7. **B beat 16.** The note "(not in the worksheet)" is wrong: the worksheet asks for the embeddings and only leaves their cost out. "Embed" also collides with tonight's embedding rows. Fix: drop the note. If it stays, use F33's "Embedding the paper once adds about $0.0002", marked "left out by the worksheet's answer".
8. **B, C13 before n33.** Her clip about the cache plays before the viewer knows what a cache is. Fix: A's order (n34, then C13, then n35).
9. **Both, "width" and "input table" (A n15/n19, B n13/n17).** Neither term is defined. Fix (F5): "Every entry gets its own row of numbers. The row's length is the model's width, its hidden size. At a width of 4,096, that is 4,096 numbers per entry." Then: "Together the rows make the embedding matrix, the table at the model's input."
10. **Both, the output layer (A n20, B n19).** It is not named before C7's "last layer". Fix (F10): "Second, the output layer, the model's last step. For every token it writes, the model scores every entry in its vocabulary."
11. **A n9, B n8.** These re-explain the context window, which L01-02 already defined. Fix (F15): "Fewer tokens per page: more pages fit in the context window."

## Running order (about 6:00; about 600 words; clips C4, C1, C7, C9, C11, C13, C14c, 44.6 s, 12 %)
1. 0:00 **Cover**, `line_cabinet_tower`. The red card "+ almost 700 million parameters? (width 4,096 · input table only)" is up by 0:02. Voice: B n0, B n1, A n2 trimmed ("That dictionary is the vocabulary: last episode's card catalogue, one drawer per entry."), A n3.
2. 0:24 **Slide 20**, with a flap over the Strategy column. The pen adds rings, the 128,256 note and "o200k_base". Voice: A n4, n5.
3. 0:38 **The question**, `line_balance`, with slide 21 lettered under it. Voice: C4, A n6.
4. 0:54 **More meaning per token**, `line_glue_tiles` (7 tiles become 1). Voice: A n7, n8, C1, n9 (fix 11).
5. 1:22 **Slide 22**. The pen underlines "thinking", strikes "3x" and "1000" and adds the tile rows. Voice: fix 4, then A n12-n13 joined.
6. 1:52 **A strip in every drawer**, `line_drawer_ribbon`, ticks 1 to 4,096. Voice: A n14, fix 9.
7. 2:14 **Slide 23 payoff**. The pen rings 131M and 819M and writes a red "+ 688 million"; the cover's "?" gets a tick. Voice: A n17, A n18, A n19 trimmed, B n18.
8. 2:38 **The clerk**, `line_clerk_ladder`, tick cascade. Voice: fix 10, A n21, C7, A n22 with B's tag.
9. 3:08 **The dusty drawer**, `line_dusty_drawer`, with the Land & Bartolo card. Voice: A n23, n24 (fix 3), C9, n25 (fix 1).
10. 3:37 **The post office**, `line_postal_scale`. The pen strikes "weight" on the sign and writes "tokens". Voice: A n26, A n27 without its questions.
11. 3:53 **Slide 24**. The pen adds "chat", the tick, the code strike and "~900 on o200k_base", and underlines "Split documents by tokens". Voice: A n28 (its measured figures in pen only), A n29, A n30, B n35's first sentence, C11.
12. 4:18 **The worksheet**, `line_paper` full frame, with the setup card and "the prices on the course worksheet". Voice: A n31, n32.
13. 4:33 **Mailed five times**, `line_receipt`, "$0.1085" ringed. Voice: A n33.
14. 4:41 **Keep a copy**, the L02 slide 5 (b2) crop. The pen fixes the "$" typo and rings "$0.0455"; a grey note reads "minutes to hours". Voice: A n34, C13, A n35 (fix 2).
15. 5:00 **Three strips**, `line_scissors_strips`, cropped to fill the width (the drawing is landscape). Voice: "Or send less: retrieval.", then A n36, n37.
16. 5:14 **Which wins?** `line_balance` with $0.0455 vs $0.034125. The ">" becomes "<" at 6 chunks ($0.04725). Voice: C14c, A n38.
17. 5:25 **Bookend**, `line_cabinet_tower`: three labels, one ringed drawer, "Next: Temperature and Top-p". Voice: A n39 (with n40 folded in), A n41.
18. 5:52 **Logo end card**.

If the takes run long, cut in this order: A n5 down to "Vocabularies keep growing." (L01-02 ended on this trend); A n22's figures (the card shows them).
