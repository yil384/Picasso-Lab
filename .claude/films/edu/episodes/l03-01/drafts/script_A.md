# L03-01 "Attention: Who Is Listening to Whom" - script draft A (story first)

CSE 291P (Prof. Yufei Ding, UC San Diego), Lecture 3 slides 5-10 (recording 09:26-18:21). 1080x1920, English.
Angle: the sentence is a party. Every token holds up a question card (query), wears a name tag (key) and carries a
parcel (value); "it" holds its card up to every name tag, turns the scores into shares, and takes that share of every
parcel. Several heads = several readers at one banner. The analogy is always said as an analogy (F5). Facts: `../FACTS.md`
(rows next to each line). Planned times assume 150 wpm, the clip lengths and 1 s per panel; the voice decides.

## Beats

| # | time | panel (one idea; subject 60-90 % of the width) | lines |
| --- | --- | --- | --- |
| P0 | 0:00.0 | Cover: `line_tired_dog_street` across the width; the sentence lettered above it in ink; the red pen rings "it" and adds a "?". Title "Attention: who is listening to whom", strip "CSE 291P · Lecture 3 · UC San Diego". Yellow wash on the street. | n0, n1 |
| P1 | 0:16.6 | The party: `line_round_table`; each guest gets one word of the sentence lettered on a small card at their place. Pink wash under the table. Mic tag + red-bordered caption for C1. | n2, C1, n3 |
| P2 | 0:38.6 | Slide 6 redrawn (not taped): two columns of the sentence's words lettered; from "it" the red pen draws one thick thread to "The animal", thin threads to the rest. Thick vs thin only, no numbers (F3, trap G). | n4, C21 |
| P3 | 0:53.4 | `line_word_three_things` fills the frame; code letters "query: what am I looking for?" on the card, "key: what I am about" on the badge, "value: what I can give" on the parcel; washes pink / yellow / blue (the slide's Q, K, V colours); small "x · Wᵠ", "x · Wᴷ", "x · Wⱽ" by red pen. | n5, n6 |
| P4 | 1:18.0 | The score: "it"'s question card (lettered) at the left, a column of round name tags (one per word) at the right, a red thread to each. Zoom to one pair: two short columns q₁ q₂ q₃ q₄ and k₁ k₂ k₃ k₄, red "x" between rows, a red brace summing them (letters only, no invented numbers; slide 8's sum). | n7 |
| P5 | 1:34.2 | `bars` at T = 1 on the F8 scaled toy scores: animal 58 %, tired 21 %, street 13 %, cross 5 %, the 3 %; "toy numbers" lettered on top; red bracket "= 100 %". | n8 |
| P6 | 1:45.6 | `line_paint_pour`: the two cups lettered "animal" and "tired", the glass "new 'it'"; a third drip lettered "the rest". "toy" tag. Mic tag for C28. | n9, C28, n10 |
| P7 | 2:05.8 | Her slide 7 taped (slightly rotated, tape strip): left figure credited "figure: Vaswani et al., 2017"; the middle covered by a blank taped sheet lettered softmax(QKᵀ / √dₖ) V; the red pen boxes her 2x2 numbers, writes "= 1" after each row, then "gap 2.0" and "gap 1.5" beside them. | n11, n12, C23, n13 |
| P8 | 2:38.2 | Her slide 8, right half taped (plot cropped off). Red pen: boxes "d elements"; strikes "with initializations like Xavier" and writes "if: independent, mean 0, variance 1"; strikes "exploding" and writes "tiny". A hand-drawn note card: "64 numbers: spread x 8; divide by √64 = 8: spread 1". | n14, C24, n15 |
| P9 | 3:14.8 | `line_temp_knob` large at the top, `bars` under it: the knob turns as T eases from 1 to 1/8 ("not divided"): the toy bars collapse to animal ~100 %; red pen "gradients: tiny"; then back to T = 1. Lettered "Lecture 1: temperature". | n16, n17 |
| P10 | 3:42.6 | Slide 9 redrawn (not taped): the word columns again; head 1 = red-pen thread "it" to "the animal", head 2 = blue-wash thread "it" to "tired"; labels "head 1", "head 2"; no numbers. Mic tag for C11. | n18, C11 |
| P11 | 4:00.3 | `line_three_readers` fills the width; the sentence lettered on the banner; "head 1 / head 2 / head 3" lettered over the three readers. | n19 |
| P12 | 4:11.3 | Her slide 10, left figure only, taped, credited "figure: Vaswani et al., 2017". Red pen rings "Concat" (writes "glue") and "Linear" (writes "mix"), rings "h" (writes "8 heads"); a note card "512 / 8 = 64". Mic tag for C12. | n20, C12, n21 |
| P13 | 4:42.7 | The bill: code draws a dot grid that grows row by row, lettered "1,000 tokens", "1,000,000 scores", then "x every head x every layer" by red pen. | n22 |
| P14 | 4:51.7 | Bookend: `line_tired_dog_street` again; the red pen writes "wide" over "tired" and the red ring slides from the dog to the street (the meaning, F2, not a measured thread); teaser lettered "Next: the KV cache". | n23, n24 |
| end | 5:07.5 | The logo end card (kit); credits: "after Jay Alammar, The Illustrated Transformer (2018), and Google's 2017 Transformer blog post"; "figures: Vaswani et al., 2017". | - |

