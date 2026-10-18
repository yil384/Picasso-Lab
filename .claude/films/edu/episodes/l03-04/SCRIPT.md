# L03-04 "The Residual Highway" - script

CSE 291P (Prof. Yufei Ding, UC San Diego), Lecture 3 "Transformer Model Architecture Variants (2)", slides 22-31 (recording 47:47-71:31).
Vertical 1080x1920, 30 fps, 454 s (7:34), English. 40 narration lines (951 words, a disclosed synthetic voice), 7 clips of her voice. 17 panels.
Written 2026-10-17 by the producer alone (the two drafting sessions were lost to session restarts; see report.md). Built with kit-lesson; data in episode.json, strings.json, timeline.json.

## Beats

| Panel | Starts | On screen | Voice |
| --- | --- | --- | --- |
| p0 | 0:00 | cover: four lanes with crossovers; hook (F20, F25) | n0 n0b |
| p1 | 0:10 | the residual stream as an express road; blocks as towns on ramps; layer 100 to layer 1 (F1-F4) | n1 n2 n3 c4 n4 |
| p2 | 0:58 | without the shortcut: a whisper down a line (F1) | n5 |
| p3 | 1:08 | normalization; BatchNorm across the batch vs LayerNorm one token (F6, F7) | n6 n7 n8 c1 |
| p4 | 1:40 | her slide 23, title and bullets only (two third-party pictures cropped out); experiments (F7, F8) | n9 c2 |
| p5 | 1:57 | her slide 24 left column: LayerNorm vs RMSNorm formulas (the model lists with the PaLM erratum cropped out) (F9-F11) | n10 n11 |
| p6 | 2:18 | Post-LN: a toll gate across the road; warm-up (F5, F14) | n12 n13 n14 |
| p7 | 2:47 | Pre-LN: the gate on the ramp, the road untouched (F13, F15) | n15 |
| p8 | 2:57 | her slide 25, right half (the paper figure cropped out): only earlier models such as BERT used Post-LN (F13, F15, F16) | n16 n17 |
| p9 | 3:23 | Peri-LN: gates in and out of the ramp (F17-F19); her joke C8 | n18 n19 c8 n20 |
| p10 | 4:00 | hyper-connections: four lanes, learned crossovers (F20); her C9, C14 | n21 c9 n22 c14 n23 |
| p11 | 4:43 | her toy gradient boxes from slides 28 and 29 (the paper figure and plot cropped out); 1.8 times in tokens (F21, F22) | n24 n25 n26 |
| p12 | 5:14 | weights multiply: 1.1 and 0.9 a hundred times; HC gain about 3000 (F23, F24) | n27 n28 |
| p13 | 5:39 | mHC: doubly stochastic mixing as jugs and pots (F25, F28) | n29 n30 |
| p14 | 6:04 | her slide 30 matrices (the mislabelled plot cropped out): product still doubly stochastic; gain 1.6; 6.7%; 27B; n = 1 (F26-F33) | n31 c13 n32 n33 |
| p15 | 6:43 | her slide 31 analogy: attention = a meeting; hyper-connections = one person's four clones (F31) | n34 n35 |
| p16 | 7:03 | honest limit and takeaway (F22, F13, F25) | n36 n37 n38 |

## Narration and clips (in order; FACTS rows each line uses)

