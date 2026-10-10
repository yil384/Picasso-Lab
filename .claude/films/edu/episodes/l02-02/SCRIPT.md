# L02-02 "The Gate: From ReLU to SwiGLU" - script (synthesis)

CSE 291P (Prof. Yufei Ding, UC San Diego), Lecture 2 slides 13-21 and Lecture 3 slides 2-4 (worksheet 2). Runtime 7:11.3 (431.3 s), 1080x1920, 30 fps, English. Angle: the tap - the water is the content, the hand on the tap is the gate (draft A, judge winner, with grafts from draft B: the scorecard read row by row, the 1993 follow-up, the d_ff equation solved on screen, one worked value x = -1, Lecture 3 in the credits). Drafts and the judge: `drafts/`. Facts: `FACTS.md` (rows cited per line).

## Beats

| # | time | panel | voices |
| --- | --- | --- | --- |
| P0 | 0:00.0 | the cover: a hand on a kitchen tap, water into a glass (the gate); hook F41 | n0, n1, n2 |
| P1 | 0:19.2 | straight rulers on a wavy curve: stacked matrix multiplies stay one straight-line map; a bend = activation; Hornik (C12; F1-F4) | n3, n4, n5, c12, n6, n7, n8, n9 |
| P2 | 1:12.1 | the feed-forward layer as three number strips (h, 4h, h) and two matrices; FFN(x) = act(x W1) W2 (C17; F5, F7, F8) | n10, c17, n11, n12 |
| P3 | 1:45.4 | the tap, closer: the water is the content, the hand on the tap is the gate | n13 |
| P4 | 1:52.7 | ReLU as an ink plot: flat at zero, then the 45-degree line; -1 -> 0; slopes 1 and 0 (F9, F10, F11, F38) | n14, n15, n16 |
| P5 | 2:16.4 | a wilted plant beside an empty watering can: slope zero everywhere, it never learns (F13) | n18, n19 |
| P6 | 2:28.9 | switch vs dimmer: ReLU cuts hard; GELU = x Phi(x) fades (F14) | n20, n21, n22 |
| P7 | 2:51.9 | her slide 17, the GELU bullet (crop above its BERT line); below, our ReLU and GELU curves; -1 -> -0.16 (F15, F16, F17, F38) | n23, n24 |
| P8 | 3:11.3 | the sigmoid S-curve (slope at most 1/4), weak alone (C15); times x it is SiLU; -1 -> -0.27; in the 2016 GELU paper (F12, F18, F19) | n25, c15, n26, n27 |
| P9 | 3:39.2 | the card catalogue: a 2017 computer search through simple functions; Swish; beta = 1 is SiLU, already in the drawer (F20, F21, F36) | n28, n29 |
| P10 | 3:54.5 | one person pours the water (content), the other turns the valve (gate): GLU; SwiGLU = (SiLU(xW) x xV) W2 (C6; F22-F25) | n31, n32, n33, c6, n34, n35 |
| P11 | 4:42.8 | her slide 20, right column (her key line and table; the model list above it is cropped out): sigmoid(x2) struck, SiLU(x2) written; open models lettered (F24, F26, F27) | n36, n37 |
| P12 | 4:59.3 | her slide 21 scorecard: the pen walks the rows (F10, F11, F13, F15, F17, F18, F26) | n38, n39 |
| P13 | 5:21.1 | small gain 1.68 -> 1.64; the paper ends: no explanation, divine benevolence; then the lab: test it (C7, C8; F28, F29) | n40, n41, n42, c7, c8 |
| P14 | 5:54.4 | the balance: two matrices of h x 4h = 8h^2; a third at the same width makes 12h^2; 2 operations per weight (C20; F30, F32) | n43, n44, n45, c20 |
| P15 | 6:22.3 | her lecture 3 worksheet box: 3 h d_ff = 8h^2 -> d_ff = 2/3 x 4h, about 2.67h; latency -> compute; Llama 7B 16,384 -> 10,923 -> 11,008 (F31-F35) | n46, n47, n48 |
| P16 | 6:56.4 | bookend: the tap again; switch, dimmer, a second pair of hands; three matrices, two-thirds the width | n49, n50 |
| end | 7:07.3 | the logo end card; credits | - |

## Narration and clips, in order