## Narration and clips, in order

| id | at | line | FACTS |
| --- | --- | --- | --- |
| n0 | 0:01.0 | The animal didn't cross the street because it was too tired. What is 'it'? | F1 |
| n1 | 0:06.6 | You know at once: the animal. A model has to work that out from the words alone. The part that does it is called attention. | F1, F4 |
| n2 | 0:17.6 | Picture the sentence as a party. Each guest is a token, a word or a piece of a word, and everyone can listen to everyone. | F4, G (tokens) |
| C1 | 0:27.6 | her clip C1 (6.2 s): "So attention, again, is like aggregation of the information from other tokens." | F26 |
| n3 | 0:33.8 | Aggregation means gathering: each token gathers a little from every other one. | F4 |
| n4 | 0:39.6 | Watch 'it'. In one trained model, one attention head, a single listener, reading 'it' draws its strongest lines to 'the animal'. | F3 |
| C21 | 0:48.0 | her clip C21 (5.4 s): "And now we want to understand how this it is related with other tokens." | F26 |
| n5 | 0:54.4 | How does it choose? Each token is turned into three vectors, three lists of numbers, by three learned matrices: a query, a key and a value. | F5 |
| n6 | 1:04.8 | In our picture, the query is a question card: what am I looking for? The key is a name tag: what I am about. The value is a parcel: what I can give. | F5 (analogy) |
| n7 | 1:19.0 | 'It' holds its card up to every name tag and gives each a score, a dot product: multiply the two lists number by number and add it all up. It is big when they point the same way. | F6 |
| n8 | 1:35.2 | Softmax turns the scores into shares that add up to one. Toy numbers: 'animal' gets 58 percent, 'tired' 21, 'street' 13, the rest a few percent. | F7, F8 |
| n9 | 1:46.6 | Then 'it' opens the parcels and blends every token's value in those shares: a big pour from 'animal', less from 'tired', a drop from the rest. | F12, F8 |
| C28 | 1:57.0 | her clip C28 (4.4 s): "and then we calculate the value so that we get new information" | F26 |
| n10 | 2:01.4 | Out comes a new 'it', mixed partly from the animal's parcel. | F12 |
| n11 | 2:06.8 | Her slide runs the whole party at once, with matrices: every query against every key in one multiplication, scaled down, softmaxed, then used to mix the values. | F11, F24 |
| n12 | 2:17.6 | Her small example has two tokens, so the shares make a two by two table. Row one: 0.119 and 0.881. Row two: 0.182 and 0.818. | F9 |
| C23 | 2:27.6 | her clip C23 (4.2 s): "So that's why if you sum up each line, you will add up to one." | F26, F9 |
| n13 | 2:31.8 | And softmax only sees gaps: 0.881 means the second score was 2 higher than the first. | F10 |
| n14 | 2:39.2 | Now that divide. Her slide marks it self study, so here is the short version. d k is the length of one head's query and key. | F14, G (d_k) |
| C24 | 2:49.6 | her clip C24 (4.8 s): "And the inner product will have dk elements adding together." | F26, F14 |
| n15 | 2:54.4 | Variance measures spread. If those numbers are independent, with mean zero and variance one, the dot product has variance d k. With 64 numbers, a head's size in the 2017 model, scores spread about 8 times wider. Dividing by the square root of d k brings the spread back to one. | F14, F21, F15 |
| n16 | 3:15.8 | Skip the divide, and in our toy numbers 'animal' goes from 58 percent to essentially 100. One token takes almost everything, and the softmax's gradients, the nudges training runs on, become tiny, so learning stalls. | F16 |
| n17 | 3:29.8 | Dividing by root d k is the same move as the temperature knob from our Lecture 1 episode. And the 2017 paper itself only says the authors 'suspect' this is the reason. | F17, F18 |
| n18 | 3:43.6 | One set of shares makes one blend. But 'it' relates to more than one word. On her slide, one head links 'it' to 'the animal', another to 'tired'. | F12, F19 |
| C11 | 3:54.8 | her clip C11 (5.5 s): "So that's why sometimes we want to use different head to capture different relationships among the tokens." | F26, F23 |
| n19 | 4:01.3 | Like readers at one long banner, each with a magnifying glass on a different spot, several heads look for different relationships at the same time. | F23 |
| n20 | 4:12.3 | Each head has its own query, key and value matrices. Their outputs are glued together and mixed by one more matrix, so each token leaves the layer the same size it came in. | F20, F22 |
| C12 | 4:25.5 | her clip C12 (9.2 s): "And the default we have here is this dimension just equals the hidden dimension of x divided by the number of heads." | F26, F21 |
| n21 | 4:34.7 | The 2017 base model had 512 numbers per token and 8 heads, so 64 per head: our 64 from before. | F21 |
| n22 | 4:43.7 | The bill: every token scores every token. A thousand tokens means a million scores, in every head of every layer. | F24 |
| n23 | 4:52.7 | So: every token asks a question, checks every name tag, and takes a share of every parcel. Change one word, 'too wide', and 'it' is the street. | F2, F5-F7, F12 |
| n24 | 5:03.5 | Next: the KV cache. K for keys, V for values. | F25 |

