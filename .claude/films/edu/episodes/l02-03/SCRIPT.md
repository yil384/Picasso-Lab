# L02-03 "Where Am I? Positional Encoding" - script (synthesis)

CSE 291P (Prof. Yufei Ding, UC San Diego), Lecture 2 slides 23-31 (recording 51:13-72:07). Runtime 5:50.5 (350.5 s), 1080x1920, 30 fps, English. Angle: clock hands - each sine/cosine pair is one hand, four hands at four speeds for d_model = 8; a shift turns every hand (a rotation), so the angle between two positions depends only on their distance; the catch: the position is poured into the word (two jars, one glass), so the word-with-position terms break the clean distance. Written by the producer directly (the two draft subagents were cut off with an early session stop; see report.md). Facts: `FACTS.md`.

## Beats

| # | time | panel | voices |
| --- | --- | --- | --- |
| P0 | 0:00.0 | cover: a cat chasing a dog; the two sentences; hook F1 | n0, n1 |
| P1 | 0:12.6 | the round table: in the encoder every word looks at every other word at once (c2; F1, F2) | n2, c2, n3 |
| P2 | 0:32.9 | a bag with five word tiles: the, cat, chased, the, dog; same bag, same result (F1) | n4 |
| P3 | 0:42.1 | her slide 24 taped; red box on the two sentences, underline on "Without PE ..."; the 2022 footnote (F1, F3, F4) | n5, n6, n7, n8 |
| P4 | 1:16.0 | word vector + position vector = what attention sees; eight slots; computed, not learned (c3; F6, F8) | n9, n10, c3 |
| P5 | 1:37.5 | one clock: a sine and a cosine of the same angle = the tip of a hand on a circle of radius one (c4; F7, F9, F17) | n11, c4, n12, n13 |
| P6 | 2:05.0 | four small clocks in a row (d_model = 8): speeds 1, 0.1, 0.01, 0.001 radians per word; hands at positions 0-3 (F11, F13) | n14, n15, n16, n17 |
| P7 | 2:30.1 | her slide 26, the table (positions 0-4, slots 0-7); rings on 0.841471 and 0.001000; fast / slow; between -1 and 1 (c5; F10, F11, F12) | n18, n19, n20, c5 |
| P8 | 3:01.4 | a long film strip: fast hands tell neighbours apart, slow hands tell near from far; 6.28 words vs about 60,000 (F12, F14, F15) | n21, n22 |
| P9 | 3:20.0 | a student at a laptop, two bubbles: a long document, then the question; the question moves later (c8; F17, F21) | n23, n24, c8, n25 |
| P10 | 3:40.8 | one clock, two hands (two words); both turned by the same angle: the angle between stays; dot product depends only on distance (F17, F18) | n26, n27, n28 |
| P11 | 4:07.4 | her slide 27 taped; red box on PE(pos + k) = Rk · PE(pos) and on the dot-product line; proof is self-study (c9; F17-F20) | n29, n30, c9, n31 |
| P12 | 4:34.5 | two jars into one glass: the word and its clock reading become one vector; cross terms change (c10; F22) | n32, n33, c10, n34 |
| P13 | 5:03.5 | her slide 31 taped; the third-party diagram covered by a blank sheet; ring on "!="; underline "sum" (F22) | n35, n36 |
| P14 | 5:18.0 | her rule of thumb (paraphrase): addition? try multiplication or concatenation; RoPE turns the query and key (F25, F26) | n37, n38 |
| P15 | 5:35.8 | bookend: the two chases; clock hands give a place, added they keep distance only partly; turn, don't add | n39 |
| end | 5:46.5 | the logo end card; credits | - |

## Narration and clips, in order

