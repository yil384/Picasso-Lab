# L03-01 "Attention: Who Is Listening to Whom" - fact brief

CSE 291P (Prof. Yufei Ding, UC San Diego), Lecture 3 "Transformer Model Architecture Variants (2)", slides 5-10
(recording 09:21-18:21). Checked 2026-10-13 by the producer at the primary sources below (paper text read on arxiv.org;
the 2017 Google blog post and its example image read on research.google; numbers computed with
`~/picasso-work/daily/L03-01/scripts/attn_numbers.py`, output in section C).
Nothing goes on screen, into the voice or into the post unless a row below clears it, in its safe wording.

## A. Sources

| Key | Citation | Where read |
| --- | --- | --- |
| VAS17 | Vaswani, Shazeer, Parmar, Uszkoreit, Jones, Gomez, Kaiser, Polosukhin, "Attention Is All You Need", NeurIPS 2017, arXiv:1706.03762 (v7, 2 Aug 2023) | arxiv.org/html/1706.03762v7: sec. 3.2.1 (eq. 1, softmax(QKᵀ/√d_k)V; "We suspect that for large values of d_k, the dot products grow large in magnitude, pushing the softmax function into regions where it has extremely small gradients"; the footnote (no. 4 in the PDF): if the components of q and k are independent with mean 0 and variance 1, q·k has mean 0 and variance d_k); sec. 3.2.2 (h = 8 heads, d_k = d_v = d_model/h = 64, MultiHead = Concat(head_1..head_h)Wᴼ, "allows the model to jointly attend to information from different representation subspaces at different positions"); sec. 3.1 (d_model = 512); Table 1 (self-attention O(n²·d) per layer); Figure 2 |
| GBLOG | Jakob Uszkoreit, "Transformer: A Novel Neural Network Architecture for Language Understanding", Google Research blog, 31 Aug 2017 | research.google/blog/transformer-a-novel-neural-network-architecture-for-language-understanding/ ; its example image: "The animal didn't cross the street because it was too tired." / "... because it was too wide."; text: "It is obvious to most that in the first sentence pair "it" refers to the animal, and in the second to the street." |
| JAL18 | Jay Alammar, "The Illustrated Transformer", 27 June 2018, CC BY-NC-SA 4.0 | jalammar.github.io/illustrated-transformer/ : "The animal didn't cross the street because it was too tired"; the attention picture is from the Tensor2Tensor notebook (a trained Transformer); caption "As we encode the word "it", one attention head is focusing most on "the animal", while another is focusing on "tired""; "With multi-headed attention, we maintain separate Q/K/V weight matrices for each head resulting in different Q/K/V matrices." |
| SL | Her slides L03 5-10 | course/L03.pdf (pages 5-10), course/L03.txt |
| REC | Her lecture recording L03, 09:21-18:21 | course/L03.transcript.md, clips in clips.json (checked by two recognizers) |
| C | Computed, section C | `attn_numbers.py` |

## B. Facts

