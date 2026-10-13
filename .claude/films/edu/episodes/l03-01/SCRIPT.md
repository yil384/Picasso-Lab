# L03-01 "Attention: Who Is Listening to Whom"

CSE 291P "LLM System Optimization", Prof. Yufei Ding, UC San Diego, Lecture 3 "Transformer Model Architecture
Variants (2)", slides 5-10 (recording 09:21-18:21). Daily episode 9, made unattended on 2026-10-13 for the morning
of 2026-10-14. Film data: `episode.json`, `strings.json`, `timeline.json` (kit-lesson); facts: `FACTS.md`.

Two drafts (`drafts/script_A.md` story first, `drafts/script_B.md` worked example first), a judge
(`drafts/judge.md`: A 44 / B 43), this synthesis, then an independent review (`drafts/review.md`: 7 must-fix, all fixed; 17 should-fix: 14 fixed, 2 in part, 1 kept with a FACTS note): A's order and its party analogy (question card = query, name
tag = key, parcel = value), B's early "too wide" flip and its d_k set-up ("That 64 is the d_k we divided by"),
her own 0.119 / 0.881 used for the mix, and every line traced to a FACTS row.

Runtime 5:42.3 (733 narration words, 6 clips of her voice, 13 panels + the logo card). Narration: a synthetic voice.

## Beats

| Panel | Arrives | What is on screen | Voice |
| --- | --- | --- | --- |
| P0 | 0:00.0 | cover: the tired dog at the kerb of a wide street; the sentence; "it" ringed (F1); n1 flips it to the street (F2) | n0, n1, n2, c15 |
| P1 | 0:33.2 | one head reading "it": threads to every token, thickest to "the animal" (F3, F4); her clip C1 | n3, c1, n4 |
| P2 | 1:02.2 | each token -> query, key, value (F5); the analogy: question card, name tag, parcel | n5, n6 |
| P3 | 1:22.8 | 'it' holds its query card up to 'animal''s name tag: q . k (F6) | n7 |
| P4 | 1:36.7 | softmax turns the scores of "it" into shares (toy numbers F8): animal 58, tired 21, street 13 | n8 |
| P5 | 1:50.9 | her slide 7 taped; third-party middle covered, the recipe lettered on it (F11); her 2x2 clipped out (F9); rows = 1 (C23); gap of 2 (F10) | n9, c23, n10 |
| P6 | 2:31.2 | the mix: token one = 0.119 x value 1 + 0.881 x value 2 (her slide 7 numbers, F30); toy it -> mostly animal (F8) | n11 |
| P7 | 2:46.5 | her slide 8, first three bullets: Var = d_k, std = root d_k boxed (F14, F15); red pen: the unit variance is an assumption (errata); zoom while n13 | n12, n13 |
| P8 | 3:16.1 | toy bars: x8 -> one-hot (F16); divide = temperature (F17); the paper only "suspects" (F18) | n14, n15, n16 |
| P9 | 3:51.9 | several heads in parallel, each looking for a different relationship (F19, F20, F23); her clip C11 | n17, c11, n18 |
| P10 | 4:19.0 | two heads on "it": one to the animal, one to tired (F19) | n19 |
| P11 | 4:27.5 | her slide 10, left figure only: h heads, concat, linear (F20); 512 / 8 = 64 (F21); her clips C27, C12 (F22) | n20, c27, n21, c12, n22 |
| P12 | 5:16.6 | every token listens to every token: a thousand tokens, a million scores, per head per layer (F24); next: the KV cache (F25) | n23, n24 |
| end | 5:38.3 | the logo card (kit), credits from strings.json | - |

## Narration and clips (in order, fitted start times)

