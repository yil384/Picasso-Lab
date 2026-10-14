# L02-04 "RoPE: Position as a Rotation" - script (synthesis)

CSE 291P (Prof. Yufei Ding, UC San Diego), Lecture 2 slides 32-36 (recording 71:57-77:37) and Lecture 4 slide 2 (recap). Runtime 5:49.6 (349.6 s), 1080x1920, 30 fps, English. Angle: position as clocks - each pair of numbers in the query and the key is an arrow on a dial turned by the word's place; to read further, slow the clocks. Written by the producer directly (no separate drafts: the first night's rounds were cut at about 40 min). Facts: `FACTS.md` (rows cited per panel in the beats table).

## Beats

| # | time | panel | voices |
| --- | --- | --- | --- |
| P0 | 0:00.0 | cover: a student reads an endless scroll under a clock; title; 4,000 vs 128,000 (F9, F14) | n0, n1 |
| P1 | 0:19.1 | attention alone sees no order: the cat chased the dog / the dog chased the cat | n2 |
| P2 | 0:34.5 | her slide 32 taped: sine 2017, learned absolute, relative, RoPE 2021-now (F1-F4) | n3, n4 |
| P3 | 1:04.4 | two jars poured into one glass: the word and its position mixed for good; cross terms (c31; F7) | n5, c31, n6 |
| P4 | 1:25.8 | RoPE does not add, it turns: a pair of numbers = an arrow; one step per position (c27; F5) | n7, n8, c27 |
| P5 | 1:45.8 | her slide 33 taped; its figure covered by a blank sheet; our arrows: "we know that" vs "of course we know"; same angle (F6, F18, c24) | n9, n10, n11, c24 |
| P6 | 2:14.3 | three clocks: positions 0-1, 2-3, 100-101 turned by m and n steps; the same score 0.513 (F19) | n12 |
| P7 | 2:31.7 | her slide 35 lettered (not taped): a block-diagonal matrix, one 2x2 turn per pair, zeros elsewhere; it multiplies q and k (F5, F7) | n13 |
| P8 | 2:46.0 | a whisper line: a position added once at the bottom gets lost up the stack; LLaMA turns q and k in every layer (c22, c12; F8) | n14, c22, n15, c12 |
| P9 | 3:16.5 | two clocks of the 64 in a Llama 2 7B head: the fastest (about 57 degrees a token) and the slowest (one turn per about 54,000 tokens) (F10) | n16, n17 |
| P10 | 3:40.6 | the slowest clock: about 27 degrees seen in training (4,096 tokens); at 128,000 more than two turns (c29; F11) | n18, c29, n19 |
| P11 | 4:02.3 | Position Interpolation: squeeze the positions so the long text fits the known angles; 2,048 to 32,768 (F12) | n20, n21 |
| P12 | 4:36.2 | NTK-aware scaling: fast gears left alone, the big slow gear braked most; no fine-tuning (F13) | n22 |
| P13 | 4:52.1 | her slide 36 taped; box on the YaRN row; ring on the last column (a rough range) (c28; F14, F15, F20) | n23, n24, c28 |
| P14 | 5:17.8 | reading is not using: a student checks only the two ends of a long scroll; RULER 2024 (F16) | n25 |
| P15 | 5:34.4 | bookend: the reader under the clock; the hand turns slowly; turn, do not add | n26 |
| end | 5:45.6 | the logo end card; credits | - |

## Narration and clips, in order