| id | at | line |
| --- | --- | --- |
| n0 | 0:00.3 | The cat chased the dog. The dog chased the cat. |
| n1 | 0:04.0 | To attention with no positions, these two are the same sentence. So how does a Transformer know where each word sits? |
| n2 | 0:13.2 | In the 2017 Transformer, the encoder lets every word look at every other word, all at once. |
| c2 | 0:20.6 | her clip C2 (L02, 4.3 s): "In that scenario, if you look at these two sentences, they will be the same" |
| n3 | 0:26.2 | Each word mixes in the others by how well they match. Nothing in that mix says which word came first. |
| n4 | 0:33.5 | Shake the words into a bag: the, cat, chased, the, dog. Both sentences give the same bag, and the same result for every word. |
| n5 | 0:42.7 | Her slide says it plainly: without positional encoding, you cannot tell these two apart. |
| n6 | 0:49.2 | One honest footnote. In a decoder-only model, each word sees only the words before it, so the two sentences already look different. |
| n7 | 0:58.3 | A 2022 paper by Haviv and colleagues found that such models, with no positional encoding at all, still learn word order and come close to the usual ones. Encoders that see both ways do not. |
| n8 | 1:11.4 | Positional encoding is still the standard. So what does it look like? |
| n9 | 1:16.6 | The 2017 answer: give every position a vector, the same length as a word's vector, and add the two together. |
| n10 | 1:25.6 | And that vector is not learned. It is computed from just two numbers: the position, and the slot. |
| c3 | 1:32.7 | her clip C3 (L02, 3.4 s): "It's not a weight matrix. You do not need to train it." |
| n11 | 1:38.1 | Here is the trick. Take the slots in pairs. The first gets a sine, the second a cosine, of the same angle. |
| c4 | 1:46.0 | her clip C4 (L02, 4.4 s): "But they always have the same angles for each two pieces." |
| n12 | 1:51.7 | A sine and a cosine of one angle are just the tip of a clock hand, on a circle of radius one. |
| n13 | 1:58.6 | So each pair of slots is one clock hand. Move one word later, and the hand turns. |
| n14 | 2:05.6 | Her example uses eight slots, so four hands. |
| n15 | 2:09.9 | The first hand turns one radian per word, about 57 degrees. |
| n16 | 2:15.3 | The next turns 0.1 of a radian, then 0.01, then 0.001. The slowest hand barely moves. |
| n17 | 2:25.3 | Read all four hands together, and the positions are told apart. |
| n18 | 2:30.7 | Her slide 26 prints the readings. Position 1, slot 0: 0.841471, the sine of one radian. |
| n19 | 2:41.7 | Down in slot 6, the slow hand reads 0.001. Fast at the top, slow at the bottom. |
| n20 | 2:49.9 | Every value stays between minus one and one, and there are no extra parameters. |
| c5 | 2:55.5 | her clip C5 (L02, 4.6 s): "If you can ensure your values are healthy, it will make your model much more stable." |
| n21 | 3:02.0 | Why so many speeds? Fast hands tell neighbours apart. Slow hands tell near from far, across a whole text. |
| n22 | 3:10.5 | In the 512-wide model, the fastest hand comes round every 6.28 words. The slowest takes about 60,000. |
| n23 | 3:20.6 | Now the clever part. Why a sine and a cosine, and not just a sine? |
| n24 | 3:25.3 | Think of a question you ask after pasting in a long document. |
| c8 | 3:29.8 | her clip C8 (L02, 3.1 s): "after you have a PDF, you ask a question." |
| n25 | 3:34.3 | Every word of the question moves later by the document's length. Its meaning should not change. |
| n26 | 3:41.4 | Moving every word k places later turns each hand by its own fixed angle. That is a rotation, and it depends only on k, not on where you started. |
| n27 | 3:52.8 | Turn two hands by the same angle, and the angle between them stays put. |
| n28 | 3:57.8 | So the dot product of two position vectors, a score of how much two arrows point the same way, depends only on how far apart the words are. |
| n29 | 4:08.0 | Her slide 27 writes it as: P E of pos plus k equals R k times P E of pos. Rotate both, and the dot product is unchanged. |
| n30 | 4:20.2 | The proof is on her next slides, as self-study. |
| c9 | 4:24.0 | her clip C9 (L02, 1.8 s): "I feel it's pretty difficult." |
| n31 | 4:27.0 | The short version: the sine and cosine of a sum of angles mix into each other, exactly like a turning hand. |
| n32 | 4:35.1 | So, problem solved? Not quite. Remember, the position is added to the word. |
| n33 | 4:41.4 | Like two jars poured into one glass, the word and its clock reading become a single vector. |
| c10 | 4:48.3 | her clip C10 (L02, 3.9 s): "But how about the entire part? No, it's not." |
| n34 | 4:53.5 | Attention compares those mixed vectors. The position-with-position part keeps the distance, but the word-with-position parts change when both words move. |
| n35 | 5:04.1 | Her slide 31: How at position 1 with You at position 3 does not score the same as How at 2 with You at 4, even though the gap is the same. |
| n36 | 5:14.2 | The relative distance is only partly there. |
| n37 | 5:18.6 | Her rule of thumb: when you see an addition, ask whether a multiplication or a concatenation would do better. |
| n38 | 5:25.7 | Multiply instead, and you get RoPE, from Su and colleagues in 2021. It turns the query and the key themselves. That is the next episode. |
| n39 | 5:36.4 | Clock hands at many speeds give every word its place. Added to the word, they keep the distance only partly. Next time: turn, don't add. |

## Clips

| id | lecture | recording | dur | check |
| --- | --- | --- | --- | --- |
| C2 | L02 | 3128.59-3132.89 | 4.3 s | exact |
| C3 | L02 | 3311.75-3315.19 | 3.4 s | exact |
| C4 | L02 | 3341.19-3345.55 | 4.4 s | exact |
| C5 | L02 | 3464.19-3468.78 | 4.6 s | exact |
| C8 | L02 | 3796.56-3799.70 | 3.1 s | exact |
| C9 | L02 | 3859.03-3860.78 | 1.8 s | exact |
| C10 | L02 | 4055.84-4059.77 | 3.9 s | exact |

Narration 733 words in 40 lines (125 wpm over the runtime); her clips 25.5 s (7% of the runtime).

## Facts used
F1-F27 as cited in FACTS.md; on screen and in the voice: 2017, 2021, 2022, eight slots / four hands, 1, 0.1, 0.01, 0.001 radians per word, about 57 degrees, 0.841471 and 0.001000 (slide 26), -1 and 1, 512, 6.28, about 60,000, positions 1, 3, 2, 4 (slide 31).

## Narration notes (FACTS rows per line)

n0-n1 F1 · n2-n3 F1, F2 · n4-n5 F1 · n6 F3 · n7 F4 · n8 F5 (safe) · n9 F6 · n10 F8 · n11 F7, F9 · n12-n13 F9, F17 · n14-n17 F11, F13 · n18-n19 F11, F12 · n20 F10 · n21 F12 · n22 F14, F15 · n23-n25 F17, F21 · n26 F17 · n27-n28 F18 · n29 F17, F18 · n30-n31 F19, F20 · n32-n34 F22 · n35-n36 F22 · n37 F26 · n38 F25 · n39 F22, F25.

## Art

New (art.json): line_cat_chases_dog (P0, P15), line_dog_chases_cat (P15), line_word_bag (P2), line_clock_face (P5, P6 x4, P10, P14), line_paint_pour (P12). Reused: line_round_table (P1), line_long_ribbon (P8), line_same_question (P9), line_mic (mic tag). Code: lettering, pen, the clock hands (exact angles: position x speed), the word / position / input cells (P4), taped slides 24, 26 (crop: the table, positions 0-4), 27 and 31 (the third-party diagram under a blank taped sheet).