| # | Claim (as the slide or lecture puts it) | Verified | Safe EN wording | Status |
| --- | --- | --- | --- | --- |
| F1 | "The animal didn't cross the street because it was too tired": "it" = the animal | GBLOG (image + text); JAL18; SL 6 | "The animal didn't cross the street because it was too tired. What is 'it'? The animal." | ok |
| F2 | Change "tired" to "wide" and "it" = the street | GBLOG (image + text: "in the second to the street") | "Change one word, 'too wide', and 'it' is the street." Credit in the post: the pair is from Google's 2017 Transformer blog post. | ok |
| F3 | Slide 6: encoding "it", attention runs most to "The animal" | SL 6; JAL18 (Tensor2Tensor visualization of a trained Transformer, layer 5) | "In one trained model, one attention head reading 'it' draws its strongest lines to 'the animal'." The threads on screen are redrawn after her slide's picture, thick vs thin only: no weights are claimed. | ok (qualitative) |
| F4 | The sentence is cut into tokens (words or pieces of words: her slide 6 shows "didn", "'", "t", "tire", "d"); "it" is related to every token, itself included; attention aggregates information from other tokens; that is how the other words decide what "it" means | REC (C1); VAS17 3.2 (each position attends to all positions); SL 6 | "The sentence is cut into tokens, words or pieces of words, and 'it' draws a thread to every token in the sentence." "'it' pulls a little information out of every token." "'it' listens to every token and takes a share from each: that is how the other words decide what 'it' means." | ok |
| F5 | Q, K, V: three projections of each token, by three learned matrices (Wᵠ, Wᴷ, Wⱽ) | SL 7; VAS17 3.2.2 (learned projections) | "Each token is turned into three vectors by three learned matrices: a query, a key and a value." The question / name tag / parcel picture is our analogy, said as an analogy. | ok |
| F6 | Score = dot product of a query with a key (inner product), "the similarity" | VAS17 3.2.1; REC (C5) | "The score is a dot product: multiply the two lists number by number and add it all up. It is big when they point the same way." | ok |
| F7 | Softmax turns a row of scores into weights that sum to 1 | VAS17 eq. 1; SL 7; REC (C4) | "Softmax turns the scores into shares that add up to one." | ok |
| F8 | Toy example on the bars panel (also: "In our toy sentence, the new 'it' comes out mostly 'animal'": 58 percent, F8): scaled scores the -1, animal 2, cross -0.5, street 0.5, tired 1 -> the 3%, animal 58%, cross 5%, street 13%, tired 21% | C (computed) | "Toy numbers: 'animal' gets 58 percent, 'tired' 21, 'street' 13, the rest a few percent." Always labelled toy numbers. | ok (computed; invented scores) |
| F9 | Slide 7: softmax(QKᵀ) for a 2x2 case: [[0.119, 0.881], [0.182, 0.818]]; each row sums to 1 | SL 7; C (0.119 + 0.881 = 1.000; 0.182 + 0.818 = 1.000) | "Row one: 0.119 and 0.881. Row two: 0.182 and 0.818. Each row adds up to one." | ok |
| F10 | (recomputation) The slide does not show the inputs; softmax depends only on score gaps: row 1 = a gap of 2.0, row 2 = a gap of 1.5 | C (ln(0.881/0.119) = 2.002, softmax([0, 2]) = [0.1192, 0.8808]; ln(0.818/0.182) = 1.503, softmax([0, 1.5]) = [0.1824, 0.8176]) | "Softmax only sees gaps: 0.881 means the second score was 2 higher than the first." | ok (computed) |
| F11 | The whole recipe: softmax(QKᵀ/√d_k)V | VAS17 eq. 1; SL 7 | lettered as on the paper: softmax(QKᵀ / √dₖ) V | ok |
| F12 | Weighted mix of values: the output for a token = its weights times the values, summed | VAS17 3.2.1 ("a weighted sum of the values"); REC (C6) | "Then 'it' blends every token's value in those shares." | ok |
| F13 | d_k = 3 in her 2-token example (after the projection each token has 3 numbers) | REC 12:24-12:32 ("dk equals 3 here"); SL 7 (3-column Q) | not said (not needed) | drop |
| F14 | Var(q_i,m) = Var(k_j,m) = 1 "with initializations like Xavier"; Var(QKᵀ) ≈ d_k; std ≈ √d_k | VAS17 footnote: an assumption (independent, mean 0, variance 1), not a property of Xavier init; C (simulated: d_k = 64: variance 63.75, std 7.98; d_k = 128: std 11.33) | "If the numbers in a query and a key are independent, with mean zero and variance one, their dot product has variance d_k: with 64 numbers, scores spread about 8 times wider." Do not say Xavier makes it exactly so. | ok (soften the slide's "with Xavier") |
| F15 | Divide by √d_k so the variance is back to 1 | VAS17 3.2.1; C (variance after the division 0.996-1.002) | "Dividing by the square root of d_k brings the spread back to one." | ok |
| F16 | Large logits -> softmax ≈ one-hot -> training instability (slide: "vanishing/exploding gradients") | VAS17 3.2.1 ("extremely small gradients"); C (toy scores x 8: animal 99.97%, the others under 0.04%; largest p(1-p) falls from 0.244 to 0.00034) | "Without it, one token takes almost everything and the softmax's gradients become tiny, so learning stalls." Do not say "exploding" (the paper names small gradients). Toy: "In our toy numbers, 'animal' goes from 58 percent to essentially 100." The bar reads "100%" on screen (99.97 rounded by the bars item) and the others "<1%". | ok (soften the slide's "exploding") |
| F17 | √d_k acts as a temperature | C (softmax(z/√d_k) is softmax with temperature √d_k: the same formula as L01-04's temperature) | "Dividing by root d_k is the same move as the temperature knob from our Lecture 1 episode." | ok |
| F18 | Honest limit: the paper "suspects" the reason (said: "the 2017 paper itself only says its authors suspect this is the reason") | VAS17 3.2.1 ("We suspect that...") | "The 2017 paper itself only says the authors 'suspect' this is the reason." | ok |
| F19 | Many heads: one head links "it" to "the animal", another to "tired"; "the model's representation of the word "it" bakes in some of the representation of both "animal" and "tired"" | SL 9 (her slide's caption text, from JAL18) | "On her slide, one head links 'it' to 'the animal', and another links it to 'tired'. So the new 'it' carries a bit of both." Threads redrawn, qualitative. "'it' needs a link to the animal it names, and another to the word that describes it" (the two links of SL 9). | ok |
| F20 | Separate Q/K/V matrices per head; outputs concatenated, then one more projection (Wᴼ); a head = one copy of the attention recipe (h parallel attention layers) | VAS17 3.2.2 ("h = 8 parallel attention layers, or heads"); SL 10; JAL18 | "Attention runs several heads: copies of this whole recipe, side by side, each with its own query, key and value matrices." "The heads' outputs are glued back together and mixed by one more matrix." | ok |
| F21 | Head size default = hidden size / number of heads; 2017 base: 512 / 8 = 64; d_k = 64 there; the total cost is close to one full-size head | VAS17 3.1, 3.2.2 ("Due to the reduced dimension of each head, the total computational cost is similar to that of single-head attention with full dimensionality"; d_k = d_v = d_model/h = 64); REC (C12); C | "The 2017 base model had 512 numbers per token and 8 heads, so 64 per head, and all the heads together cost about the same as one full-size head. That 64 is the d_k we divided by." | ok |
| F22 | Output Z has the same shape as the input X (same tokens, same width); each head works with fewer numbers per token (d_model / h) | REC 15:08-15:25 (C27); VAS17 (all sub-layers output d_model; d_k = d_model / h) | "Each token comes out the same size it went in. And each head works with fewer numbers per token." | ok |
| F23 | Many heads let the model attend to different relationships at once | VAS17 3.2.2 ("jointly attend to information from different representation subspaces at different positions"); REC (C11) | "Several heads look for different relationships at the same time." | ok |
| F24 | Cost: the score table is n x n per head per layer (self-attention O(n²·d)) | VAS17 Table 1; REC 17:44-18:20; C (1,000 tokens -> 1,000,000 pairs) | "Every token scores every token: a thousand tokens means a million scores, in every head of every layer." | ok |
| F25 | Next episode: the KV cache | daily/syllabus.json (L03-02) | "Next time: the KV cache." (a plan) | ok |
| F27 | Slide 8 is marked "(Self Study)" | SL 8 title | "Her slide marks it self study, so here is the short version." | ok |
| F28 | Variance measures spread; a dot product of d_k-number vectors adds d_k products | definition; VAS17 3.2.1 footnote (q·k = Σ q_i k_i, i = 1..d_k) | "Variance measures spread. A dot product adds up d_k products." | ok |
| F29 | Softmax gradients are what training runs on; an all-or-nothing softmax barely changes when its inputs are nudged | C (max p(1-p) 0.244 -> 0.00034); VAS17 3.2.1 | "A softmax that is all or nothing hardly moves when nudged, so its gradients, the nudges training runs on, become tiny, and learning stalls." | ok |
| F30 | Her 2x2 example as a mix: token one's output = 0.119 x value 1 + 0.881 x value 2 | SL 7; VAS17 eq. 1 (weights x V); F9 | "Token one's new vector is 0.119 of the first value plus 0.881 of the second." | ok |
| F31 | The party (question card = query, name tag = key, parcel = value) and the paint recipe | our analogies, said as analogies | "Think of a party..."; "like paint poured by a recipe" | ok (analogy) |
| F26 | Her clips | clips.json + check.json (two recognizers) | quoted verbatim | ok |

## C. Computed (`~/miniforge3/bin/python3 ~/picasso-work/daily/L03-01/scripts/attn_numbers.py`)
```
row [0.119, 0.881]: sum 1.000, score gap ln(b/a) = 2.002
row [0.182, 0.818]: sum 1.000, score gap ln(b/a) = 1.503
softmax([0, 2.0]) = [0.1192, 0.8808]
softmax([0, 1.5]) = [0.1824, 0.8176]
d_k=3: var(q.k)=3.00 std=1.73 (sqrt d_k=1.73); var after /sqrt(d_k)=1.001
d_k=64: var(q.k)=63.75 std=7.98 (sqrt d_k=8.00); var after /sqrt(d_k)=0.996
d_k=128: var(q.k)=128.31 std=11.33 (sqrt d_k=11.31); var after /sqrt(d_k)=1.002
scaled (raw/8) [2.0, 0.5, -0.5, 1.0, -1.0] -> animal 58.0423%, street 12.9510%, cross 4.7644%, tired 21.3526%, the 2.8898%
raw (d_k=64, not divided) [16.0, 4.0, -4.0, 8.0, -8.0] -> animal 99.9659%, street 0.0006%, cross 0.0000%, tired 0.0335%, the 0.0000%
scaled: max p(1-p) = 2.44e-01
raw: max p(1-p) = 3.41e-04
2017 base: d_model 512 / h 8 = 64
n=11 words: n*n = 121 score pairs
n=1000 words: n*n = 1000000 score pairs
n=100000 words: n*n = 10000000000 score pairs
```
(200,000 random pairs per d_k, seed 0.) The bars panel draws softmax(scores / T) live: T = 1 on the scaled scores gives
the F8 shares; the "not divided" state is the same scores x 8 (T = 1/8 on the scaled scores), F16.

## D. Slide errata
- Slide 8: "Var(q_i,m) = Var(k_j,m) = 1)with initializations like Xavier)." The paper states unit variance as an
  assumption for the argument, not as what an initializer guarantees; said as "if ... variance one".
- Slide 8: "(vanishing/exploding gradients)": the paper names "extremely small gradients" only; the film says tiny
  gradients.
- Slide 8: the curve labelled "Softmax Function" is the logistic (sigmoid) curve, i.e. a two-way softmax of [z, 0]
  against z; not shown.
- Slide 10's title has a stray full-width bracket "（MHA）"; the slide is cropped to its left figure, so not shown.
- Recording: the recognizers hear "tiled" for "tired" and "cause" for "cross" (09:47); no clip uses that line.

## E. Third-party images on the slides
| Slide | What | Handling |
| --- | --- | --- |
| 6 | Tensor2Tensor attention visualization as shown in J. Alammar's post (CC BY-NC-SA 4.0) | not taped; redrawn as our own lettering + red-pen threads (thick / thin only) |
| 7 | Left: the 2017 paper's Figure 2 (scaled dot-product attention); middle: J. Alammar's matrix illustrations; right: her own 2x2 example text | taped as a printout with the middle covered by a blank taped sheet (the formula re-lettered on it by us); left figure credited "figure: Vaswani et al., 2017" |
| 8 | A generic plot (logistic curve) and an equation image | taped as a crop of the right half (her bullet text); the plot is cropped off |
| 9 | Same visualization as slide 6 (two heads) and J. Alammar's caption | not taped; redrawn as two colours of threads |
| 10 | Left: the 2017 paper's Figure 2 (multi-head attention); right: J. Alammar's multi-head matrices; bottom: J. Alammar's sentence | taped as a crop of the left figure only, credited "figure: Vaswani et al., 2017" |
Credit on the end card / post: "after Jay Alammar, The Illustrated Transformer (2018), and Google's 2017 Transformer blog post".

## F. Real people
- Prof. Yufei Ding: her voice clips and slides only; never drawn.
- Vaswani et al., Jay Alammar, Jakob Uszkoreit: text credits only.

## G. Traps
- Never say Xavier initialization makes the variance exactly 1.
- Never say "exploding gradients" for the softmax saturation.
- The threads are not measured weights: never put numbers on them.
- The bars' numbers are toy numbers: say "toy" on screen and in the voice.
- Tokens vs words: the slide's tokenizer splits "didn't" and "tired" into pieces; the film says "token" where it counts
  and never claims a token count for the sentence.
- d_k is the size of one head's query and key, not the model width.

## H. Open items
- Clips are checked by two recognizers, not by ear.