| id | at | line |
| --- | --- | --- |
| n0 | 0:00.3 | Trained on 4,000 tokens. Reads 128,000. How? |
| n1 | 0:06.2 | Slow down its clocks. Llama 2 learned to read on texts of up to about 4,000 tokens, the word pieces a model reads. Fine-tuned with a trick called YaRN, it reads 128,000. |
| n2 | 0:19.7 | Attention compares every word with every other word, but on its own it can't see order. The cat chased the dog; the dog chased the cat: same words, same bag. So every model has to tell attention where each word sits. |
| n3 | 0:35.1 | Her slide shows how the answers changed. The 2017 Transformer added a pattern of sines and cosines to each word. GPT-2 and GPT-3 learned one position vector per slot, and added that. T5 added a learned nudge inside attention, by distance. |
| n4 | 0:55.8 | Then, from a 2021 paper by Su and colleagues: rotary position embedding, RoPE. LLaMA and Llama 2 use it. |
| n5 | 1:05.0 | Notice what the first three have in common. They add. |
| c31 | 1:08.9 | her clip C31 (L04, 3.6 s): "But when you add another thing, then it doesn't really work." |
| n6 | 1:13.6 | Pour the position into the word, and the two are mixed for good. When attention multiplies two mixed vectors, word-times-position cross terms appear, and the clean sense of distance gets blurred. |
| n7 | 1:26.4 | RoPE doesn't add. It turns. |
| n8 | 1:29.4 | Cut the query and the key into pairs of numbers. Each pair is an arrow on a dial. A word at position one turns its arrow one step, position two, two steps, and so on. |
| c27 | 1:42.0 | her clip C27 (L02, 3.0 s): "So each of these two were rotated by an angle." |
| n9 | 1:46.4 | Here is her example. In "we know that", "we" is at position zero and "know" at one. So "we" turns zero steps, and "know" turns one. |
| n10 | 1:56.5 | Now "of course we know". "We" is at two, "know" at three. Both arrows turn further, but by the same extra amount. The angle between them stays the same. |
| n11 | 2:06.7 | That is the property she wants. |
| c24 | 2:09.2 | her clip C24 (L02, 4.2 s): "We want the whole embedding to be rotational invariant." |
| n12 | 2:14.9 | Attention scores two arrows by how well they line up, and that depends only on the angle between them. Same two words, one step apart: the same score at 0 and 1, at 2 and 3, or at 100 and 101. Only the words and their distance count. |
| n13 | 2:32.2 | On her next slide, this is one big matrix: a sine-and-cosine turn for each pair, zeros everywhere else. It multiplies the query and the key. Nothing is added, so there are no cross terms. |
| n14 | 2:46.6 | One more change. The 2017 model added its position once, at the bottom of a deep stack. Pass it up through many layers, and, as she puts it, |
| c22 | 2:57.5 | her clip C22 (L04, 2.6 s): "this kind of positional information will get lost." |
| n15 | 3:01.5 | So LLaMA applies RoPE inside every attention layer, to the queries and the keys. The values are not turned. |
| c12 | 3:09.6 | her clip C12 (L04, 5.9 s): "And so indeed, this kind of positional encoding is applied per layer per head." |
| n16 | 3:17.1 | Not every pair turns at the same speed. In Llama 2's smallest model, each head holds 128 numbers: 64 pairs, 64 clocks. |
| n17 | 3:28.4 | The fastest turns about 57 degrees per token: it tells neighbours apart. The slowest needs about 54,000 tokens for a single turn: it tells near from far. |
| n18 | 3:41.2 | Now the problem. Trained on 4,096 tokens, the slowest clock never turned more than about 27 degrees. Feed it 128,000 tokens, and it spins more than twice around: angles the model has never seen. |
| c29 | 3:56.8 | her clip C29 (L02, 1.2 s): "You identify the problem." |
| n19 | 3:59.1 | Then the fix is plain: slow the clocks down. |
| n20 | 4:02.9 | Position Interpolation, from Chen and colleagues in 2023, squeezes the positions. Every clock runs slower by the same factor, so a long text fits inside the angles the model knows. From 4,096 to about 128,000, that is a squeeze of 32. |
| n21 | 4:22.1 | They stretched LLaMA from 2,048 to 32,768 tokens within 1,000 fine-tuning steps. The catch: the fast clocks get squeezed too, and neighbours start to look alike. |
| n22 | 4:36.8 | A 2023 community post, NTK-aware scaling, split the job. Leave the fast clocks almost alone, so neighbours still look like neighbours, and slow the slow clocks the most. It works even without fine-tuning. |
| n23 | 4:52.7 | YaRN, by Peng and colleagues, refines that split and adds a temperature to the attention scores. It needs about 10 times fewer training tokens than earlier methods, and it took Llama 2 to 128,000. |
| n24 | 5:06.7 | Her table's last column runs up to a million and more: a rough community range, not a measured limit. |
| c28 | 5:14.1 | her clip C28 (L02, 2.8 s): "So it's kind of a lot of tricks to do it." |
| n25 | 5:18.4 | One honest limit. Reading a long text is not the same as using it. A 2024 test of 17 long-context models found only about half still did well at 32,000 tokens, though all of them claimed 32,000 or more. |
| n26 | 5:34.9 | So: position as a rotation. Turn the query and the key by their place, and the angle between them carries the distance. To read further, slow the clocks. |

## Clips

| id | lecture | recording | dur | check |
| --- | --- | --- | --- | --- |
| C31 | L04 | 320.70-324.26 | 3.6 s | exact |
| C27 | L02 | 4471.35-4474.31 | 3.0 s | exact |
| C24 | L02 | 4414.73-4418.94 | 4.2 s | exact |
| C22 | L04 | 290.95-293.60 | 2.6 s | near |
| C12 | L04 | 256.51-262.37 | 5.9 s | near |
| C29 | L02 | 4540.52-4541.70 | 1.2 s | exact |
| C28 | L02 | 4645.51-4648.29 | 2.8 s | exact |

Narration 723 words in 27 lines (124 wpm over the runtime); her clips 23.2 s (7% of the runtime).

## Facts used
F1-F20 as cited in FACTS.md; the numbers on screen and in the voice: 2017, 2021, 2023, 2024, 4,000 / 4,096, 128,000, 2,048, 32,768, 32 (the squeeze), 1,000 steps, 10x, 128 numbers = 64 pairs, 57 degrees, 54,000 tokens, 27 degrees, 0.513, 17 models, 32,000.

## Art

New (art.json): line_scroll_reader (P0, P15), line_squeeze_strip (P11), line_clockwork (P12), line_scroll_ends (P14). Reused: line_cat_chases_dog, line_dog_chases_cat (P1), line_paint_pour (P3), line_clock_face (P4, P10), line_whisper_line (P8), line_mic (mic tag). Code: lettering, pen, dial needles (kit item `dial`, added for this episode), the 0.513 clocks (P6), the block matrix (P7), taped slides 32, 33 (figure covered by a blank sheet) and 36.