Clip fallbacks (C21, C28, C23, C24 are still being checked): every line reads on without its clip; if C23 drops, n12
ends with F9's "Each row adds up to one." Spares if one fails: C25 after C24 ("So that's why the variance will be dk.",
2.8 s), C29 before n7 ("So first, we come up with the inner product", 3.3 s), C15 before n2 (2.5 s).
Not said anywhere: Xavier as a guarantee, "exploding", numbers on threads, a token count for the sentence (traps, G).
Previous episode (RoPE): no callback needed; the only callback is the Lecture 1 temperature knob (F17).

## Count and runtime

Narration 632 words in 25 lines (n0-n24): 632 / 150 = 252.8 s. Her clips: C1, C21, C28, C23, C24, C11, C12 = 7 clips,
39.7 s. Panels: 15 x 1 s = 15 s. Estimate 307.5 s = 5:07.5 to the end card, about 5:12 with the logo card. Clips are
13 % of the runtime (cap 25 %).

## Drawings

New (tonight): `line_tired_dog_street` (P0, P14), `line_word_three_things` (P3), `line_three_readers` (P11).
Reused: `line_round_table` (P1), `line_paint_pour` (P6), `line_temp_knob` (P9), `line_mic` (the mic tag on every clip).
Not used: `line_card_catalog`, `line_balance`.
Code only: lettering, red-pen threads (P2, P4, P10), name-tag rings and the q x k sum (P4), `bars` (P5, P9), note cards
(P8, P12), the dot grid (P13). Taped slides: 7 (middle covered, formula lettered), 8 (right half), 10 (left figure).
Slides 6 and 9 redrawn as threads, never taped.