- **n0** (0.4 s): Every block of a language model has one express lane running past it. What if you built four?  _[F20]_
- **n0b** (7.4 s): And how would you keep four lanes from blowing up?  _[F23-F24]_
- **n1** (11.6 s): Start with one lane. A transformer is a tall stack of blocks: attention, then a feed-forward layer, again and again, dozens of times.  _[-]_
- **n2** (21.6 s): Each block doesn't replace its input. It adds a change on top: x plus F of x. The plain x is an express road. The block is a town you exit into, and its result merges back onto the road.  _[F1]_
- **n3** (35.9 s): Why does that matter? Training sends a correction signal, the gradient, backwards from the last layer to the first. Her example:  _[F2]_
- **c4** (44.9 s), her clip: "layer 100 still can give its gradient to layer 1."  _[REC; check.json: exact]_
- **n4** (49.2 s): The express road has no gates, so the gradient rides straight down it. ResNet made this shortcut the standard, about ten years ago.  _[F1, F3, F4]_
- **n5** (59.1 s): Without it, the signal would pass through every block in turn, like a message whispered down a long line of people. By the end, it is mush.  _[F1]_
- **n6** (68.9 s): The second thing a deep stack needs is normalization: shift and scale a group of numbers, so they average zero, with a standard spread. But which group?  _[F6]_
- **n7** (79.5 s): BatchNorm, from image models, measures each feature across a whole batch of examples. Like a tailor measuring the waist of everyone in a row.  _[F6]_
- **n8** (89.8 s): LayerNorm measures one example at a time: all the numbers of one token, head to toe.  _[F6]_
- **c1** (96.8 s), her clip: "You can have a short sentence or you have a longer sentence."  _[REC; check.json: exact]_
- **n9** (101.4 s): Sentences come short and long, so batch averages wobble. LayerNorm needs no batch at all. And her slide is honest about the real reason: experiments show it works better.  _[F7, F8]_
- **c2** (113.5 s), her clip: "we can think about it as experimental computer science."  _[REC; check.json: exact]_
- **n10** (118.4 s): Modern models trim it further. RMSNorm skips subtracting the average, and has no bias. It only rescales.  _[F9]_
- **n11** (127.4 s): In its 2019 paper, it matched LayerNorm's quality, with 7 to 64 percent less running time, depending on the model. The Llama family uses it.  _[F10, F11]_
- **n12** (139.6 s): Now the real question. Where on the highway do you put the toll gate?  _[-]_
- **n13** (144.5 s): The 2017 Transformer added first, then normalized. That puts a gate right across the express road. This is called Post-LN.  _[F5]_
- **n14** (154.8 s): Every gradient has to squeeze through every gate. In 2020, Xiong and colleagues showed that Post-LN starts training with large gradients near the output, so it needs a slow warm-up.  _[F14]_
- **n15** (168.2 s): Pre-LN moves the gate onto the exit ramp. Only the copy going into the block is normalized. The road itself stays untouched.  _[F13]_
- **n16** (178.2 s): Pre-LN can train without warm-up and reach comparable results. BERT kept the original Post-LN. GPT-2 moved the norm to the input. Her slide's verdict: only earlier models, like BERT, used Post-LN.  _[F15, F16]_
- **n17** (195.0 s): Her point is that the names mislead. What matters is not before or after. It is whether a gate sits on the express road.  _[F13]_
- **n18** (204.5 s): One more idea: normalize what goes into the block, and also what comes out, before it merges back. Two gates, both on the ramp. The road stays clean.  _[F17]_
- **n19** (215.1 s): This is Peri-LN. Gemma 2 and Gemma 3 do exactly this. OLMo 2 uses a close cousin. Models shipped it in 2024, and a paper studied it in 2025.  _[F18, F19]_
- **c8** (228.3 s), her clip: "Not very challenging, right? And it seems pretty easy to write a paper."  _[REC; check.json: exact]_
- **n20** (233.7 s): A norm is cheap next to the big matrix multiplications, so an extra gate costs little.  _[F17 (her words, 54:46)]_
- **n21** (241.0 s): So far, one road. The residual shortcut itself had barely changed in ten years. Then she asks:  _[F3]_
- **c9** (248.5 s), her clip: "is this the only way you can design the shortcut? Is there another way for us to make the shortcut a little broader?"  _[REC; check.json: exact]_
- **n22** (258.2 s): Hyper-connections, from Zhu and colleagues in 2025, copy the stream into several lanes, here four. Each block reads a learned mix of the lanes, and writes back into all of them.  _[F20]_
- **c14** (270.9 s), her clip: "I make each token like several copies"  _[REC; check.json: exact]_
- **n23** (275.4 s): The block itself still runs once, so the expensive part costs the same. Only the cheap merging gets richer.  _[F20 (her words, 59:17)]_
- **n24** (283.7 s): But now the crossovers have weights. Her toy example: if y is x1 plus x2, each input gets the full gradient back.  _[F21]_
- **n25** (293.1 s): If y is 0.2 x1 plus 0.8 x2, the gradients come back scaled, by 0.2 and by 0.8. So the weights decide how much signal gets through.  _[F21]_
- **n26** (304.7 s): Learned, they worked. In the paper's big test, the model reached the baseline's loss 1.8 times faster, counted in training tokens.  _[F22]_
- **n27** (314.9 s): Here is the catch. Those weights multiply, layer after layer. A weight of 1.1, a hundred times over, is about 13,800. A weight of 0.9, a hundred times over, is about 3 in 100,000.  _[F23]_
- **n28** (331.0 s): A snowball, or a whisper. When DeepSeek measured plain hyper-connections, the signal gain through the stack hit about 3,000.  _[F24]_
- **n29** (340.6 s): Their fix is called mHC, from Xie and colleagues. It puts one rule on the mixing. Picture four jugs pouring into four pots.  _[F28, F30]_
- **n30** (350.2 s): Every jug pours out exactly what it holds: each column sums to 1. Every pot ends up with exactly one jug's worth: each row sums to 1. Nothing negative. That is a doubly stochastic matrix.  _[F25]_
- **n31** (365.2 s): And here is the trick. Multiply two of them, and you get another one. Her slide checks it with real numbers.  _[F26, F33]_
- **c13** (373.1 s), her clip: "So each row and each column are still adding up to one."  _[REC; check.json: exact]_
- **n32** (378.1 s): So stack a hundred layers, and the total mix still obeys the rule. It can never stretch the signal. With mHC, the gain stays near 1.6.  _[F26, F27, F24]_
- **n33** (388.9 s): With one lane, the rule leaves just the number 1: the plain shortcut, back again. The price is about 6.7 percent more training time, with four lanes. Their main test model has 27B parameters.  _[F32, F29, F28]_
- **n34** (404.2 s): Her slide has the best picture of all this. Attention is a person in a meeting, listening to others, learning whose words matter more.  _[F31]_
- **n35** (413.7 s): Hyper-connections are one person with four clones, talking among themselves. Same token, a richer picture of itself, deeper in the network.  _[F31]_
- **n36** (424.1 s): One honest limit: the 1.8 times is counted in training tokens, on one model. Clock time is another question.  _[F22]_
- **n37** (433.1 s): So: deep models train because every block adds onto a clean road, and the gates stay off it. Now the road can have lanes, as long as every mix keeps its rows and columns at 1.  _[F13, F25]_
- **n38** (446.1 s): Next time: the knobs we set before training.  _[-]_