| Id | Start | Line | FACTS |
| --- | --- | --- | --- |
| n0 | 0:00.4 | The animal didn't cross the street because it was too tired. So, what is 'it'? | F1 |
| n1 | 0:06.1 | The animal, of course. Now change one word: because it was too wide. Now 'it' is the street. | F1, F2 |
| n2 | 0:12.8 | Same 'it', same spot. Only the other words decide. A language model has to work that out with arithmetic, for every word it reads. Lecture 3 of Prof. Yufei Ding's CSE 291P at UC San Diego starts right here. | F4, SL |
| c15 | 0:29.7 | **her clip** "And the first is why we want to have attention." | F26 |
| n3 | 0:33.8 | Here is one trained model reading 'it'. The sentence is cut into tokens, words or pieces of words, and 'it' draws a thread to every token in the sentence. The thickest threads run to 'the animal'. | F3, F4, G (tokens) |
| c1 | 0:47.6 | **her clip** "So attention, again, is like aggregation of the information from other tokens." | F26 |
| n4 | 0:55.1 | Aggregation: 'it' pulls a little information out of every token. The question is how much from each. | F4 |
| n5 | 1:02.8 | So every token is turned into three vectors, three lists of numbers, by three learned matrices. | F5 |
| n6 | 1:10.3 | Think of a party. The query is the question card you hold up: what am I looking for? The key is your name tag, what you show the others. And the value is the parcel you hand over when you get picked. | F5, F31 |
| n7 | 1:23.4 | 'it' holds its question card up to every name tag. To score a match, multiply the query and the key number by number, and add it all up. That's a dot product: big when the two point the same way. | F6, F31 |
| n8 | 1:37.3 | Then softmax turns the scores into shares that add up to one. With toy numbers, 'it' gives 58 percent of its attention to 'animal', 21 to 'tired', 13 to 'street', and crumbs to the rest. | F7, F8 |
| n9 | 1:51.7 | Her slide writes the whole recipe in one line: every query against every key, divided by the square root of dₖ, softmaxed, then used to mix the values. dₖ is how many numbers each query and key holds. Here is her two-token example, after the softmax. | F11, F9, G (d_k) |
| c23 | 2:09.8 | **her clip** "So that's why if you sum up each line, you will add up to one." | F26 |
| n10 | 2:15.2 | Row one: 0.119 and 0.881. Row two: 0.182 and 0.818. Softmax only sees gaps: 0.881 just means the second score was 2 higher than the first. | F9, F10 |
| n11 | 2:31.8 | Then the mix. Token one's new vector is 0.119 of the first value plus 0.881 of the second, like paint poured by a recipe. In our toy sentence, the new 'it' comes out mostly 'animal'. | F12, F30, F8, F31 |
| n12 | 2:47.3 | Now the odd step: why divide by the square root of dₖ? Her slide marks it self study, so here is the short version. | F27 |
| n13 | 2:56.5 | Variance measures spread. A dot product adds up dₖ products. If the numbers are independent, with mean zero and variance one, its variance is dₖ: with 64 numbers, scores spread about 8 times wider. Dividing by the square root of dₖ brings the spread back to one. | F28, F14, F15 |
| n14 | 3:16.7 | Skip the division and watch. Same toy scores, 8 times wider: 'animal' takes essentially everything, and every other share rounds to zero. | F16, F8 |
| n15 | 3:26.9 | A softmax that is all or nothing hardly moves when nudged, so its gradients, the nudges training runs on, become tiny, and learning stalls. Dividing by the square root of dₖ is the temperature knob from our Lecture 1 episode, set for you. | F29, F16, F17 |
| n16 | 3:43.9 | One honest footnote: the 2017 paper itself only says its authors suspect this is the reason. | F18 |
| n17 | 3:52.5 | One pattern is not enough, though. 'it' needs a link to the animal it names, and another to the word that describes it. | F19 |
| c11 | 4:00.7 | **her clip** "So that's why sometimes we want to use different head to capture different relationships among the tokens." | F26 |
| n18 | 4:07.4 | So attention runs several heads: copies of this whole recipe, side by side, each with its own query, key and value matrices, each free to look for something different. | F20, F23 |
| n19 | 4:19.6 | On her slide, one head links 'it' to 'the animal', and another links it to 'tired'. So the new 'it' carries a bit of both. | F19 |
| n20 | 4:28.3 | Then the heads' outputs are glued back together and mixed by one more matrix. Call a token's numbers going in x, and coming out z. | F20, F22 |
| c27 | 4:37.5 | **her clip** "If you look at the x and the z, you will find that usually they will have the same number of elements." | F26 |
| n21 | 4:43.5 | So each token comes out the same size it went in. And each head works with fewer numbers per token. | F22 |
| c12 | 4:50.6 | **her clip** "And the default we have here is this dimension just equals the hidden dimension of x divided by the number of heads." | F26 |
| n22 | 5:01.0 | The 2017 base model had 512 numbers per token and 8 heads, so 64 per head, and all the heads together cost about the same as one full-size head. That 64 is the dₖ we divided by. | F21, F14 |
| n23 | 5:17.2 | So, who is listening to whom? 'it' listens to every token and takes a share from each: that is how the other words decide what 'it' means. And every token does the same. That's the power, and the bill: a thousand tokens means a million scores, in every head of every layer. | F4, F12, F24 |
| n24 | 5:35.4 | Next time: the KV cache. | F25 |

## Her clips (L03 recording; audio cut from git-ignored course/L03.mp4 into ~/picasso-work/clips/l03-01)

| Id | Recording | Length | Check | Text |
| --- | --- | --- | --- | --- |
| C15 | 9:36.3-9:38.8 | 2.5 s | exact | "And the first is why we want to have attention." |
| C1 | 9:38.7-9:44.9 | 6.2 s | exact | "So attention, again, is like aggregation of the information from other tokens." |
| C23 | 11:51.9-11:56.0 | 4.2 s | exact | "So that's why if you sum up each line, you will add up to one." |
| C11 | 14:05.5-14:10.9 | 5.5 s | exact | "So that's why sometimes we want to use different head to capture different relationships among the tokens." |
| C12 | 15:51.2-16:00.4 | 9.2 s | exact | "And the default we have here is this dimension just equals the hidden dimension of x divided by the number of heads." |
| C27 | 15:07.9-15:12.7 | 4.8 s | exact | "If you look at the x and the z, you will find that usually they will have the same number of elements." (was: "If you look at x and z, you will find that usually they will have the same number of elements.") |

## Facts
Every number and claim: `FACTS.md` (31 rows; computed numbers in its section C). The bars are toy
numbers and say so; the threads are redrawn after her slides 6 and 9, thick or thin only, with no weights.

## Drawings
- New: `line_tired_dog_street` (cover), `line_word_three_things` (query / key / value), `line_three_readers` (heads).
- Reused: `line_paint_pour` (the mix), `line_temp_knob` (the temperature callback), `line_round_table` (everyone listens to everyone), `line_mic`.
- Her slides taped: 7 (the middle third-party matrices covered by a blank sheet, the recipe lettered on it; her 2x2
  numbers clipped out larger), 8 (right half only; the red pen marks the unit variance as an assumption and
  "exploding" as the paper's tiny gradients), 10 (the paper's figure only). Slides 6 and 9 are redrawn, never taped.

## Sound
CC0 paper and tape sounds by rule (`timeline.json`), music "Investigations" by Kevin MacLeod (incompetech.com,
CC BY 4.0) looped and ducked under the voice, -14 LUFS.