| id | at | line |
| --- | --- | --- |
| n0 | 0:00.3 | Llama, Mistral and OLMo all run the same three-matrix trick. |
| n1 | 0:05.4 | And Llama and OLMo pay for it by shrinking that layer to about two-thirds. Why would anyone do that? |
| n2 | 0:12.3 | From Professor Yufei Ding's CSE 291P at UC San Diego: the gate. |
| n3 | 0:19.8 | A matrix multiply turns a list of numbers into a new list of weighted sums. |
| n4 | 0:25.6 | Layers like that are linear. Stack as many as you like: together they are still one matrix multiply. |
| n5 | 0:32.9 | One straight-line map, like straight rulers on a wavy curve. Her class demo: |
| c12 | 0:38.4 | her clip C12 (L02, 4.8 s): "Instead of having two layers, you can have three or five or six, it doesn't really converge at all." |
| n6 | 0:44.4 | So between them goes a bend: a non-linearity, also called an activation function. |
| n7 | 0:50.8 | In 1991, Kurt Hornik proved that one hidden layer, with a bounded non-linear activation and enough units, |
| n8 | 0:59.3 | can get as close as you like to any continuous function on a bounded region. A 1993 follow-up covered ReLU too. |
| n9 | 1:07.6 | It promises that such a network exists, not that training will find it. |
| n10 | 1:12.7 | Inside a transformer, the design behind these models, the activation sits in one place: the feed-forward layer. In her words: |
| c17 | 1:22.0 | her clip C17 (L02, 5.3 s): "The first layer is a matrix multiplication. Right. The other one is also a matrix multiplication." |
| n11 | 1:28.5 | In letters: FFN of x equals act of x W1, times W2. |
| n12 | 1:35.2 | Each token, a word or a piece of one, arrives as h numbers, the model width. The first matrix widens it to 4h, the hidden width. |
| n13 | 1:46.0 | Picture the activation as a kitchen tap. The water is the content. The hand on the tap is the gate. |
| n14 | 1:53.3 | The 2017 Transformer used ReLU: positive numbers pass as they are, negative numbers become zero. |
| n15 | 2:01.4 | Shut or fully open: a switch. Minus one goes in, zero comes out. |
| n16 | 2:07.5 | Training nudges each weight using slopes, called gradients. ReLU's slope is one for positives, zero for negatives. |
| n18 | 2:17.0 | But if a unit outputs zero for every input, its slope is zero everywhere. |
| n19 | 2:23.1 | No learning signal ever reaches it, so it never grows: a dead ReLU. |
| n20 | 2:29.5 | So, a dimmer instead of a switch. GELU multiplies x by Phi of x. |
| n21 | 2:35.9 | Phi of x is the chance a bell-curve sample falls below x: near one for big x, near zero for very negative x. |
| n22 | 2:44.9 | The water sets the tap by itself: a strong flow opens it, a negative trickle mostly shuts it. |
| n23 | 2:52.5 | Her slide 17, with our own curves. Minus one now comes out as minus 0.16: a trickle, so it still gets a gradient. |
| n24 | 3:02.8 | BERT and the first GPT used GELU. It costs more than ReLU, but beside the matrix multiplies it is small change. |
| n25 | 3:11.9 | A sigmoid squeezes any number into an S-curve between zero and one. Its slope never tops one quarter. |
| c15 | 3:19.6 | her clip C15 (L02, 2.1 s): "Sigmoid function itself is not good." |
| n26 | 3:22.8 | But as a hand on the tap, it works. x times sigmoid of x: SiLU, the Sigmoid Linear Unit. |
| n27 | 3:30.5 | Cheaper than GELU: minus one comes out as minus 0.27. And it was already in the 2016 GELU paper. |
| n28 | 3:39.8 | In 2017, a Google Brain team let a computer search through combinations of simple functions. |
| n29 | 3:47.6 | Swish came out on top: x times sigmoid of beta x. With beta at one, it is exactly SiLU. |
| n31 | 3:55.1 | So far, the water turns its own tap: the same x is both the water and the hand. |
| n32 | 4:01.8 | A gated linear unit gives the tap to a second person: two separate matrix multiplies of the same input. |
| n33 | 4:09.2 | One makes the water. A sigmoid of the other decides, number by number, how much of that water gets through. |
| c6 | 4:16.8 | her clip C6 (L02, 8.4 s): "Instead of using the value for the gate and the value for the value itself, they are using two parts. One is just for the gating and the other one is just for the value." |
| n34 | 4:26.4 | SwiGLU, Swish plus GLU, gives that hand a SiLU: SiLU of x W, times x V, then W2. |
| n35 | 4:36.2 | Three matrices: one makes the gate, one makes the content, one brings the result back down. |
| n36 | 4:43.4 | On her slide 20, the pen fixes one word: SwiGLU's gate is SiLU, as the figure on her own slide says. |
| n37 | 4:51.9 | Llama, Mistral and OLMo all use SwiGLU. Gemma uses a GELU-gated cousin, GeGLU. |
| n38 | 4:59.9 | Her slide 21 keeps score. Cheap forward? Cheap gradient? ReLU: yes, yes. GELU: no, no. SiLU: so-so. |
| n39 | 5:10.6 | Healthy gradients? Not ReLU. And her last row: today's winners run SiLU, mostly as SwiGLU, like Llama, Mistral and OLMo. |
| n40 | 5:21.7 | Better, but only a little: about 1.68 against 1.64 on the paper's score, lower is better. |
| n41 | 5:29.5 | And why does it work? The paper ends: |
| n42 | 5:32.8 | “We offer no explanation as to why these architectures seem to work; we attribute their success, as all else, to divine benevolence.” |
| c7 | 5:42.8 | her clip C7 (L02, 6.5 s): "A lot of research is experimental research. If you get better results, you can get good explanation." |
| c8 | 5:50.6 | her clip C8 (L02, 3.1 s): "No one will know which one is better until you test it." |
| n43 | 5:55.0 | Now the bill. Each matrix entry is a weight the model learns, a parameter. |
| n44 | 6:01.1 | A plain layer: two matrices of h by 4h, 8 h-squared weights. A third one at the same width makes 12 h-squared. |
| n45 | 6:10.6 | Each weight costs about two operations per token, a multiply and an add. More weights, more compute. |
| c20 | 6:17.9 | her clip C20 (L03, 3.6 s): "Instead of having four times, maybe we need to have a different dimension." |
| n46 | 6:22.9 | Three matrices of h by the new width hold 3 times h times that width. Set that equal to 8 h-squared. |
| n47 | 6:31.0 | The new width comes out at 8 thirds of h: two-thirds of 4h, about 2.67 h. Same weights, same compute. |
| n48 | 6:40.1 | In Llama's 7B model, 4h would be 16,384. Two-thirds is about 10,923; the code rounds up to 11,008. OLMo's 7B lands on the same 11,008. |
| n49 | 6:57.0 | Back to the puzzle: one matrix for the water, one for the hand, one for the way back. |
| n50 | 7:03.2 | A switch, then a dimmer, then a second pair of hands. |

