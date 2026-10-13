# L03-01 "Attention: Who Is Listening to Whom" - script draft B (the worked example first)

CSE 291P (Prof. Yufei Ding, UC San Diego), Lecture 3 slides 5-10 (recording 09:26-18:21). English, 1080x1920, line look.
Angle B: the slide's own example is the spine. The sentence and its "it" threads, then her 2x2 softmax worked
backwards (shares, rows summing to one, the gap of 2 behind 0.881, then where scores come from) and forwards (the mix),
then the toy bars with and without the division by root d_k, then heads. Every line cites its FACTS.md rows (F#, D =
errata, G = traps). Threads never carry numbers (G); the bars are labelled "toy numbers" on screen and in the voice (F8).

## Beats (planned starts; the voice decides)

| # | start | panel | lines |
| --- | --- | --- | --- |
| P0 | 0:00 | Cover: `line_tired_dog_street` fills the width; the sentence lettered under it; red pen rings "it". Title "Attention: who is listening to whom" + strip "CSE 291P · Lecture 3 · UC San Diego". | n0 |
| P1 | 0:08 | Same sentence; the pen strikes "tired", writes "wide"; a red thread from "it" jumps from "the animal" to "street" (blue wash on the street). | n1 |
| P2 | 0:21 | Slide 6 redrawn, never taped: the words in a column, "it" on the right; red-pen threads to every word, the thickest to "The animal" (thick/thin only, no numbers). Mic tag for C1. | n2, C1, n3 |
| P3 | 0:53 | Slide 7 taped (Figure 2 at left, credited "figure: Vaswani et al., 2017"; the middle covered by a blank taped sheet; her 2x2 at right). Pen boxes the 2x2, then writes "0.119 + 0.881 = 1.000", "0.182 + 0.818 = 1.000" in the margin. Mic tag for C23. | n4, n5, C23 |
| P4 | 1:21 | Note card "working it back": two score ticks on a number line, gap ringed "2" -> "softmax([0, 2]) = [0.119, 0.881]"; second line "gap 1.5 -> 0.818". | n6 |
| P5 | 1:37 | `line_word_three_things`; code letters the card "query", the badge "key", the parcel "value"; three small grids "W^Q, W^K, W^V" inked beside. Caption "an analogy". | n7 |
| P6 | 1:55 | Two hand-drawn number lists (query of "it", key of "animal"), lettered as q·k = Σ q_m k_m (slide 8's form, no values); the pen pairs them and adds; a dial of two arrows: same way = big. | n8 |
| P7 | 2:10 | `line_paint_pour`: the cups lettered "value 1 × 0.119", "value 2 × 0.881", the glass "new vector". Mic tag for C28. | n9, C28 |
| P8 | 2:26 | Back to slide 7: the pen letters softmax(QKᵀ / √dₖ) V on the blank sheet, brackets "every query × every key", "shares", "the mix"; rings √dₖ; note "d_k = numbers in one query or key". | n10 |
| P9 | 2:43 | Slide 8 taped, right half only (her bullets). Mic tags for C24, C25. Pen strikes "with initializations like Xavier", writes "IF (assumed)"; boxes "Var ≈ d_k", "std ≈ √d_k"; card "64 numbers -> about 8× wider; ÷ √d_k -> back to 1". | n11, C24, C25, n12 |
| P10 | 3:18 | Live `bars`, header "toy numbers": the 3%, animal 58%, cross 5%, street 13%, tired 21% (T = 1); then T eases to 1/8 ("not divided"): animal 99.97%, the rest under 0.04%. | n13, n14 |
| P11 | 3:37 | Slide 8's last bullet, close: pen strikes "/exploding", writes "tiny gradients"; a taped paper scrap with the paper's word "suspect" ringed. | n15 |
| P12 | 3:54 | `line_temp_knob` over the small bars; the knob turns and the bars soften: "÷ √d_k = temperature". | n16 |
| P13 | 4:03 | Slide 9 redrawn, never taped: the word column with two colours of threads from "it", red ink to "The animal", blue wash to "tired"; "head 1", "head 2". Mic tag for C11. | n17, C11 |
| P14 | 4:25 | `line_three_readers`; code letters "head 1/2/3" on the glasses and the sentence along the banner; each reader gets a tiny "Q K V" card. | n18 |
| P15 | 4:38 | Slide 10 taped, left figure only (credited "figure: Vaswani et al., 2017"); pen boxes "h", "Concat", "Linear"; card "512 ÷ 8 = 64 (2017 base)". Mic tag for C12. | n19, C12, n20 |
| P16 | 5:05 | `line_round_table`; an n × n grid fills in behind: "1,000 tokens -> 1,000,000 scores, per head, per layer". | n21 |
| P17 | 5:14 | Bookend: the cover; threads fan from "it" to every word; card "Next: the KV cache". Then the logo end card (kit). | n22 |

## Narration and clips, in order

| id | line | FACTS |
| --- | --- | --- |
| n0 | The animal didn't cross the street because it was too tired. What is "it" looking at? | F1 |
| n1 | The animal. Change one word, too wide, and "it" is the street. One word at the far end decides, so a model reading "it" must look at the whole sentence. | F1, F2 |
| n2 | That looking is called attention. A model reads text as tokens, words and word pieces, and "it" looks at every token and gathers a little from each. | F4, G (tokens) |
| C1 | her clip (6.2 s): "So attention, again, is like aggregation of the information from other tokens." | F4, F26 |
| n3 | In one trained model, one attention head, one reader for now, draws its strongest lines from "it" to "the animal". Thick or thin: how much "it" listens to each token. | F3, G (no numbers) |
| n4 | How thick is thick? Her slide works the smallest case: two tokens, each looking at both. After a step called softmax: row one, 0.119 and 0.881. Row two, 0.182 and 0.818. | F9 |
| n5 | Each row is one token's attention, shared out. That is softmax's job: it turns a row of scores into shares that add up to one. | F7, F9 |
| C23 | her clip (4.2 s): "So that's why if you sum up each line, you will add up to one." | F7, F26 |
| n6 | The slide doesn't show the scores that went in, but we can work them back: softmax only sees gaps. 0.881 means the second score was 2 higher than the first. Row two: a gap of 1.5. | F10, C |
| n7 | Where do scores come from? Each token is turned into three vectors, lists of numbers, by three learned matrices: a query, a key and a value. As an analogy: a question card, a name badge, a parcel. | F5 |
| n8 | A score is one token's query against another's key, as a dot product: multiply the two lists number by number and add it all up. It is big when they point the same way. | F6 |
| n9 | Then the mix. Row one: blend 0.119 of the first token's value with 0.881 of the second's. That blend is the token's new vector. | F12, F9 |
| C28 | her clip (4.4 s): "and then we calculate the value so that we get new information" | F12, F26 |
| n10 | The whole recipe, on one line. Q times K-transposed: every query against every key. Softmax: shares. Times V: the mix. Left over: the division by root d_k, where d_k is how many numbers each query and key holds. | F11, G (d_k) |
| n11 | Why divide? Variance measures spread. Her self-study slide: | F14 |
| C24 | her clip (4.8 s): "And the inner product will have dk elements adding together." | F14, F26 |
| C25 | her clip (2.8 s): "So that's why the variance will be dk." | F14, F26 |
| n12 | If the numbers in a query and a key are independent, with mean zero and variance one, their dot product has variance d_k: with 64 numbers, scores spread about 8 times wider. Dividing by root d_k brings the spread back to one. That "if" is an assumption, as the paper says. | F14, F15, D (Xavier), G |
| n13 | Why does spread matter? Toy numbers, for "it". Divided: "animal" 58 percent, "tired" 21, "street" 13, the rest a few percent. | F8 |
| n14 | Undivided, the same scores are eight times bigger, and "animal" goes from 58 percent to essentially 100. One token takes almost everything. | F16, C |
| n15 | Then the softmax's gradients, the signals that tell each weight which way to move, become tiny, and learning stalls. Small gradients, not exploding ones. And the 2017 paper itself only says its authors "suspect" this is the reason. | F16, F18, D (exploding), G |
| n16 | Familiar? Dividing by root d_k is the same move as the temperature knob from our Lecture 1 episode. | F17 |
| n17 | Last piece. One head draws one set of threads, but "it" has more to track. So attention runs several heads side by side. On her slide, one head links "it" to "the animal", another to "tired". | F19, F23 |
| C11 | her clip (5.5 s): "So that's why sometimes we want to use different head to capture different relationships among the tokens." | F23, F26 |
| n18 | Three readers, one banner, each with their own glass. Each head has its own query, key and value matrices. Their outputs are glued together and mixed by one more matrix. | F20 |
| n19 | Each token leaves the layer the same size it came in. And the size of each head? | F22 |
| C12 | her clip (9.2 s): "And the default we have here is this dimension just equals the hidden dimension of x divided by the number of heads." | F21, F26 |
| n20 | The 2017 base model had 512 numbers per token and 8 heads, so 64 per head. That 64 is its d_k. | F21, F14, G (d_k per head) |
| n21 | The price: every token scores every token. A thousand tokens means a million scores, in every head of every layer. | F24 |
| n22 | So, who is listening to whom? Every token, to every token, in shares that add up to one. Next: the KV cache. | F7, F25 |

No RoPE callback (L02-04 is not re-explained). Post credit: the sentence pair is from Google's 2017 Transformer blog post;
"after Jay Alammar, The Illustrated Transformer (2018)" (FACTS E).

Clips used: C1 (passed), C11 (passed), C12 (passed), C23, C24, C25, C28 (being checked). If one fails: drop C23 or C28
outright (n5 / n9 already carry the point); if C24 or C25 fails drop both and n11 runs into n12. Spares to fill a gap:
C21 (5.4 s) before n3 on P2, C29 (3.3 s) before n8 on P6, C26 (4.8 s) after n15 on P11.

## Length

Narration 632 words in 23 lines; her clips 7, 37.1 s (about 12 % of the runtime); 18 panels.
Estimate: 632 / 150 × 60 = 253 s + 37.1 s clips + 18 s panels = about 308 s = 5:08 (plus the logo card). The
spoken decimals (0.119 etc., 8 readings) run slow; if the voice lands past 5:30, cut n16's "Familiar?" panel into P10
and shorten n7's analogy to its caption.

## Drawings

New tonight: `line_tired_dog_street` (P0, P1, P17), `line_word_three_things` (P5), `line_three_readers` (P14).
Reused: `line_paint_pour` (P7), `line_temp_knob` (P12), `line_round_table` (P16), `line_mic` (mic tags).
Code: lettering, word columns and red-pen threads (P1, P2, P13, P17), the gap note card (P4), the dot-product lists
(P6), the formula on the blank sheet (P8), `bars` with T eased 1 -> 1/8 (P10, P12), the n × n grid (P16).
Taped slides: 7 (P3, P8; middle covered), 8 right half (P9, P11), 10 left figure (P15). Slides 6 and 9 redrawn only.