## Clips

| Id | Recording | Length | Check | Text |
| --- | --- | --- | --- | --- |
| C4 | L03 52:38.54-52:41.64 | 3.1 s | exact | "layer 100 still can give its gradient to layer 1." |
| C1 | L03 48:47.66-48:50.50 | 2.8 s | exact | "You can have a short sentence or you have a longer sentence." |
| C2 | L03 49:13.27-49:16.47 | 3.2 s | exact | "we can think about it as experimental computer science." |
| C8 | L03 55:24.39-55:28.59 | 4.2 s | exact | "Not very challenging, right? And it seems pretty easy to write a paper." |
| C9 | L03 56:08.84-56:17.20 | 8.4 s | exact | "is this the only way you can design the shortcut? Is there another way for us to make the shortcut a little broader?" |
| C14 | L03 70:01.41-70:04.70 | 3.3 s | exact | "I make each token like several copies" |
| C13 | L03 66:48.33-66:52.17 | 3.8 s | exact | "So each row and each column are still adding up to one." |

Candidates dropped: C3 (physics joke, differ), C5 (residual stream "clear", differ / asr-agree with a stray word), C10, C11 (differ), C6, C12 (exact, cut for length).

## Drawings

All from the pre-drawn library (no new drawings tonight; the planned cover drawing line_cover_l03_04 was never made, so the cover uses line_res_four_lanes):
line_res_four_lanes, line_res_bypass_road, line_res_tailor_split, line_res_gate_on_road, line_res_gate_on_ramp, line_res_gate_both_ends, line_res_four_clones, line_res_jugs_glasses, line_res_snowball; reused line_whisper_line, line_round_table, line_knob_board, line_mic.

## Her slides on screen

23 (title + italic line only; the two blog pictures cropped out), 24 (left column: formulas; the model lists with the PaLM erratum cropped out), 25 (right half: formulas and bullets; the paper figure cropped out), 28 and 29 (the toy gradient boxes only), 30 (the three matrices and the row/column sums; the mislabelled 28B plot cropped out). Slide 31 is narrated and drawn, not taped.