## Clips

| id | lecture | recording | dur | check |
| --- | --- | --- | --- | --- |
| C12 | L02 | 1749.11-1753.93 | 4.8 s | exact |
| C17 | L02 | 1867.05-1872.37 | 5.3 s | exact |
| C15 | L02 | 2219.05-2221.15 | 2.1 s | near |
| C6 | L02 | 2409.79-2418.23 | 8.4 s | exact |
| C7 | L02 | 2495.37-2501.91 | 6.5 s | exact |
| C8 | L02 | 2532.47-2535.53 | 3.1 s | exact |
| C20 | L03 | 471.21-474.77 | 3.6 s | exact |

Narration 846 words in 49 lines (118 wpm over the runtime); her clips 33.8 s (8% of the runtime).

## Facts used
F1-F41 as cited in FACTS.md; the numbers on screen: 1991, 1993, 2016, 2017, 4h, -0.16, -0.27, 1/4, 1.68 / 1.64, 8h^2, 12h^2, 2 operations per weight, 2/3, 2.67h, 16,384 / 10,923 / 11,008.

## Art

New (art.json): line_tap_glass (P0, P3, P16), line_ruler_curve (P1), line_wilted_plant (P5), line_switch_dimmer (P6), line_tap_two_people (P10). Reused: line_card_catalog (P9), line_tiny_lab (P13), line_balance (P14), line_mic (mic tag). Code: lettering, pen, the ink plots of ReLU / GELU / sigmoid / SiLU (P4, P7, P8), the h / 4h / h strips (P2), taped slides 17, 20, 21 and Lecture 3 slide 4 (crops; slide 17 cropped above its last line, slide 20 below its model list).
